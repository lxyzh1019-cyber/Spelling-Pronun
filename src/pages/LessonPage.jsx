import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { lessonBySessionId } from '../data/lessonCatalog';
import { acceptWorkedSolution, completeReflection, continueLesson, createLessonState, currentLessonItem, startLesson, submitLessonResult } from '../learning/lessonFlow';
import { readJson, writeJson } from '../utils/localStore';
import styles from './Learning.module.css';

const DRAFT_NOTICE = 'Draft C0 preview: these items meet the planned structure but have not completed independent educational and source review. Their attempts cannot affect mastery.';

function Question({ item, onAnswer, busy }) {
  const [answer, setAnswer] = useState('');
  return <form onSubmit={(event) => { event.preventDefault(); if (answer) onAnswer(answer); }}>
    <p>{item.prompt}</p>
    {item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name={item.id} value={choice.id} checked={answer === choice.id} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}
    {!item.choices && <textarea className={styles.input} aria-label="Your answer" value={answer} onChange={(event) => setAnswer(event.target.value)} />}
    <button className={styles.primary} type="submit" disabled={!answer || busy}>{busy ? 'Saving…' : 'Save this answer'}</button>
  </form>;
}

export default function LessonPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('episode');
  const lesson = lessonBySessionId(sessionId);
  const { activeProfileId } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const storageKey = `spelling-lesson-v2:${activeProfileId}:${sessionId}`;
  const [state, setState] = useState(() => readJson(storageKey, createLessonState()));
  const [helped, setHelped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const stateOwnerKey = useRef(storageKey);
  useEffect(() => {
    if (stateOwnerKey.current === storageKey) writeJson(storageKey, state);
  }, [storageKey, state]);
  useEffect(() => {
    if (stateOwnerKey.current === storageKey) return;
    stateOwnerKey.current = storageKey;
    setState(readJson(storageKey, createLessonState()));
    setHelped(false);
    setSubmitting(false);
    submittingRef.current = false;
  }, [storageKey]);
  const item = useMemo(() => lesson ? currentLessonItem(state, lesson) : null, [state, lesson]);

  if (!lesson) return <div className={styles.page}><section className={styles.card}><h1>Lesson not found</h1><Link className={styles.primary} to="/case">Return to the case</Link></section></div>;

  const answer = async (response, metadata = {}) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const sourceStage = state.stage === 'repair' ? state.repairSource : state.stage;
    const isTransfer = sourceStage === 'transfer';
    const assisted = helped || state.stage === 'repair';
    try {
      const { attempt, evaluation } = await submitAttempt(item, response, { sessionId, unseen: isTransfer, evidenceType: metadata.omitted ? 'omission' : assisted ? 'assisted_repair' : isTransfer ? 'independent_transfer' : 'independent_choice', helped: assisted, ...metadata });
      setState((current) => ({ ...submitLessonResult(current, evaluation.correct, metadata), evidenceIds: [...(current.evidenceIds || []), attempt.attemptId] }));
      setHelped(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const revealAndContinue = async () => {
    const response = item.acceptedAnswers?.[0] ?? null;
    const { attempt } = await submitAttempt(item, response, { sessionId, unseen: state.repairSource === 'transfer', evidenceType: 'revealed_solution', helped: true, revealed: true });
    setState((current) => ({ ...acceptWorkedSolution(current, lesson.practice.length, lesson.transfer.length), evidenceIds: [...(current.evidenceIds || []), attempt.attemptId] }));
  };

  const finish = (reflection) => {
    const completed = completeReflection(state, reflection);
    setState(completed);
    writeJson(`spelling-lesson-complete:${activeProfileId}:${sessionId}`, { sessionId, episodeId, completedAt: new Date().toISOString(), evidenceIds: completed.evidenceIds || [], reflection });
  };

  const completedTasks = state.practiceIndex + (state.stage === 'teach' ? 0 : 1) + (state.stage === 'transfer' || state.stage === 'reflection' || state.stage === 'complete' ? state.transferIndex + 1 : 0);
  const totalTasks = lesson.practice.length + lesson.transfer.length;
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{DRAFT_NOTICE}</p>
    <div className={styles.progress} aria-label={`${Math.min(completedTasks, totalTasks)} of ${totalTasks} lesson tasks reached`}><span style={{ width: `${Math.min(100, (completedTasks / totalTasks) * 100)}%` }} /></div>
    <section className={styles.card}>
      <p className={styles.meta}>{lesson.skillId} · {saveStatus}</p><h1>{lesson.title}</h1>
      {state.stage === 'teach' && <><h2>Learn the rule</h2><p>{lesson.rule}</p>{lesson.examples.map((example) => <div className={styles.feedback} key={example.id}><strong>{example.prompt}</strong><p>{example.explanation}</p></div>)}<button className={styles.primary} onClick={() => setState(startLesson(state))}>Start six independent questions</button></>}
      {['attempt', 'repair', 'transfer'].includes(state.stage) && <><h2>{state.stage === 'repair' ? 'Guided repair' : state.stage === 'transfer' ? `Unseen transfer ${state.transferIndex + 1} of ${lesson.transfer.length}` : `Independent question ${state.practiceIndex + 1} of ${lesson.practice.length}`}</h2>{state.stage === 'repair' && <p>Your first answer is preserved. This correction is recorded separately as assisted.</p>}<Question key={`${state.stage}-${item.id}-${state.retryCount}`} item={item} onAnswer={answer} busy={submitting} /><div className={styles.actions}>{!helped && <button className={styles.secondary} disabled={submitting} onClick={() => setHelped(true)}>Show help</button>}<button className={styles.secondary} disabled={submitting} onClick={() => answer(null, { omitted: true })}>I don’t know yet</button><Link className={styles.secondary} to="/case">Pause and return to the case</Link></div>{helped && <div className={styles.feedback}><strong>Help used</strong>{item.helpSteps.map((step) => <p key={step}>{step}</p>)}<p>This response will be excluded from independent mastery evidence.</p></div>}</>}
      {state.stage === 'feedback' && <><div className={styles.feedback}><h2>{state.lastResult.correct ? 'Correct' : state.lastResult.omitted ? 'Not answered yet' : 'Not yet'}</h2><p>{state.lastResult.omitted ? 'This item remains unresolved. Use the guided repair before moving on.' : item.explanation}</p></div><button className={styles.primary} onClick={() => setState(continueLesson(state, lesson.practice.length, lesson.transfer.length))}>{state.lastResult.correct ? 'Continue' : state.retryCount >= 2 ? 'See worked solution' : 'Repair this answer'}</button></>}
      {state.stage === 'worked_solution' && <><h2>Worked solution</h2><p><strong>Accepted answer:</strong> {item.choices?.find((choice) => choice.id === item.acceptedAnswers?.[0])?.text || item.acceptedAnswers?.[0]}</p><p>{item.explanation}</p><button className={styles.primary} onClick={revealAndContinue}>I understand; continue</button></>}
      {state.stage === 'reflection' && <><h2>Reflect</h2><p>Choose the statement that best describes what you used.</p>{lesson.reflectionChoices.map((choice) => <button className={styles.choice} key={choice} onClick={() => finish(choice)}>{choice}</button>)}</>}
      {state.stage === 'complete' && <><div className={styles.success}><h2>Lesson complete</h2><p>All required practice and transfer tasks were resolved. Draft evidence remains excluded from mastery.</p></div><div className={styles.actions}><Link className={styles.primary} to="/case">Return to the case</Link><Link className={styles.secondary} to="/progress">View skill evidence</Link><button className={styles.secondary} onClick={() => { const fresh = createLessonState(); setState(fresh); writeJson(storageKey, fresh); }}>Restart draft lesson</button></div></>}
    </section>
  </div>;
}
