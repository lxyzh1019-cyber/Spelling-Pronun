import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { registerParent, signInParent, signOutParent } from '../firebase';
import { gateStateLabel, r2GateTracker } from '../data/r2GateTracker';
import { c0PilotItems } from '../data/packs.c0.draft';
import { c0AssessmentItems } from '../data/assessment.c0.draft';
import { PENDING_DECISIONS, buildPendingQueue, recordPendingDecision, summarisePendingReview } from '../learning/pendingReview';
import { draftPacksFor, openCorrectionsFor, summariseDraftInventory } from '../learning/draftInventory';
import { buildCoverageReport, coverageHeadline } from '../learning/curriculumCoverage';
import correctionData from '../data/corrections.c0.json';
import curriculumMapping from '../data/curriculum.alberta.elal.json';
import { c1Packs } from '../data/packs.c1.draft';
import { foundationPacks } from '../data/packs.foundation.draft';
import { pendingDecisionsKey, readJson, writeJson } from '../utils/localStore';
import styles from './Learning.module.css';

function friendlyAuthError(code) {
  if (code === 'auth/email-already-in-use') return 'That email already has an account. Choose Sign in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'The email or password was not accepted.';
  if (code === 'auth/weak-password') return 'Choose a password with at least six characters.';
  if (code === 'auth/operation-not-allowed') return 'Parent email sign-in is not enabled in Firebase yet. Local progress remains safe.';
  if (code === 'auth/network-request-failed') return 'The network is unavailable. Local progress remains safe.';
  return 'The parent account action could not be completed. Local progress remains safe.';
}

