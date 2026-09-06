import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import RecordingAnswer from '../components/RecordingAnswer';
import { c0AssessmentForms } from '../data/assessment.c0.draft';
import { PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import { buildAssessmentReport } from '../learning/assessmentReport';
import { speak, stopSpeech } from '../utils/speech';
import styles from './Learning.module.css';

export default function AssessmentRunner() {
  const { sessionId } = useParams();
  const form = sessionId === 'form-b' ? 'B' : 'A';
  const formData = c0AssessmentForms.find((candidate) => candidate.form === form);
  const items = formData.items;
  const { activeProfileId } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const storageKey = `spelling-assessment:${activeProfileId}:${form}`;
  const [state, setState] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey)) || { index: 0, results: [] }; } catch { return { index: 0, results: [] }; } });
  const [answer, setAnswer] = useState('');
  const [helped, setHelped] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const stateOwnerKey = useRef(storageKey);
  useEffect(() => {
    if (stateOwnerKey.current === storageKey) localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);
  useEffect(() => {
    if (stateOwnerKey.current === storageKey) return;
    stateOwnerKey.current = storageKey;
    try { setState(JSON.parse(localStorage.getItem(storageKey)) || { index: 0, results: [] }); } catch { setState({ index: 0, results: [] }); }
    setAnswer('');
    setHelped(false);
    setAudioMessage('');
    setSubmitting(false);
    submittingRef.current = false;
  }, [storageKey]);
  const complete = state.index >= items.length;
  const item = complete ? null : items[state.index];
  useEffect(() => () => stopSpeech(), [storageKey, item?.id]);
  const report = useMemo(() => buildAssessmentReport({ form, results: state.results, completedAt: state.completedAt }), [form, state]);
  const saveResult = async (response, metadata = {}) => {
    if (submittingRef.current) return;
    const submissionOwnerKey = storageKey;
    const submissionState = state;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { attempt } = await submitAttempt(item, response, { sessionId: `assessment-${form}`, evidenceType: metadata.technicalFailure ? 'technical_failure' : metadata.omitted ? 'omission' : helped ? 'assisted_assessment' : item.responseType === 'recording' ? 'reviewed_pronunciation_pending' : item.evaluator === 'spelling' ? 'independent_spelling' : item.evaluator === 'punctuation' ? 'independent_punctuation' : 'independent_choice', helped, ...metadata });
      const nextIndex = submissionState.index + 1;
      const nextState = { ...submissionState, index: nextIndex, completedAt: nextIndex === items.length ? new Date().toISOString() : null, results: [...submissionState.results, { itemId: item.id, skillId: item.primarySkill, status: attempt.status, correct: attempt.correct, helped: attempt.helped, omitted: attempt.omitted, technicalFailure: attempt.technicalFailure }] };
      localStorage.setItem(submissionOwnerKey, JSON.stringify(nextState));
      if (stateOwnerKey.current === submissionOwnerKey) {
        setState(nextState);
        setAnswer(''); setHelped(false); setAudioMessage('');
      }
    } finally {
      if (stateOwnerKey.current === submissionOwnerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!answer) return;
    await saveResult(answer);
  };
  return <div className={styles.page}><p className={styles.notice}>{PILOT_FIXTURE_NOTICE}</p><section className={styles.card}>
    <p className={styles.meta}>Preview Form {form} · {saveStatus}</p><h1>Assessment preview</h1>
    {!complete ? <form onSubmit={submit}><p>Part {item.part} · Question {state.index + 1} of {items.length}</p><h2>{item.prompt}</h2>{item.spokenText && <div className={styles.actions}><button className={styles.secondary} type="button" disabled={submitting} onClick={async () => { const result = await speak(item.spokenText, { lang: 'en-CA', rate: 0.82 }); setAudioMessage(result.ok ? 'Audio played. You can replay it.' : 'Audio playback failed. Continue as a technical issue, not a wrong answer.'); }}>Play audio</button></div>}{audioMessage && <p role="status">{audioMessage}</p>}{item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name="answer" checked={answer === choice.id} disabled={submitting} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}{item.responseType === 'text' && <textarea className={styles.input} aria-label="Your answer" value={answer} disabled={submitting} onChange={(event) => setAnswer(event.target.value)} />}{item.responseType === 'recording' && <RecordingAnswer itemId={item.id} learnerId={activeProfileId} sessionId={`assessment-${form}`} onReady={setAnswer} />}{helped && <p className={styles.feedback}>Help used: {item.helpSteps[0]} This answer will be reported as assisted.</p>}<div className={styles.actions}><button className={styles.primary} disabled={!answer || submitting}>{submitting ? 'Saving…' : 'Save first answer'}</button><button className={styles.secondary} type="button" disabled={submitting} onClick={() => setHelped(true)}>I need help</button><button className={styles.secondary} type="button" disabled={submitting} onClick={() => saveResult(null, { omitted: true })}>I don’t know yet</button>{(item.spokenText || item.responseType === 'recording') && <button className={styles.secondary} type="button" disabled={submitting} onClick={() => saveResult(null, { technicalFailure: true })}>Audio or microphone did not work</button>}<Link className={styles.secondary} to="/assessment">Pause assessment</Link></div></form> : <><div className={styles.success}><h2>Preview complete</h2><p>{report.totals.answered} answered, {report.totals.assisted} assisted, {report.totals.omissions} omitted, {report.totals.pendingReview} pending review, and {report.totals.technicalFailures} technical issue(s). This draft result is not placement evidence.</p></div><h2>Evidence by track</h2>{Object.entries(report.tracks).map(([track, counts]) => <p key={track}><strong>{track}</strong>: {counts.firstTryCorrect}/{counts.independentScored} independent first tries; {counts.assisted} assisted; {counts.omissions} omitted; {counts.pendingReview} pending; {counts.technicalFailures} technical — {counts.coverage.replaceAll('_', ' ')}</p>)}<p>First follow-up signal: <strong>{report.suggestedTrack || 'more evidence needed'}</strong>. The released system will calculate recommendations only after independent content/audio review.</p><p>The engineering preview currently exposes only the complete-sentence lesson, so its link is not presented as a personalized recommendation.</p><div className={styles.actions}><Link className={styles.primary} to="/lesson/pilot-se-complete">Open available pilot lesson</Link><button className={styles.secondary} onClick={() => { localStorage.removeItem(storageKey); setState({ index: 0, results: [] }); }}>Clear this preview</button></div></>}
  </section></div>;
}
