import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import RecordingAnswer from '../components/RecordingAnswer';
import { C0_ASSESSMENT_NOTICE, c0AssessmentForms } from '../data/assessment.c0.draft';
import { isQuarantined, usableItems } from '../learning/contentCorrections';
import { c0AssessmentAudioAssets } from '../data/audio.c0';
import { previewLessonForTrack } from '../data/lessonCatalog';
import { REASSESSMENT_SUGGESTION, appendAssessmentHistory, assessmentHistoryKey, buildAssessmentReport } from '../learning/assessmentReport';
import { readJson, writeJson } from '../utils/localStore';
import { useCancellableSpeech } from '../hooks/useCancellableSpeech';
import { useDurableSession } from '../hooks/useDurableSession';
import styles from './Learning.module.css';

// Each run of a form is its own attempt session. Resuming keeps the ID (so a paused run stays one
// session), while clearing the preview or starting again mints a new one, so a retake is never
// recorded as further attempts inside the earlier session.
function newAttemptSessionId(form) {
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `assessment-${form}-${unique}`;
}

const createAssessmentState = (form) => () => ({ index: 0, results: [], attemptSessionId: newAttemptSessionId(form), pendingPanel: null });
const assessmentAudioById = new Map(c0AssessmentAudioAssets.map((asset) => [asset.id, asset]));

