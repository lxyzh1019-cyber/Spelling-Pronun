import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { assessmentFixtures, itemById, PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import { buildAssessmentReport } from '../learning/assessmentReport';
import styles from './Learning.module.css';

export default function AssessmentRunner() {
  const { sessionId } = useParams();
  const form = sessionId === 'form-b' ? 'B' : 'A';
  const ids = assessmentFixtures[form];
  const { activeProfileId } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const storageKey = `spelling-assessment:${activeProfileId}:${form}`;
  const [state, setState] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey)) || { index: 0, results: [] }; } catch { return { index: 0, results: [] }; } });
  const [answer, setAnswer] = useState('');
  const [helped, setHelped] = useState(false);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(state)); }, [state, storageKey]);
  const complete = state.index >= ids.length;
  const item = complete ? null : itemById(ids[state.index]);
  const report = useMemo(() => buildAssessmentReport({ form, results: state.results, completedAt: state.completedAt }), [form, state]);
  const saveResult = async (response, metadata = {}) => {
    const { attempt } = await submitAttempt(item, response, { sessionId: `assessment-${form}`, evidenceType: metadata.omitted ? 'omission' : helped ? 'assisted_assessment' : item.evaluator === 'punctuation' ? 'independent_punctuation' : 'independent_choice', helped, ...metadata });
    setState((current) => {
      const nextIndex = current.index + 1;
      return { ...current, index: nextIndex, completedAt: nextIndex === ids.length ? new Date().toISOString() : null, results: [...current.results, { itemId: item.id, skillId: item.primarySkill, status: attempt.status, correct: attempt.correct, helped: attempt.helped, omitted: attempt.omitted }] };
    });
    setAnswer(''); setHelped(false);
  };
  const submit = async (event) => {
    event.preventDefault(); if (!answer) return;
    await saveResult(answer);
  };
  return <div className={styles.page}><p className={styles.notice}>{PILOT_FIXTURE_NOTICE}</p><section className={styles.card}>
    <p className={styles.meta}>Preview Form {form} · {saveStatus}</p><h1>Assessment preview</h1>
    {!complete ? <form onSubmit={submit}><p>Question {state.index + 1} of {ids.length}</p><h2>{item.prompt}</h2>{item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name="answer" checked={answer === choice.id} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}{!item.choices && <input className={styles.input} aria-label="Your answer" value={answer} onChange={(event) => setAnswer(event.target.value)} />}{helped && <p className={styles.feedback}>Help used: find the subject, verb, spelling pattern, or punctuation purpose being tested. This answer will be reported as assisted.</p>}<div className={styles.actions}><button className={styles.primary} disabled={!answer}>Save first answer</button><button className={styles.secondary} type="button" onClick={() => setHelped(true)}>I need help</button><button className={styles.secondary} type="button" onClick={() => saveResult(null, { omitted: true })}>I don’t know yet</button></div></form> : <><div className={styles.success}><h2>Preview complete</h2><p>{report.totals.answered} answered, {report.totals.assisted} assisted, {report.totals.omissions} omitted, and {report.totals.pendingReview} pending review. This is diagnostic engineering data only.</p></div><h2>Evidence by track</h2>{Object.entries(report.tracks).map(([track, counts]) => <p key={track}><strong>{track}</strong>: {counts.firstTryCorrect}/{counts.independentScored} independent first tries; {counts.assisted} assisted; {counts.omissions} omitted — {counts.coverage.replaceAll('_', ' ')}</p>)}<p>First follow-up signal: <strong>{report.suggestedTrack || 'more evidence needed'}</strong>. The released system will calculate recommendations from the full reviewed C0 assessment.</p><p>The engineering preview currently exposes only the complete-sentence lesson, so its link is not presented as a personalized recommendation.</p><div className={styles.actions}><Link className={styles.primary} to="/lesson/pilot-se-complete">Open available pilot lesson</Link><button className={styles.secondary} onClick={() => { localStorage.removeItem(storageKey); setState({ index: 0, results: [] }); }}>Clear this preview</button></div></>}
  </section></div>;
}
