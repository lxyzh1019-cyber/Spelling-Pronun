import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useWords } from './WordProvider';
import { evaluateItem } from '../learning/evaluators';
import { deriveMastery } from '../learning/mastery';
import { deriveReviewProgress, selectDueReviews } from '../learning/reviewScheduler';
import { edmontonDayKey } from '../learning/r1Core';
import { queueAttempt } from '../persistence/indexedDb';
import { flushOutbox } from '../persistence/indexedDb';
import { attemptDocumentId, mergeAttempts } from '../persistence/sync';
import { readJson, writeJson } from '../utils/localStore';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import skillsData from '../data/skills.json';

const LearningContext = createContext(null);

function attemptsKey(learnerId) {
  return `spelling-learning-attempts:${learnerId}`;
}

export function LearningProvider({ children }) {
  const { activeProfileId, user } = useWords();
  const [attempts, setAttempts] = useState(() => readJson(attemptsKey(activeProfileId), []));
  const [saveStatus, setSaveStatus] = useState('saved');

  useEffect(() => {
    setAttempts(readJson(attemptsKey(activeProfileId), []));
    setSaveStatus('saved');
  }, [activeProfileId]);

  const syncCloud = useCallback(async (account = user) => {
    if (!account) return false;
    setSaveStatus('syncing');
    try {
      await flushOutbox(async (entry) => {
        if (entry.kind !== 'attempt') return;
        const documentId = attemptDocumentId(account.uid, entry.payload);
        const target = doc(db, 'spelling-attempts', documentId);
        const existing = await getDoc(target);
        if (!existing.exists()) await setDoc(target, { ...entry.payload, userId: account.uid });
      });
      const snapshot = await getDocs(query(
        collection(db, 'spelling-attempts'),
        where('userId', '==', account.uid),
        where('learnerId', '==', activeProfileId),
      ));
      const remote = snapshot.docs.map((entry) => entry.data());
      const local = readJson(attemptsKey(activeProfileId), []);
      const merged = mergeAttempts(local, remote);
      writeJson(attemptsKey(activeProfileId), merged);
      setAttempts(merged);
      setSaveStatus('saved');
      return true;
    } catch (error) {
      console.warn('Learning attempt sync deferred:', error);
      setSaveStatus('saved-locally');
      return false;
    }
  }, [activeProfileId, user]);

  useEffect(() => { if (user) syncCloud(user); }, [user, activeProfileId, syncCloud]);

  const submitAttempt = useCallback(async (item, response, metadata = {}) => {
    const evaluation = evaluateItem(item, response);
    const attempt = Object.freeze({
      attemptId: metadata.attemptId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      learnerId: activeProfileId,
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
      evidenceType: metadata.evidenceType || 'independent_choice',
      eventTime: new Date().toISOString(),
      edmontonDate: edmontonDayKey(),
      contentStatus: item.reviewStatus,
    });
    setAttempts((current) => {
      if (current.some(({ attemptId }) => attemptId === attempt.attemptId)) return current;
      const next = [...current, attempt];
      writeJson(attemptsKey(activeProfileId), next);
      return next;
    });
    setSaveStatus('saving');
    try {
      await queueAttempt(attempt);
      if (user) await syncCloud(user);
      else setSaveStatus('saved');
    } catch {
      setSaveStatus('saved-locally');
    }
    return { attempt, evaluation };
  }, [activeProfileId, user, syncCloud]);

  const masteryBySkill = useMemo(() => Object.fromEntries(skillsData.skills.map((skill) => [
    skill.id,
    deriveMastery(attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && attempt.contentStatus === 'reviewed')),
  ])), [attempts]);
  const reviewProgress = useMemo(() => deriveReviewProgress(attempts), [attempts]);
  const dueReviews = useMemo(() => selectDueReviews(reviewProgress), [reviewProgress]);

  const value = useMemo(() => ({ attempts, submitAttempt, syncCloud, masteryBySkill, reviewProgress, dueReviews, saveStatus, skills: skillsData.skills }), [attempts, submitAttempt, syncCloud, masteryBySkill, reviewProgress, dueReviews, saveStatus]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be inside LearningProvider');
  return value;
}
