import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { lessonBySessionId } from '../data/lessonCatalog';
import { DEFAULT_LESSON_MINUTES, LESSON_MINUTE_OPTIONS, acceptWorkedSolution, completeReflection, completedLessonTasks, continueLesson, createLessonState, currentLessonItem, evidenceTypeForLesson, lessonAssistanceFor, lessonContinueLabel, lessonFeedbackHeading, lessonResumeRecap, normalizeLessonMinutes, startLesson, submitLessonResult } from '../learning/lessonFlow';
import { useDurableSession } from '../hooks/useDurableSession';
import { lessonMinutesStorageKey, readJson, writeJson } from '../utils/localStore';
import styles from './Learning.module.css';

const DRAFT_NOTICE = 'Integrated C0 preview: these items completed challenge, educational/source review, and app integration, but not learner testing or release. Their attempts cannot affect mastery.';

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
  const { activeProfileId, user } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const storageKey = `spelling-lesson-v2:${activeProfileId}:${sessionId}`;
  const { state, setState, ready, writable, canWrite, takeOverHere: takeOverSession, ownerKeyRef: stateOwnerKey, sessionSaveStatus } = useDurableSession({
    storageKey,
    learnerId: activeProfileId,
    mode: 'lesson',
    contentVersion: lesson?.version || 0,
    orderedItemIds: lesson ? [...lesson.practice, ...lesson.transfer].map((entry) => entry.id) : [],
    initialState: createLessonState,
    account: user,
  });
  const [helped, setHelped] = useState(false);
  const [helpRung, setHelpRung] = useState(0);
  const [showChinese, setShowChinese] = useState(false);
  const [reflectionNote, setReflectionNote] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(() => normalizeLessonMinutes(readJson(lessonMinutesStorageKey(activeProfileId), DEFAULT_LESSON_MINUTES)));
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    setHelped(false);
    setHelpRung(0);
    setReflectionNote('');
    setSubmitting(false);
    submittingRef.current = false;
    setTargetMinutes(normalizeLessonMinutes(readJson(lessonMinutesStorageKey(activeProfileId), DEFAULT_LESSON_MINUTES)));
  }, [storageKey, activeProfileId]);
  useEffect(() => { setHelpRung(0); }, [state.stage, state.practiceIndex, state.transferIndex, state.retryCount]);
  // The recap is captured once, when a saved session is restored, so it describes the resume
  // point rather than tracking every answer in the current visit.
  const [resumeRecap, setResumeRecap] = useState(null);
  useEffect(() => { setResumeRecap(null); }, [storageKey]);
  useEffect(() => {
    if (ready && lesson) setResumeRecap((current) => current ?? lessonResumeRecap(state, lesson.practice.length, lesson.transfer.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storageKey]);
  const chooseMinutes = (minutes) => {
    const normalized = normalizeLessonMinutes(minutes);
    setTargetMinutes(normalized);
    writeJson(lessonMinutesStorageKey(activeProfileId), normalized);
  };
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
    const assisted = lessonAssistanceFor({ stage: state.stage, helped });
    try {
      const { attempt, evaluation } = await submitAttempt(item, response, { sessionId, unseen: isTransfer, evidenceType: evidenceTypeForLesson({ stage: state.stage, repairSource: state.repairSource, helped, ...metadata }), helped: assisted, ...metadata });
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
    const completed = completeReflection(state, reflection, reflectionNote);
    setState(completed);
    writeJson(`spelling-lesson-complete:${activeProfileId}:${sessionId}`, { sessionId, contentVersion: lesson.version, episodeId, completedAt: new Date().toISOString(), evidenceIds: completed.evidenceIds || [], reflection, ...(completed.reflectionNote ? { reflectionNote: completed.reflectionNote } : {}) });
  };

  const takeOverHere = () => {
    setHelped(false);
    setSubmitting(false);
    submittingRef.current = false;
    takeOverSession();
  };

  const completedTasks = completedLessonTasks(state, lesson.practice.length, lesson.transfer.length);
  const totalTasks = lesson.practice.length + lesson.transfer.length;
  const durationGuidance = `About ${targetMinutes} active minutes is the guide for this lesson. You can pause at any question and continue another day; time never marks an answer wrong.`;
  const displayedSaveStatus = saveStatus === 'saved' ? sessionSaveStatus : saveStatus;
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{DRAFT_NOTICE}</p>
    {!ready ? <div className={styles.notice} role="status">Restoring the saved lesson…</div> : !writable && <div className={styles.notice} role="status"><strong>This lesson is open in another tab or linked device.</strong> This view is read-only. <button className={styles.secondary} type="button" onClick={takeOverHere}>Take over here</button></div>}
    {resumeRecap && state.stage !== 'complete' && <p className={styles.feedback} role="status">{resumeRecap}</p>}
    <div className={styles.progress} aria-label={`${Math.min(completedTasks, totalTasks)} of ${totalTasks} lesson tasks completed`}><span style={{ width: `${Math.min(100, (completedTasks / totalTasks) * 100)}%` }} /></div>
    <section className={styles.card}>
      <p className={styles.meta}>{lesson.skillId} · {displayedSaveStatus}</p><h1>{lesson.title}</h1>
      {state.stage === 'teach' && <><h2>Learn the rule</h2><p>{lesson.rule}</p>{lesson.ruleHelpZh && <div className={styles.actions}><button className={styles.secondary} type="button" aria-pressed={showChinese} onClick={() => setShowChinese((current) => !current)}>{showChinese ? '隐藏中文提示' : '中文提示'}</button></div>}{lesson.ruleHelpZh && showChinese && <p className={styles.feedback} lang="zh">{lesson.ruleHelpZh}</p>}{lesson.examples.map((example) => <div className={styles.feedback} key={example.id}><strong>{example.prompt}</strong><p>{example.explanation}</p></div>)}<fieldset className={styles.fieldset}><legend>Lesson length (guidance only)</legend><div className={styles.actions}>{LESSON_MINUTE_OPTIONS.map((minutes) => <button className={minutes === targetMinutes ? styles.primary : styles.secondary} type="button" key={minutes} aria-pressed={minutes === targetMinutes} onClick={() => chooseMinutes(minutes)}>{minutes} min</button>)}</div><p className={styles.meta}>{durationGuidance}</p></fieldset><button className={styles.primary} disabled={!writable} onClick={() => { if (canWrite()) setState(startLesson(state)); }}>Start six independent questions</button></>}
      {['attempt', 'repair', 'transfer'].includes(state.stage) && <><h2>{state.stage === 'repair' ? 'Guided repair' : state.stage === 'transfer' ? `Unseen transfer ${state.transferIndex + 1} of ${lesson.transfer.length}` : `Independent question ${state.practiceIndex + 1} of ${lesson.practice.length}`}</h2>{state.stage === 'repair' && <p>Your first answer is preserved. This correction is recorded separately as assisted.</p>}<Question key={`${state.stage}-${item.id}-${state.retryCount}`} item={item} onAnswer={answer} busy={submitting || !writable} /><div className={styles.actions}>{!helped && <button className={styles.secondary} disabled={submitting || !writable} onClick={() => { if (canWrite()) { setHelped(true); setHelpRung(1); } }}>Show help</button>}<button className={styles.secondary} disabled={submitting || !writable} onClick={() => answer(null, { omitted: true })}>I don’t know yet</button>{(item.spokenText || item.responseType === 'recording') && <button className={styles.secondary} disabled={submitting || !writable} onClick={() => answer(null, { technicalFailure: true })}>Audio or microphone did not work</button>}<Link className={styles.secondary} to="/case">Pause and return to the case</Link></div><p className={styles.meta}>{durationGuidance}</p>{helped && <div className={styles.feedback}><strong>Help used</strong>{item.helpSteps.slice(0, Math.max(1, helpRung)).map((step, index) => <p key={step}>Step {index + 1}: {step}</p>)}{helpRung < item.helpSteps.length && <button className={styles.secondary} type="button" disabled={submitting || !writable} onClick={() => setHelpRung((current) => Math.min(item.helpSteps.length, current + 1))}>More help</button>}<p>This response will be excluded from independent mastery evidence.</p></div>}</>}
      {state.stage === 'feedback' && <><div className={styles.feedback}><h2>{lessonFeedbackHeading(state.lastResult)}</h2><p>{state.lastResult.technicalFailure ? 'This was recorded as a technical issue, not a wrong answer. It is deferred and can be retried in a later review.' : state.lastResult.omitted ? 'This item remains unresolved. Use the guided repair before moving on.' : item.explanation}</p></div><button className={styles.primary} disabled={!writable} onClick={() => { if (canWrite()) setState(continueLesson(state, lesson.practice.length, lesson.transfer.length)); }}>{lessonContinueLabel(state)}</button></>}
      {state.stage === 'worked_solution' && <><h2>Worked solution</h2><p><strong>Accepted answer:</strong> {item.choices?.find((choice) => choice.id === item.acceptedAnswers?.[0])?.text || item.acceptedAnswers?.[0]}</p><p>{item.explanation}</p><button className={styles.primary} disabled={submitting || !writable} onClick={revealAndContinue}>I understand; continue</button></>}
      {state.stage === 'reflection' && <><h2>Reflect</h2><p>Choose the statement that best describes what you used. Adding a short note is optional.</p><label className={styles.meta}>Optional note (one sentence is plenty)<textarea className={styles.input} maxLength={280} value={reflectionNote} disabled={!writable} onChange={(event) => setReflectionNote(event.target.value)} /></label>{lesson.reflectionChoices.map((choice) => <button className={styles.choice} key={choice} disabled={!writable} onClick={() => finish(choice)}>{choice}</button>)}</>}
      {state.stage === 'complete' && <><div className={styles.success}><h2>Lesson complete</h2><p>All required practice and transfer tasks were resolved. Draft evidence remains excluded from mastery.</p></div><div className={styles.actions}><Link className={styles.primary} to="/case">Return to the case</Link><Link className={styles.secondary} to="/progress">View skill evidence</Link><button className={styles.secondary} disabled={!writable} onClick={() => { if (!canWrite()) return; setState(createLessonState()); }}>Restart draft lesson</button></div></>}
    </section>
  </div>;
}
