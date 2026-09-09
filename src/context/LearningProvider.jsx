import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWords } from './WordProvider';
import { evaluateItem } from '../learning/evaluators';
import { deriveMastery } from '../learning/mastery';
import { deriveReviewProgress, selectDueReviews } from '../learning/reviewScheduler';
import { edmontonDayKey } from '../learning/r1Core';
import { flushOutbox, queueAttempt } from '../persistence/indexedDb';
import { planOutboxWrites } from '../persistence/outboxSync';
import { mergeAttempts } from '../persistence/sync';
import { buildImportPreview, canAutoPush, importDecisionRecord } from '../learning/importPreview';
import { deriveWordRows, planProgressWrites } from '../learning/progressAggregate';
import { progressStorageKey, readJson, writeJson } from '../utils/localStore';
import { collection, doc, getDoc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import skillsData from '../data/skills.json';
import pilotApprovalData from '../data/pilotApproval.c0.json';
import { EVIDENCE_TRACKS, approvedPilotScopeIds } from '../learning/pilotApproval';

const LearningContext = createContext(null);

function attemptsKey(learnerId) {
  return `spelling-learning-attempts:${learnerId}`;
}

function importDecisionKey(uid, learnerId) {
  return `spelling-import-decision:${uid}:${learnerId}`;
}

async function loadRemoteAttempts(uid, learnerId) {
  const snapshot = await getDocs(query(collection(db, 'spelling-attempts'), where('userId', '==', uid), where('learnerId', '==', learnerId)));
  return snapshot.docs.map((entry) => entry.data());
}

async function loadRemoteProgress(uid, learnerId) {
  const snapshot = await getDocs(query(collection(db, 'spelling-progress'), where('userId', '==', uid), where('profileId', '==', learnerId)));
  return Object.fromEntries(snapshot.docs.map((entry) => [entry.data().wordId, entry.data()]));
}

export function LearningProvider({ children }) {
  const { activeProfileId, user, profiles, importLegacyProgress } = useWords();
  const [heldImports, setHeldImports] = useState({});
  const [attempts, setAttempts] = useState(() => readJson(attemptsKey(activeProfileId), []));
  const [saveStatus, setSaveStatus] = useState('saved');
  const activeLearnerRef = useRef(activeProfileId);
  activeLearnerRef.current = activeProfileId;

  useEffect(() => {
    setAttempts(readJson(attemptsKey(activeProfileId), []));
    setSaveStatus('saved');
  }, [activeProfileId]);

  // Recomputes the word-total cache for the named words from the account's immutable attempts.
  // Nothing is written for a word whose derived total would be lower than the stored one.
  const reconcileWordProgress = useCallback(async (account, learnerId, wordIds) => {
    if (!account || !wordIds?.length) return { written: 0, heldBack: [] };
    try {
      const attemptSnapshot = await getDocs(query(
        collection(db, 'spelling-attempts'),
        where('userId', '==', account.uid),
        where('learnerId', '==', learnerId),
      ));
      const attempts = attemptSnapshot.docs.map((entry) => entry.data());
      // Each row is read and rewritten inside its own transaction, so a total another device wrote
      // between our read and our write is seen rather than overwritten. The derivation is a pure
      // function of the row and the attempts, so a retried transaction produces the same document.
      const heldBack = [];
      let written = 0;
      for (const wordId of wordIds) {
        const outcome = await runTransaction(db, async (transaction) => {
          const ref = doc(db, 'spelling-progress', `${account.uid}_${learnerId}_${wordId}`);
          const snapshot = await transaction.get(ref);
          const existingRows = snapshot.exists() ? { [wordId]: snapshot.data() } : {};
          const { rows, heldBack: blocked } = deriveWordRows({ existingRows, attempts, wordIds: [wordId] });
          if (blocked.length) return 'held';
          for (const write of planProgressWrites(account.uid, learnerId, rows)) {
            transaction.set(doc(db, write.collection, write.id), write.data, { merge: true });
          }
          return 'written';
        });
        if (outcome === 'held') heldBack.push(wordId); else written += 1;
      }
      if (heldBack.length) console.warn('Word totals held back to avoid lowering a shared count:', heldBack);
      return { written, heldBack };
    } catch (error) {
      console.warn('Word total reconciliation deferred:', error);
      return { written: 0, heldBack: wordIds };
    }
  }, []);

  // push: 'auto' respects the parent import decision (master plan §9: an existing account never
  // silently merges local history); 'force' is used after an explicit import decision.
  const syncCloud = useCallback(async (account = user, learnerId = activeProfileId, { push = 'auto' } = {}) => {
    if (!account) return false;
    if (activeLearnerRef.current === learnerId) setSaveStatus('syncing');
    try {
      let remote = await loadRemoteAttempts(account.uid, learnerId);
      let allowPush = push === 'force';
      if (!allowPush) {
        const decision = readJson(importDecisionKey(account.uid, learnerId));
        allowPush = canAutoPush({ isAnonymous: account.isAnonymous, remoteAttemptCount: remote.length, remoteWordCount: decision ? 0 : Object.keys(await loadRemoteProgress(account.uid, learnerId)).length, importDecision: decision });
      }
      const local = readJson(attemptsKey(learnerId), []);
      const remoteIds = new Set(remote.map(({ attemptId }) => attemptId));
      const held = local.filter(({ attemptId }) => !remoteIds.has(attemptId)).length;
      setHeldImports((current) => ({ ...current, [learnerId]: allowPush ? 0 : held }));
      if (!allowPush) {
        const merged = mergeAttempts(local, remote);
        writeJson(attemptsKey(learnerId), merged);
        if (activeLearnerRef.current === learnerId) {
          setAttempts(merged);
          setSaveStatus(held ? 'saved-locally' : 'saved');
        }
        return false;
      }
      const wordsToReconcile = new Map();
      // Only this learner's queued answers are sent. Another learner may have declined the import,
      // and their answers must stay on the device until their own sync is allowed to push.
      await flushOutbox(async (entry) => {
        const writes = planOutboxWrites(entry, { uid: account.uid });
        for (const write of writes) {
          if (write.mode === 'reconcile-progress') {
            const pending = wordsToReconcile.get(write.learnerId) || new Set();
            pending.add(write.wordId);
            wordsToReconcile.set(write.learnerId, pending);
            continue;
          }
          const target = doc(db, write.collection, write.id);
          if (write.mode === 'create-if-missing') {
            const existing = await getDoc(target);
            if (!existing.exists()) await setDoc(target, write.data);
          } else {
            await setDoc(target, write.data, { merge: true });
          }
        }
      }, { accept: (entry) => entry.payload?.learnerId === learnerId });
      for (const [reconcileLearner, wordIds] of wordsToReconcile) {
        await reconcileWordProgress(account, reconcileLearner, [...wordIds]);
      }
      remote = await loadRemoteAttempts(account.uid, learnerId);
      const merged = mergeAttempts(readJson(attemptsKey(learnerId), []), remote);
      writeJson(attemptsKey(learnerId), merged);
      if (activeLearnerRef.current === learnerId) {
        setAttempts(merged);
        setSaveStatus('saved');
      }
      return true;
    } catch (error) {
      console.warn('Learning attempt sync deferred:', error);
      if (activeLearnerRef.current === learnerId) setSaveStatus('saved-locally');
      return false;
    }
  }, [activeProfileId, reconcileWordProgress, user]);

  useEffect(() => { if (user) syncCloud(user, activeProfileId); }, [user, activeProfileId, syncCloud]);

  // Reconnecting or returning to the tab flushes the outbox; without this, offline answers waited
  // for the next submit or a reload before reconciling.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return undefined;
    const retry = () => { if (document.visibilityState !== 'hidden') syncCloud(user, activeLearnerRef.current); };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, [user, syncCloud]);

  const submitAttempt = useCallback(async (item, response, metadata = {}) => {
    const learnerId = activeProfileId;
    const evaluation = evaluateItem(item, response);
    const priorAttempts = readJson(attemptsKey(learnerId), []);
    const ordinal = metadata.ordinal ?? (priorAttempts.filter((entry) => entry.sessionId === metadata.sessionId && entry.itemId === item.id && !entry.technicalFailure).length + 1);
    const attempt = Object.freeze({
      attemptId: metadata.attemptId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      learnerId,
      sessionId: metadata.sessionId,
      itemId: item.id,
      itemVersion: item.version,
      skillIds: [item.primarySkill, ...(item.secondarySkills || [])],
      originalAnswer: response,
      status: metadata.technicalFailure ? 'technical_failure' : metadata.omitted ? 'omitted' : evaluation.status,
      correct: metadata.omitted ? false : evaluation.correct,
      omitted: Boolean(metadata.omitted),
      technicalFailure: Boolean(metadata.technicalFailure),
      helped: Boolean(metadata.helped),
      revealed: Boolean(metadata.revealed),
      unseen: Boolean(metadata.unseen),
      ordinal,
      evidenceType: metadata.evidenceType || 'independent_choice',
      eventTime: new Date().toISOString(),
      edmontonDate: edmontonDayKey(),
      reviewStatus: item.reviewStatus,
      contentStatus: item.releaseStatus || 'not_released',
    });
    if (activeLearnerRef.current === learnerId) {
      setAttempts((current) => {
        if (current.some(({ attemptId }) => attemptId === attempt.attemptId)) return current;
        const next = [...current, attempt];
        writeJson(attemptsKey(learnerId), next);
        return next;
      });
      setSaveStatus('saving');
    } else {
      const stored = readJson(attemptsKey(learnerId), []);
      if (!stored.some(({ attemptId }) => attemptId === attempt.attemptId)) writeJson(attemptsKey(learnerId), [...stored, attempt]);
    }
    try {
      await queueAttempt(attempt);
      if (user) await syncCloud(user, learnerId);
      else if (activeLearnerRef.current === learnerId) setSaveStatus('saved');
    } catch {
      if (activeLearnerRef.current === learnerId) setSaveStatus('saved-locally');
    }
    return { attempt, evaluation };
  }, [activeProfileId, user, syncCloud]);

  // Builds the parent-facing preview for every learner profile without writing anything.
  const previewImport = useCallback(async (account = user) => {
    if (!account) return null;
    const learners = await Promise.all(profiles.map(async ({ id }) => ({
      learnerId: id,
      localAttempts: readJson(attemptsKey(id), []),
      remoteAttempts: await loadRemoteAttempts(account.uid, id),
      localProgress: readJson(progressStorageKey(id), {}),
      remoteProgress: await loadRemoteProgress(account.uid, id),
    })));
    return buildImportPreview(learners);
  }, [profiles, user]);

  const recordImportDecision = useCallback(async (account, learnerPreview, decision) => {
    const record = importDecisionRecord(decision, learnerPreview);
    writeJson(importDecisionKey(account.uid, learnerPreview.learnerId), record);
    try {
      await setDoc(doc(db, 'spelling-users', account.uid), { imports: { [learnerPreview.learnerId]: record } }, { merge: true });
    } catch (error) {
      console.warn('Import decision saved on this device only:', error);
    }
    return record;
  }, []);

  const confirmImport = useCallback(async (account, preview) => {
    if (!account || !preview) return false;
    for (const learnerPreview of preview.learners) {
      await recordImportDecision(account, learnerPreview, 'imported');
      if (learnerPreview.newWordIds.length) await importLegacyProgress(learnerPreview.learnerId, learnerPreview.newWordIds, account);
      await syncCloud(account, learnerPreview.learnerId, { push: 'force' });
    }
    return true;
  }, [importLegacyProgress, recordImportDecision, syncCloud]);

  const skipImport = useCallback(async (account, preview) => {
    if (!account || !preview) return false;
    for (const learnerPreview of preview.learners) {
      await recordImportDecision(account, learnerPreview, 'skipped');
      setHeldImports((current) => ({ ...current, [learnerPreview.learnerId]: learnerPreview.counts.newAttempts + learnerPreview.counts.newWords }));
    }
    return true;
  }, [recordImportDecision]);

  // Two separate evidence records. The released record is the only one that represents validated
  // progress; the pilot record lets approved content run the full loop during a private pilot
  // without being presented as validated.
  const masteryBySkill = useMemo(() => Object.fromEntries(skillsData.skills.map((skill) => [
    skill.id,
    deriveMastery(attempts.filter((attempt) => attempt.skillIds.includes(skill.id)), { track: EVIDENCE_TRACKS.RELEASED }),
  ])), [attempts]);
  const pilotMasteryBySkill = useMemo(() => Object.fromEntries(skillsData.skills.map((skill) => [
    skill.id,
    deriveMastery(attempts.filter((attempt) => attempt.skillIds.includes(skill.id)), { track: EVIDENCE_TRACKS.PILOT }),
  ])), [attempts]);
  const reviewProgress = useMemo(() => deriveReviewProgress(attempts), [attempts]);
  const dueReviews = useMemo(() => selectDueReviews(reviewProgress), [reviewProgress]);
  const pilotReviewProgress = useMemo(() => deriveReviewProgress(attempts, { track: EVIDENCE_TRACKS.PILOT }), [attempts]);
  const pilotDueReviews = useMemo(() => selectDueReviews(pilotReviewProgress), [pilotReviewProgress]);
  const pilotScopeIds = useMemo(() => approvedPilotScopeIds(pilotApprovalData.approvals), []);

  const value = useMemo(() => ({ attempts, submitAttempt, syncCloud, reconcileWordProgress, previewImport, confirmImport, skipImport, heldImports, masteryBySkill, pilotMasteryBySkill, reviewProgress, dueReviews, pilotReviewProgress, pilotDueReviews, pilotScopeIds, saveStatus, skills: skillsData.skills }), [attempts, submitAttempt, syncCloud, reconcileWordProgress, previewImport, confirmImport, skipImport, heldImports, masteryBySkill, pilotMasteryBySkill, reviewProgress, dueReviews, pilotReviewProgress, pilotDueReviews, pilotScopeIds, saveStatus]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be inside LearningProvider');
  return value;
}
