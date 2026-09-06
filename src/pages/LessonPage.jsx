import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { lessonBySessionId } from '../data/lessonCatalog';
import { acceptWorkedSolution, completeReflection, continueLesson, createLessonState, currentLessonItem, startLesson, submitLessonResult } from '../learning/lessonFlow';
import { useDurableSession } from '../hooks/useDurableSession';
import { writeJson } from '../utils/localStore';
import styles from './Learning.module.css';

const DRAFT_NOTICE = 'Draft C0 preview: these items meet the planned structure but have not completed independent educational and source review. Their attempts cannot affect mastery.';

function Question({ item, onAnswer, busy }) {
  const [answer, setAnswer] = useState('');
  return <form onSubmit={(event) => { event.preventDefault(); if (answer) onAnswer(answer); }}>
    <p>{item.prompt}</p>
    {item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name={item.id} value={choice.id} checked={answer === choice.id} disabled={busy} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}
    {!item.choices && <textarea className={styles.input} aria-label="Your answer" value={answer} disabled={busy} onChange={(event) => setAnswer(event.target.value)} />}
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
  const { state, setState, ready, writable, canWrite, takeOverHere: takeOverSession, ownerKeyRef: stateOwnerKey, sessionSaveStatus } = useDurableSession({
    storageKey,
    learnerId: activeProfileId,
    mode: 'lesson',
    contentVersion: lesson?.version || 0,
    orderedItemIds: lesson ? [...lesson.practice, ...lesson.transfer].map((entry) => entry.id) : [],
    initialState: createLessonState,
  });
  const [helped, setHelped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    setHelped(false);
    setSubmitting(false);
    submittingRef.current = false;
  }, [storageKey]);
  const item = useMemo(() => lesson ? currentLessonItem(state, lesson) : null, [state, lesson]);

  if (!lesson) return <div className={styles.page}><section className={styles.card}><h1>Lesson not found</h1><Link className={styles.primary} to="/case">Return to the case</Link></section></div>;

  const answer = async (response, metadata = {}) => {
    if (submittingRef.current || !canWrite()) return;
    const submissionOwnerKey = storageKey;
    const submissionState = state;
    submittingRef.current = true;
    setSubmitting(true);
    const sourceStage = state.stage === 'repair' ? state.repairSource : state.stage;
    const isTransfer = sourceStage === 'transfer';
    const assisted = helped || state.stage === 'repair';
    try {
      const { attempt, evaluation } = await submitAttempt(item, response, { sessionId, unseen: isTransfer, evidenceType: metadata.omitted ? 'omission' : assisted ? 'assisted_repair' : isTransfer ? 'independent_transfer' : 'independent_choice', helped: assisted, ...metadata });
      const nextState = { ...submitLessonResult(submissionState, evaluation.correct, metadata), evidenceIds: [...(submissionState.evidenceIds || []), attempt.attemptId] };
      if (stateOwnerKey.current === submissionOwnerKey && canWrite()) {
        setState(nextState);
        setHelped(false);
      }
    } finally {
      if (stateOwnerKey.current === submissionOwnerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const revealAndContinue = async () => {
    if (submittingRef.current || !canWrite()) return;
    const submissionOwnerKey = storageKey;
    const submissionState = state;
    submittingRef.current = true;
    setSubmitting(true);
    const response = item.acceptedAnswers?.[0] ?? null;
    try {
      const { attempt } = await submitAttempt(item, response, { sessionId, unseen: submissionState.repairSource === 'transfer', evidenceType: 'revealed_solution', helped: true, revealed: true });
      const nextState = { ...acceptWorkedSolution(submissionState, lesson.practice.length, lesson.transfer.length), evidenceIds: [...(submissionState.evidenceIds || []), attempt.attemptId] };
      if (stateOwnerKey.current === submissionOwnerKey && canWrite()) {
        setState(nextState);
      }
    } finally {
      if (stateOwnerKey.current === submissionOwnerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const finish = (reflection) => {
    if (!canWrite()) return;
    const completed = completeReflection(state, reflection);
    setState(completed);
    writeJson(`spelling-lesson-complete:${activeProfileId}:${sessionId}`, { sessionId, episodeId, completedAt: new Date().toISOString(), evidenceIds: completed.evidenceIds || [], reflection });
  };

  const takeOverHere = () => {
    setHelped(false);
    setSubmitting(false);
    submittingRef.current = false;
    takeOverSession();
  };

  const completedTasks = state.practiceIndex + (state.stage === 'teach' ? 0 : 1) + (state.stage === 'transfer' || state.stage === 'reflection' || state.stage === 'complete' ? state.transferIndex + 1 : 0);
  const totalTasks = lesson.practice.length + lesson.transfer.length;
  const displayedSaveStatus = saveStatus === 'saved' ? sessionSaveStatus : saveStatus;
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{DRAFT_NOTICE}</p>
    {!ready ? <div className={styles.notice} role="status">Restoring the saved lesson…</div> : !writable && <div className={styles.notice} role="status"><strong>This lesson is open in another tab.</strong> This view is read-only. <button className={styles.secondary} type="button" onClick={takeOverHere}>Take over here</button></div>}
    <div className={styles.progress} aria-label={`${Math.min(completedTasks, totalTasks)} of ${totalTasks} lesson tasks reached`}><span style={{ width: `${Math.min(100, (completedTasks / totalTasks) * 100)}%` }} /></div>
    <section className={styles.card}>
      <p className={styles.meta}>{lesson.skillId} · {displayedSaveStatus}</p><h1>{lesson.title}</h1>
      {state.stage === 'teach' && <><h2>Learn the rule</h2><p>{lesson.rule}</p>{lesson.examples.map((example) => <div className={styles.feedback} key={example.id}><strong>{example.prompt}</strong><p>{example.explanation}</p></div>)}<button className={styles.primary} disabled={!writable} onClick={() => { if (canWrite()) setState(startLesson(state)); }}>Start six independent questions</button></>}
      {['attempt', 'repair', 'transfer'].includes(state.stage) && <><h2>{state.stage === 'repair' ? 'Guided repair' : state.stage === 'transfer' ? `Unseen transfer ${state.transferIndex + 1} of ${lesson.transfer.length}` : `Independent question ${state.practiceIndex + 1} of ${lesson.practice.length}`}</h2>{state.stage === 'repair' && <p>Your first answer is preserved. This correction is recorded separately as assisted.</p>}<Question key={`${state.stage}-${item.id}-${state.retryCount}`} item={item} onAnswer={answer} busy={submitting || !writable} /><div className={styles.actions}>{!helped && <button className={styles.secondary} disabled={submitting || !writable} onClick={() => { if (canWrite()) setHelped(true); }}>Show help</button>}<button className={styles.secondary} disabled={submitting || !writable} onClick={() => answer(null, { omitted: true })}>I don’t know yet</button><Link className={styles.secondary} to="/case">Pause and return to the case</Link></div>{helped && <div className={styles.feedback}><strong>Help used</strong>{item.helpSteps.map((step) => <p key={step}>{step}</p>)}<p>This response will be excluded from independent mastery evidence.</p></div>}</>}
      {state.stage === 'feedback' && <><div className={styles.feedback}><h2>{state.lastResult.correct ? 'Correct' : state.lastResult.omitted ? 'Not answered yet' : 'Not yet'}</h2><p>{state.lastResult.omitted ? 'This item remains unresolved. Use the guided repair before moving on.' : item.explanation}</p></div><button className={styles.primary} disabled={!writable} onClick={() => { if (canWrite()) setState(continueLesson(state, lesson.practice.length, lesson.transfer.length)); }}>{state.lastResult.correct ? 'Continue' : state.retryCount >= 2 ? 'See worked solution' : 'Repair this answer'}</button></>}
      {state.stage === 'worked_solution' && <><h2>Worked solution</h2><p><strong>Accepted answer:</strong> {item.choices?.find((choice) => choice.id === item.acceptedAnswers?.[0])?.text || item.acceptedAnswers?.[0]}</p><p>{item.explanation}</p><button className={styles.primary} disabled={submitting || !writable} onClick={revealAndContinue}>I understand; continue</button></>}
      {state.stage === 'reflection' && <><h2>Reflect</h2><p>Choose the statement that best describes what you used.</p>{lesson.reflectionChoices.map((choice) => <button className={styles.choice} key={choice} disabled={!writable} onClick={() => finish(choice)}>{choice}</button>)}</>}
      {state.stage === 'complete' && <><div className={styles.success}><h2>Lesson complete</h2><p>All required practice and transfer tasks were resolved. Draft evidence remains excluded from mastery.</p></div><div className={styles.actions}><Link className={styles.primary} to="/case">Return to the case</Link><Link className={styles.secondary} to="/progress">View skill evidence</Link><button className={styles.secondary} disabled={!writable} onClick={() => { if (!canWrite()) return; setState(createLessonState()); }}>Restart draft lesson</button></div></>}
    </section>
  </div>;
}
