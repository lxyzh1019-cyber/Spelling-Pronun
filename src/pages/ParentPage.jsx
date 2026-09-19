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
import { ladderReview } from '../learning/gradeLadder';
import ladder from '../data/curriculum.ladder.json';
import { diagnosticForm } from '../data/diagnostic.k4.draft.js';
import { buildDiagnosticReport } from '../learning/diagnosticReport';
import { attemptsFrom, readDiagnosticRun } from '../persistence/diagnosticStore';
import correctionData from '../data/corrections.c0.json';
import curriculumMapping from '../data/curriculum.alberta.elal.json';
import { c1Packs } from '../data/packs.c1.draft';
import { foundationPacks } from '../data/packs.foundation.draft';
import { punctuationPacks } from '../data/packs.punctuation.draft';
import { sentencePacks } from '../data/packs.sentences.draft';
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
  const { activeProfileId, authStatus, syncError, user, refreshAuthState, learnerGrade, setProfileGrade, LEARNER_GRADES } = useWords();
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
    { batch: 'P1', packs: punctuationPacks },
    { batch: 'S1', packs: sentencePacks },
  ]), []);
  const draftSummary = useMemo(() => summariseDraftInventory({ corrections: openCorrections, packs: draftPacks }), [openCorrections, draftPacks]);
  // The drafted packs are passed in so the report works out for itself which outcomes have content
  // written against them. It used to read a hand-written `draftedIn` on each outcome, which drifted
  // within a day of the packs being written.
  const coverageReport = useMemo(
    () => buildCoverageReport(curriculumMapping, { packs: [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks] }),
    [],
  );
  const coverage = useMemo(() => coverageHeadline(coverageReport), [coverageReport]);
  // Where each skill sits for THIS learner. Shown here whether or not the mapping has been verified,
  // because this page is how it gets verified — gating the parent's own view would make the gate on
  // the learner's view permanent.
  const ladderView = useMemo(() => ladderReview(ladder, learnerGrade), [learnerGrade]);
  // What the diagnostic found for the learner currently selected. Null until that child has answered
  // something, because a report over no answers would read as a result rather than as an absence.
  const diagnosticReport = useMemo(() => {
    const run = readDiagnosticRun(globalThis.localStorage, activeProfileId, diagnosticForm.id);
    const attempts = attemptsFrom(run);
    return attempts.length ? buildDiagnosticReport(diagnosticForm, attempts, { ladder }) : null;
  }, [activeProfileId]);

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
      <h2>Finding out what was missed before Grade 5</h2>
      <p>Alberta finishes with {ladderView.counts.revisiting || diagnosticForm.items.length / 3} of these skills before Grade 5, so nothing later in the curriculum comes back to them. This form asks three questions about each — {diagnosticForm.items.length} in all — to find which ones need building, so the next lessons written are the ones actually needed.</p>
      <p className={styles.meta}>{diagnosticForm.purpose} When a wrong answer comes back it names the specific thing it found, not just that something was wrong.</p>
      <p className={styles.meta}>Answers to it can never count as mastery: they are kept in their own store with no path into the learning record, and both evidence tracks ignore this content whatever a child scores. Tests enforce both halves.</p>
      <div className={styles.actions}><Link className={styles.primary} to="/diagnostic">Open the diagnostic</Link></div>
      {!diagnosticReport && <p role="status">{activeProfileId} has not answered any of it yet. What it finds will appear here.</p>}
      {diagnosticReport && <>
        <h3>What it found for {activeProfileId}</h3>
        <p role="status"><strong>{diagnosticReport.separateAppQuestion.detail}</strong></p>
        <p className={styles.meta}>
          {diagnosticReport.counts.solid} solid · {diagnosticReport.counts.partly_solid} partly solid · {diagnosticReport.counts.needs_building} need building · {diagnosticReport.counts.not_enough_evidence} not answered yet
        </p>
        <p className={styles.meta}>{diagnosticReport.masteryNote}</p>
        <div className={styles.gateList}>{diagnosticReport.skills.filter((skill) => skill.state !== 'not_enough_evidence').map((skill) => <article className={styles.gate} key={skill.skillId}>
          <p><strong>{skill.skillId}</strong> <span className={styles.meta}>— {skill.correct} of {skill.answered} right{skill.albertaFinishesAt ? `, Alberta finishes with this at ${skill.albertaFinishesAt}` : ''}</span></p>
          {skill.locates.length > 0 && <ul>{skill.locates.map((located) => <li key={located.itemId}>{located.locates}</li>)}</ul>}
        </article>)}</div>
      </>}
      <h2>Which grade is {activeProfileId} in?</h2>
      <p>The lessons can tell a child where a skill sits — Grade 3 work they are revisiting, Grade 6 work they are running ahead into — but only once you have said which grade they are in. Nothing is assumed, so until you set this the lessons show no grade at all.</p>
      <div className={styles.actions}>
        {LEARNER_GRADES.map((grade) => <button
          key={grade}
          type="button"
          className={grade === learnerGrade ? styles.primary : styles.secondary}
          onClick={() => setProfileGrade(activeProfileId, grade === learnerGrade ? null : grade)}
        >{grade}</button>)}
      </div>
      <h2>Where Alberta puts each skill</h2>
      <p>{ladderView.summary}</p>
      <p className={styles.meta}>{learnerGrade
        ? `${ladderView.counts.revisiting} skills Alberta finishes with below ${learnerGrade} · ${ladderView.counts.at_grade} at grade · ${ladderView.counts.ahead} above it · ${ladderView.counts.unplaced} Alberta does not place at any grade.`
        : `${ladderView.counts.no_learner_grade} skills are placed on the ladder and ${ladderView.counts.unplaced} are not placed by Alberta at any grade. Set a grade above and each one is shown relative to ${activeProfileId}.`}</p>
      {ladderView.disputed.length > 0 && <>
        <h3>Where this reading disagrees with what was written before</h3>
        {ladderView.disputed.map((entry) => <article className={styles.gate} key={entry.claim}>
          <p><strong>Written before:</strong> {entry.claim}</p>
          <p><strong>This reading finds:</strong> {entry.ladderFinds}</p>
          <p className={styles.meta}>{entry.effect}</p>
        </article>)}
      </>}
      <div className={styles.gateList}>{ladderView.skills.map((entry) => <article className={styles.gate} key={entry.skillId}>
        <p><strong>{entry.skillId}</strong> <span className={styles.meta}>— {entry.label || 'Alberta does not place this at any grade'}</span></p>
        {entry.reason && <p className={styles.meta}>{entry.reason}</p>}
        {entry.note && <p className={styles.meta}>{entry.note}</p>}
        {entry.evidence && <ul>{entry.evidence.introducedBy.concat(entry.evidence.consolidatedBy).map((cited) => <li key={cited.id}>
          <span className={styles.meta}>{cited.grade} {cited.organizingIdea}: </span>{cited.text}
        </li>)}</ul>}
      </article>)}</div>
      <h2>Things I need you to test</h2><p>Some of these gates only move when a person checks something the app cannot check itself. The testing page walks through each one, step by step, and records what you saw.</p><p><Link className={styles.primary} to="/checks">Open the testing checks</Link></p>
      <h2>R2 pilot gate tracker</h2><p>This is a truthful readiness list, not a release claim. Only content marked explicitly released after review, integration, and learner testing can affect mastery.</p><div className={styles.gateList}>{r2GateTracker.map((gate) => <article className={styles.gate} key={gate.id}><p><strong>{gate.label}</strong> <span className={styles.meta}>— {gateStateLabel(gate.state)}</span></p><p>{gate.detail}</p></article>)}</div>
    </section>
  </div>;
}
