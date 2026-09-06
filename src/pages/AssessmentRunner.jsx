import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { assessmentFixtures, itemById, PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
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
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(state)); }, [state, storageKey]);
  const complete = state.index >= ids.length;
  const item = complete ? null : itemById(ids[state.index]);
  const correct = useMemo(() => state.results.filter((result) => result.correct).length, [state.results]);
  const submit = async (event) => {
    event.preventDefault(); if (!answer) return;
    const { evaluation } = await submitAttempt(item, answer, { sessionId: `assessment-${form}`, evidenceType: item.evaluator === 'punctuation' ? 'independent_punctuation' : 'independent_choice' });
    setState((current) => ({ index: current.index + 1, results: [...current.results, { itemId: item.id, skillId: item.primarySkill, correct: evaluation.correct }] })); setAnswer('');
  };
  return <div className={styles.page}><p className={styles.notice}>{PILOT_FIXTURE_NOTICE}</p><section className={styles.card}>
    <p className={styles.meta}>Preview Form {form} · {saveStatus}</p><h1>Assessment preview</h1>
    {!complete ? <form onSubmit={submit}><p>Question {state.index + 1} of {ids.length}</p><h2>{item.prompt}</h2>{item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name="answer" checked={answer === choice.id} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}{!item.choices && <input className={styles.input} aria-label="Your answer" value={answer} onChange={(event) => setAnswer(event.target.value)} />}<button className={styles.primary} disabled={!answer}>Save first answer</button></form> : <><div className={styles.success}><h2>Preview complete</h2><p>{correct} of {ids.length} correct. This result is diagnostic engineering data only.</p></div><p>Recommended next preview: <strong>Complete sentences</strong>. The released system will calculate recommendations across the full reviewed C0 assessment.</p><div className={styles.actions}><Link className={styles.primary} to="/lesson/pilot-se-complete">Start recommended lesson</Link><button className={styles.secondary} onClick={() => { localStorage.removeItem(storageKey); setState({ index: 0, results: [] }); }}>Clear this preview</button></div></>}
  </section></div>;
}