export default function AssessmentRunner() {
  const { sessionId } = useParams();
  const form = sessionId === 'form-b' ? 'B' : 'A';
  const formData = c0AssessmentForms.find((candidate) => candidate.form === form);
  // Prompts with an open correction are withheld until the reviewer resolves them. The count is
  // shown rather than hidden, because withholding a prompt reduces the form's coverage.
  const items = usableItems(formData.items);
  const withheldCount = formData.items.filter(isQuarantined).length;
  const { activeProfileId, user } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const storageKey = `spelling-assessment:${activeProfileId}:${form}`;
  const { state, setState, ready, writable, canWrite, takeOverHere: takeOverSession, ownerKeyRef: stateOwnerKey, sessionSaveStatus } = useDurableSession({
    storageKey,
    learnerId: activeProfileId,
    mode: 'assessment',
    contentVersion: formData.version,
    orderedItemIds: items.map((entry) => entry.id),
    initialState: createAssessmentState(form),
    account: user,
  });
  const [answer, setAnswer] = useState('');
  const [helped, setHelped] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    setAnswer('');
    setHelped(false);
    setAudioMessage('');
    setSubmitting(false);
    submittingRef.current = false;
  }, [storageKey]);
  // Sessions saved before attempt-session IDs existed are adopted into one on first use.
  const attemptSessionId = state.attemptSessionId || `assessment-${form}-legacy`;
  // A panel shown after an answer (the self check, or the optional read-aloud practice) lives in
  // the saved session, not in component state, so closing the tab mid-panel resumes on that panel
  // for that learner instead of silently skipping it or replaying the answered item.
  const pendingPanel = state.pendingPanel || null;
  const panelItem = pendingPanel ? items.find((entry) => entry.id === pendingPanel.itemId) : null;
  const complete = state.index >= items.length;
  const item = complete ? null : items[state.index];
  const { play: playSpeech, playRecorded } = useCancellableSpeech(`${storageKey}:${item?.id || 'complete'}`);
  useEffect(() => setAudioMessage(''), [storageKey, item?.id]);
  const playItemAudio = async () => {
    const reviewedAudio = item.audioRef ? assessmentAudioById.get(item.audioRef) : null;
    const result = reviewedAudio
      ? await playRecorded(reviewedAudio.url)
      : await playSpeech(item.spokenText, { lang: 'en-CA', rate: 0.82 });
    if (result.reason === 'cancelled') return;
    if (!result.ok) return setAudioMessage('Audio playback failed. Continue as a technical issue, not a wrong answer.');
    const localeNote = reviewedAudio?.locale === 'en-CA' ? 'Canadian English recording played.' : reviewedAudio?.localeDisclosure || 'Synthetic preview audio played; it is not assessment evidence.';
    setAudioMessage(`${localeNote} You can replay it.`);
  };
  const report = useMemo(() => buildAssessmentReport({ form, version: formData.version, results: state.results, completedAt: state.completedAt }), [form, formData.version, state]);
  // A completed report joins the learner's per-form history so /assessment can compare like-for-like.
  useEffect(() => {
    if (!ready || !report.completedAt) return;
    const key = assessmentHistoryKey(activeProfileId, form);
    writeJson(key, appendAssessmentHistory(readJson(key, []), report));
  }, [activeProfileId, form, ready, report]);
  const recommendedLesson = previewLessonForTrack(report.suggestedTrack);
  const playChoiceAudio = async (choice) => {
    const result = await playSpeech(choice.spokenText, { lang: 'en-CA', rate: 0.78 });
    if (result.reason === 'cancelled') return;
    if (!result.ok) return setAudioMessage('Audio playback failed. Continue as a technical issue, not a wrong answer.');
    setAudioMessage(`${choice.text} played with synthetic preview audio; it has not been checked yet. You can replay it.`);
  };
  const advanceFrom = (fromState) => {
    const nextIndex = fromState.index + 1;
    return { ...fromState, index: nextIndex, pendingPanel: null, completedAt: nextIndex === items.length ? new Date().toISOString() : fromState.completedAt || null };
  };
  // Which follow-up panel an answered item earns. Neither panel scores anything.
  const panelFor = (answered, response, metadata) => {
    if (metadata.omitted || metadata.technicalFailure) return null;
    if (answered.evaluator === 'human_rubric' && answered.responseType === 'text') return { kind: 'self_check', itemId: answered.id, response };
    if (answered.optionalPractice) return { kind: 'practice', itemId: answered.id };
    return null;
  };
  const saveResult = async (response, metadata = {}) => {
    if (submittingRef.current || !canWrite()) return;
    const submissionOwnerKey = storageKey;
    const submissionState = state;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { attempt } = await submitAttempt(item, response, { sessionId: attemptSessionId, evidenceType: metadata.technicalFailure ? 'technical_failure' : metadata.omitted ? 'omission' : helped ? 'assisted_assessment' : item.responseType === 'recording' ? 'reviewed_pronunciation_pending' : item.evaluator === 'spelling' ? 'independent_spelling' : item.evaluator === 'punctuation' ? 'independent_punctuation' : 'independent_choice', helped, ...metadata });
      const answered = { ...submissionState, results: [...submissionState.results, { itemId: item.id, skillId: item.primarySkill, status: attempt.status, correct: attempt.correct, helped: attempt.helped, omitted: attempt.omitted, technicalFailure: attempt.technicalFailure }] };
      // Open writing and editing answers stay pending human review. With no rater available the
      // learner gets a self-check against the stated rubric; it is never scored or counted as
      // independent evidence. A receptive decoding item offers optional read-aloud practice.
      const panel = panelFor(item, response, metadata);
      const nextState = panel ? { ...answered, pendingPanel: panel } : advanceFrom(answered);
      if (stateOwnerKey.current === submissionOwnerKey && canWrite()) {
        setState(nextState);
        if (!panel) { setAnswer(''); setHelped(false); setAudioMessage(''); }
      }
    } finally {
      if (stateOwnerKey.current === submissionOwnerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!answer || !canWrite()) return;
    await saveResult(answer);
  };
  const finishPanel = () => {
    if (!canWrite() || !pendingPanel) return;
    setState(advanceFrom(state));
    setAnswer(''); setHelped(false); setAudioMessage('');
  };

  const takeOverHere = () => {
    setAnswer(''); setHelped(false); setAudioMessage(''); setSubmitting(false); submittingRef.current = false;
    takeOverSession();
  };
  const displayedSaveStatus = saveStatus === 'saved' ? sessionSaveStatus : saveStatus;
  return <div className={styles.page}><p className={styles.notice}>{C0_ASSESSMENT_NOTICE}</p>{withheldCount > 0 && <p className={styles.notice} role="status"><strong>{withheldCount} prompt{withheldCount === 1 ? ' is' : 's are'} withheld</strong> while a correction is reviewed. This form is {items.length} prompts instead of {formData.items.length}, so its coverage is incomplete.</p>}{!ready ? <div className={styles.notice} role="status">Restoring the saved assessment…</div> : !writable && <div className={styles.notice} role="status"><strong>This assessment is open in another tab or linked device.</strong> This view is read-only. <button className={styles.secondary} type="button" onClick={takeOverHere}>Take over here</button></div>}<section className={styles.card}>
    <p className={styles.meta}>Preview Form {form} · {displayedSaveStatus}</p><h1>Assessment preview</h1>
    {pendingPanel && panelItem && pendingPanel.kind === 'self_check' ? <section className={styles.feedback} aria-label="Self check"><h2>Check your own answer</h2><p>This answer is kept for a person to read later. Nothing here is scored, and it does not count as independent evidence.</p><p><strong>You wrote:</strong> {pendingPanel.response}</p>{panelItem.rubric?.modelAnswer && <p><strong>One answer that fits:</strong> {panelItem.rubric.modelAnswer}</p>}{panelItem.rubric?.answerKey && <><p><strong>What this task asks for:</strong></p><ul>{panelItem.rubric.answerKey.map((target) => <li key={target}>{target}</li>)}</ul></>}{!panelItem.rubric?.answerKey && panelItem.rubric?.dimensions && <><p><strong>What this task asks for:</strong></p><ul>{panelItem.rubric.dimensions.map((dimension) => <li key={dimension}>{typeof panelItem.rubric.scoring === 'object' ? panelItem.rubric.scoring[dimension] || dimension.replaceAll('_', ' ') : dimension.replaceAll('_', ' ')}</li>)}</ul></>}<p className={styles.meta}>Compare your answer with the list, then continue.</p><button className={styles.primary} type="button" disabled={!writable} onClick={finishPanel}>I have compared my answer</button></section> : pendingPanel && panelItem && pendingPanel.kind === 'practice' ? <section className={styles.feedback} aria-label="Optional practice"><h2>Optional practice</h2><p>{panelItem.optionalPractice.prompt}</p><p className={styles.meta}>This part is practice. The recording stays on this device, nothing is scored, and you can skip it.</p><p className={styles.printedWord}>{panelItem.printedWord}</p><div className={styles.actions}>{panelItem.choices.map((choice) => <button className={styles.secondary} type="button" key={choice.id} disabled={!writable} onClick={() => playChoiceAudio(choice)}>Play {choice.text}</button>)}</div>{audioMessage && <p role="status">{audioMessage}</p>}<RecordingAnswer itemId={`${panelItem.id}-practice`} learnerId={activeProfileId} sessionId={attemptSessionId} disabled={!writable} onReady={() => {}} /><div className={styles.actions}><button className={styles.primary} type="button" disabled={!writable} onClick={finishPanel}>Continue</button></div></section> : !complete ? <form onSubmit={submit}><p>Part {item.part} · Question {state.index + 1} of {items.length}</p><h2>{item.prompt}</h2>{item.printedWord && <p className={styles.printedWord}>{item.printedWord}</p>}{item.spokenText && <div className={styles.actions}><button className={styles.secondary} type="button" disabled={submitting} onClick={playItemAudio}>Play audio</button></div>}{audioMessage && <p role="status">{audioMessage}</p>}{item.responseType === 'audio_choice' ? item.choices.map((choice) => <div className={styles.audioChoice} key={choice.id}><label className={styles.choice}><input type="radio" name="answer" checked={answer === choice.id} disabled={submitting || !writable} onChange={() => setAnswer(choice.id)} /> {choice.text}</label><button className={styles.secondary} type="button" disabled={submitting || !writable} onClick={() => playChoiceAudio(choice)}>Play {choice.text}</button></div>) : item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name="answer" checked={answer === choice.id} disabled={submitting || !writable} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}{item.responseType === 'text' && <textarea className={styles.input} aria-label="Your answer" value={answer} disabled={submitting || !writable} onChange={(event) => setAnswer(event.target.value)} />}{item.responseType === 'recording' && <RecordingAnswer itemId={item.id} learnerId={activeProfileId} sessionId={attemptSessionId} disabled={submitting || !writable} onReady={setAnswer} />}{helped && <p className={styles.feedback}>Help used: {item.helpSteps[0]} This answer will be reported as assisted.</p>}<div className={styles.actions}><button className={styles.primary} disabled={!answer || submitting || !writable}>{submitting ? 'Saving…' : 'Save first answer'}</button><button className={styles.secondary} type="button" disabled={submitting || !writable} onClick={() => { if (canWrite()) setHelped(true); }}>I need help</button><button className={styles.secondary} type="button" disabled={submitting || !writable} onClick={() => saveResult(null, { omitted: true })}>I don’t know yet</button>{(item.spokenText || item.responseType === 'recording') && <button className={styles.secondary} type="button" disabled={submitting || !writable} onClick={() => saveResult(null, { technicalFailure: true })}>Audio or microphone did not work</button>}<Link className={styles.secondary} to="/assessment">Pause assessment</Link></div></form> : <><div className={styles.success}><h2>Preview complete</h2><p>{report.totals.answered} answered, {report.totals.assisted} assisted, {report.totals.omissions} omitted, {report.totals.pendingReview} pending review, and {report.totals.technicalFailures} technical issue(s). This draft result is not placement evidence.</p></div><h2>Evidence by track</h2>{Object.entries(report.tracks).map(([track, counts]) => <p key={track}><strong>{track}</strong>: {counts.firstTryCorrect}/{counts.independentScored} independent first tries; {counts.assisted} assisted; {counts.omissions} omitted; {counts.pendingReview} pending; {counts.technicalFailures} technical — {counts.coverage.replaceAll('_', ' ')}</p>)}<p>First follow-up signal: <strong>{report.suggestedTrack || 'more evidence needed'}</strong>. This is a preview signal, not a placement decision.</p><p className={styles.meta}>{REASSESSMENT_SUGGESTION}</p>{recommendedLesson ? <div className={styles.feedback}><p>Recommended integrated preview lesson: <strong>{recommendedLesson.title}</strong>. It teaches the matching C0 {report.suggestedTrack} skill through attempt, explanation, repair, and unseen transfer.</p><Link className={styles.primary} to={`/lesson/${recommendedLesson.sessionId}`}>Start recommended lesson</Link></div> : <div className={styles.feedback}><p>There is not yet an integrated C0 lesson for this {report.suggestedTrack || 'result'} signal. The preview does not substitute a different skill as a recommendation.</p><Link className={styles.secondary} to="/case">Choose an available C0 lesson</Link></div>}<div className={styles.actions}><button className={styles.secondary} disabled={!writable} onClick={() => { if (!canWrite()) return; setState(createAssessmentState(form)()); }}>Clear this preview</button></div></>}
  </section></div>;
}