export default function ParentPage() {
  const { activeProfileId, authStatus, syncError, user, refreshAuthState } = useWords();
  const { attempts, saveStatus, syncCloud, previewImport, confirmImport, skipImport, heldImports } = useLearning();
  const [preview, setPreview] = useState(null);
  const heldCount = Object.values(heldImports || {}).reduce((sum, count) => sum + count, 0);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const parentConnected = Boolean(user && !user.isAnonymous);

  // Answers the evaluator could not decide, waiting for a person. Before this existed they were
  // recorded and never shown to anybody. A judgement here is one person's reading: it is kept and
  // reported, and it never becomes mastery evidence.
  const [decisions, setDecisions] = useState(() => readJson(pendingDecisionsKey(activeProfileId), []) || []);
  const [notes, setNotes] = useState({});
  const reviewableItems = useMemo(() => [...c0PilotItems, ...c0AssessmentItems], []);
  const pendingQueue = useMemo(() => buildPendingQueue(attempts, reviewableItems, decisions), [attempts, reviewableItems, decisions]);
  const pendingSummary = useMemo(() => summarisePendingReview(attempts, decisions), [attempts, decisions]);
  const decide = (attemptId, decision) => {
    const next = recordPendingDecision(decisions, { attemptId, decision, decidedBy: 'Parent', note: notes[attemptId] || '' });
    setDecisions(next);
    writeJson(pendingDecisionsKey(activeProfileId), next);
  };

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const credential = mode === 'register' ? await registerParent(email.trim(), password) : await signInParent(email.trim(), password);
      refreshAuthState();
      setPassword('');
      if (mode === 'register') {
        // Create path: the account has no history of its own, so local work imports additively.
        const created = await previewImport(credential.user);
        await confirmImport(credential.user, created);
        setMessage(`Parent account created. Imported ${created.totals.newAttempts} attempt${created.totals.newAttempts === 1 ? '' : 's'} and ${created.totals.newWords} word total${created.totals.newWords === 1 ? '' : 's'} from this device.`);
      } else {
        // Existing account: nothing is written until the parent reviews the exact counts.
        const proposed = await previewImport(credential.user);
        if (proposed.nothingToImport) {
          await syncCloud(credential.user, activeProfileId, { push: 'force' });
          setMessage('Signed in. This device has nothing new to import; cloud history is now available here.');
        } else {
          setPreview(proposed);
          setMessage('Signed in. Review what this device would add before importing.');
        }
      }
    } catch (error) {
      setMessage(friendlyAuthError(error.code));
    } finally { setBusy(false); }
  };

  const runImport = async () => {
    if (!user || !preview) return;
    setBusy(true); setMessage('');
    try {
      await confirmImport(user, preview);
      setMessage(`Imported ${preview.totals.newAttempts} attempt${preview.totals.newAttempts === 1 ? '' : 's'} and ${preview.totals.newWords} word total${preview.totals.newWords === 1 ? '' : 's'}. Rows already in the account were left unchanged.`);
      setPreview(null);
    } catch { setMessage('The import did not complete. Nothing was removed from this device; try again when online.'); }
    finally { setBusy(false); }
  };

  const declineImport = async () => {
    if (!user || !preview) return;
    setBusy(true); setMessage('');
    try {
      await skipImport(user, preview);
      setMessage('Import skipped. Local work stays on this device and will not be merged until you choose Import.');
      setPreview(null);
    } catch { setMessage('The decision could not be saved.'); }
    finally { setBusy(false); }
  };

  const reopenPreview = async () => {
    if (!user) return;
    setBusy(true); setMessage('');
    try { setPreview(await previewImport(user)); }
    catch { setMessage('The preview could not be loaded. Check the connection and try again.'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setMessage('');
    try {
      await signOutParent(); refreshAuthState(); setMessage('Signed out. New work will remain on this device until the next parent sign-in.');
    } catch { setMessage('Sign-out did not complete.'); }
    finally { setBusy(false); }
  };

  const openCorrections = useMemo(() => openCorrectionsFor(correctionData.corrections), []);
  const draftPacks = useMemo(() => draftPacksFor([
    { batch: 'C1', packs: c1Packs },
    { batch: 'F1', packs: foundationPacks },
  ]), []);
  const draftSummary = useMemo(() => summariseDraftInventory({ corrections: openCorrections, packs: draftPacks }), [openCorrections, draftPacks]);
  const coverageReport = useMemo(() => buildCoverageReport(curriculumMapping), []);
  const coverage = useMemo(() => coverageHeadline(coverageReport), [coverageReport]);

  return <div className={styles.page}>
    <section className={styles.card}>
      <h1>Parent view</h1>
      <p><strong>Learner:</strong> {activeProfileId}</p><p><strong>Connection:</strong> {parentConnected ? `parent account (${user.email})` : user?.isAnonymous ? 'anonymous cloud guest' : authStatus}</p><p><strong>Learning data:</strong> {saveStatus}</p><p><strong>Attempts on this device:</strong> {attempts.length}</p>
      {syncError && <p role="alert">{syncError}</p>}
      {!parentConnected ? <form onSubmit={submit}>
        <h2>{mode === 'register' ? 'Create parent account' : 'Parent sign in'}</h2>
        <p>Only the parent uses email and password. Learners continue using their profile names. Passwords are sent directly to Firebase Authentication and are never stored by this app.</p>
        <label>Email<input className={styles.input} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input className={styles.input} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? 'Working…' : mode === 'register' ? 'Create and import' : 'Sign in and sync'}</button><button className={styles.secondary} type="button" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setMessage(''); }}>{mode === 'register' ? 'Use existing account' : 'Create an account'}</button></div>
      </form> : <>
        <p>Local immutable attempts reconcile additively with this account by attempt ID. An account that already has history never merges this device's work until you review the exact counts below; a brand-new account imports this device's work when it is created.</p>
        {heldCount > 0 && !preview && <div className={styles.notice} role="status"><strong>{heldCount} local item{heldCount === 1 ? '' : 's'} waiting for your decision.</strong> New work is saved on this device only until you import. <button className={styles.secondary} type="button" disabled={busy} onClick={reopenPreview}>Review import</button></div>}
        <button className={styles.secondary} disabled={busy} onClick={disconnect}>Sign out</button>
      </>}
      {preview && <section className={styles.feedback} aria-label="Import preview">
        <h2>Import preview</h2>
        <p>Nothing has been written yet. Importing adds only the rows below; rows already in the account are left exactly as they are.</p>
        <table className={styles.table}><thead><tr><th>Learner</th><th>New attempts</th><th>New word totals</th><th>Already in account</th></tr></thead><tbody>{preview.learners.map((entry) => <tr key={entry.learnerId}><td>{entry.learnerId}</td><td>{entry.counts.newAttempts}</td><td>{entry.counts.newWords}</td><td>{entry.counts.alreadyInCloudAttempts + entry.counts.alreadyInCloudWords}</td></tr>)}</tbody></table>
        <div className={styles.actions}><button className={styles.primary} type="button" disabled={busy || preview.nothingToImport} onClick={runImport}>{preview.nothingToImport ? 'Nothing to import' : `Import ${preview.totals.newAttempts + preview.totals.newWords} item${preview.totals.newAttempts + preview.totals.newWords === 1 ? '' : 's'}`}</button><button className={styles.secondary} type="button" disabled={busy} onClick={declineImport}>Skip for now</button></div>
      </section>}
      {message && <p role="status">{message}</p>}
      <h2>Answers waiting for you</h2>
      <p>The app does not mark a typed sentence right or wrong. When an answer is not the exact wording in the key, it is kept for you to read. These are for <strong>{activeProfileId}</strong>, the learner currently selected; switch profiles to see another child's.</p>
      <p className={styles.meta}>Your judgement is recorded and shown here. It is never counted as mastery evidence: one person reading an answer is not the reviewed, independent evidence a release needs.</p>
      {pendingQueue.length === 0
        ? <p role="status">Nothing is waiting. {pendingSummary.reviewed > 0 ? `You have read ${pendingSummary.reviewed} answer${pendingSummary.reviewed === 1 ? '' : 's'}, and marked ${pendingSummary.acceptable} acceptable.` : ''}</p>
        : <>
          <p role="status"><strong>{pendingQueue.length} answer{pendingQueue.length === 1 ? '' : 's'} waiting.</strong></p>
          {pendingQueue.map((row) => <article className={styles.feedback} key={row.attemptId}>
            {row.itemMissing
              ? <p><strong>This question is no longer in the app,</strong> so it cannot be shown. The answer is kept below.</p>
              : <p><strong>{row.prompt}</strong></p>}
            <p><strong>{activeProfileId} wrote:</strong> {String(row.submitted ?? '')}</p>
            {row.expected.length > 0 && <p><strong>The key expected:</strong> {row.expected.join(' / ')}</p>}
            {row.rubric?.modelAnswer && <p><strong>One answer that fits:</strong> {row.rubric.modelAnswer}</p>}
            {row.rubric?.answerKey && <ul>{row.rubric.answerKey.map((target) => <li key={target}>{target}</li>)}</ul>}
            {row.helped && <p className={styles.meta}>Help was used on this answer.</p>}
            <label>Note (optional)<input className={styles.input} type="text" value={notes[row.attemptId] || ''} onChange={(event) => setNotes((current) => ({ ...current, [row.attemptId]: event.target.value }))} /></label>
            <div className={styles.actions}>
              <button className={styles.primary} type="button" onClick={() => decide(row.attemptId, PENDING_DECISIONS.ACCEPTED)}>This is an acceptable answer</button>
              <button className={styles.secondary} type="button" onClick={() => decide(row.attemptId, PENDING_DECISIONS.REJECTED)}>This one needs more teaching</button>
            </div>
          </article>)}
        </>}
      <h2>Written and waiting for you</h2>
      <p>{draftSummary.summary}</p>
      {openCorrections.length > 0 && <>
        <h3>Changes proposed to lessons that already exist</h3>
        {openCorrections.map((correction) => <article className={styles.gate} key={correction.id}>
          <p><strong>{correction.id}</strong> <span className={styles.meta}>— {correction.itemCount} questions</span></p>
          <p>{correction.reason}</p>
          <p className={styles.meta}>Proposed: {correction.change}</p>
          <p className={styles.meta}>The replacement wording is in <code>{correction.draftedIn}</code>. Installing it: {correction.requiresOnInstall}</p>
        </article>)}
      </>}
      {draftPacks.length > 0 && <>
        <h3>New lessons nobody has approved yet</h3>
        <p>These are written but not checked, not reviewed and not approved, so no child can open them. That is the lifecycle working, not a fault.</p>
        {draftPacks.map((pack) => <article className={styles.gate} key={pack.id}>
          <p><strong>{pack.title}</strong> <span className={styles.meta}>— {pack.questionCount} questions, {pack.skillId}</span></p>
          <p>{pack.rule}</p>
          <p className={styles.meta}>{pack.albertaPlacement
            ? `Alberta places this at ${pack.albertaPlacement.albertaGrades}, so it is practice rather than a Grade 5/6 check. ${pack.albertaPlacement.note}`
            : `Written for Alberta Grade 5/6 outcomes: ${pack.curriculumOutcomeIds.join(', ')}.`}</p>
        </article>)}
      </>}
      <h2>What Alberta asks for, and what this app checks</h2>
      <p>{coverage.summary}</p>
      {!coverageReport.verified && <p className={styles.meta}>{coverageReport.verificationNote}</p>}
      <div className={styles.gateList}>{coverageReport.ideas.map((idea) => <article className={styles.gate} key={idea.id}>
        <p><strong>{idea.name}</strong> <span className={styles.meta}>— {idea.total} outcomes</span></p>
        <p className={styles.meta}>
          {idea.tally.checked} checked · {idea.tally.needs_more_evidence} measured, not enough evidence yet · {idea.tally.not_built} not built · {idea.tally.needs_parent} for you to mark
        </p>
      </article>)}</div>
      <h2>Things I need you to test</h2><p>Some of these gates only move when a person checks something the app cannot check itself. The testing page walks through each one, step by step, and records what you saw.</p><p><Link className={styles.primary} to="/checks">Open the testing checks</Link></p>
      <h2>R2 pilot gate tracker</h2><p>This is a truthful readiness list, not a release claim. Only content marked explicitly released after review, integration, and learner testing can affect mastery.</p><div className={styles.gateList}>{r2GateTracker.map((gate) => <article className={styles.gate} key={gate.id}><p><strong>{gate.label}</strong> <span className={styles.meta}>— {gateStateLabel(gate.state)}</span></p><p>{gate.detail}</p></article>)}</div>
    </section>
  </div>;
}
