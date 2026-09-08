import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { c0PilotPacks } from '../data/packs.c0.draft';
import { advanceReviewSession, buildReviewQueue, createReviewSession, recordReviewResult, resolveReviewItem } from '../learning/reviewQueue';
import { useDurableSession } from '../hooks/useDurableSession';
import styles from './Learning.module.css';

const REVIEW_CONTENT_VERSION = c0PilotPacks.map((pack) => `${pack.id}@${pack.version}`).sort().join('|');
const REVIEW_ITEM_IDS = c0PilotPacks.flatMap((pack) => pack.items.map((item) => item.id));

function ReviewQuestion({ item, answer, setAnswer, disabled }) {
  return <>
    <p>{item.prompt}</p>
    {item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name={item.id} checked={answer === choice.id} disabled={disabled} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}
    {!item.choices && <textarea className={styles.input} aria-label="Your review answer" value={answer} disabled={disabled} onChange={(event) => setAnswer(event.target.value)} />}
  </>;
}

export default function ReviewPage() {
  const { activeProfileId, user } = useWords();
  const { attempts, dueReviews, reviewProgress, submitAttempt, saveStatus } = useLearning();
  const recent = attempts.slice(-8).reverse();
  const available = useMemo(() => buildReviewQueue(dueReviews, c0PilotPacks), [dueReviews]);
  const storageKey = `spelling-review-session:${activeProfileId}`;
  const { state: session, setState: setSession, ready, writable, canWrite, takeOverHere: takeOverSession, ownerKeyRef, sessionSaveStatus } = useDurableSession({
    storageKey,
    learnerId: activeProfileId,
    mode: 'review',
    contentVersion: REVIEW_CONTENT_VERSION,
    orderedItemIds: REVIEW_ITEM_IDS,
    initialState: createReviewSession,
    account: user,
  });
  const [answer, setAnswer] = useState('');
  const [helped, setHelped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setAnswer('');
    setHelped(false);
    setSubmitting(false);
    submittingRef.current = false;
  }, [storageKey]);

  const item = resolveReviewItem(session, c0PilotPacks);
  const entry = session.entries?.[session.index];
  const persist = (next, ownerKey = storageKey) => {
    if (ownerKey !== ownerKeyRef.current || !canWrite()) return false;
    setSession(next);
    return true;
  };

  const submit = async (metadata = {}) => {
    if (!item || submittingRef.current || !canWrite() || (!answer && !metadata.omitted)) return;
    const ownerKey = storageKey;
    const sourceSession = session;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { attempt, evaluation } = await submitAttempt(item, metadata.omitted ? null : answer, {
        sessionId: `review-${activeProfileId}`,
        evidenceType: metadata.omitted ? 'omission' : 'delayed_review',
        unseen: true,
        helped,
        ...metadata,
      });
      const next = recordReviewResult(sourceSession, {
        attemptId: attempt.attemptId,
        correct: evaluation.correct,
        status: attempt.status,
        omitted: attempt.omitted,
        helped: attempt.helped,
      });
      const saved = persist({ ...next, evidenceIds: [...(sourceSession.evidenceIds || []), attempt.attemptId] }, ownerKey);
      if (saved) {
        setAnswer('');
        setHelped(false);
      }
    } finally {
      if (ownerKeyRef.current === ownerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const continueAfterFeedback = async () => {
    if (!item || submittingRef.current || !canWrite()) return;
    const ownerKey = storageKey;
    const sourceSession = session;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      let evidenceIds = sourceSession.evidenceIds || [];
      if (!sourceSession.lastResult?.correct) {
        const { attempt } = await submitAttempt(item, item.acceptedAnswers?.[0] ?? null, {
          sessionId: `review-${activeProfileId}`,
          evidenceType: 'revealed_solution',
          unseen: false,
          helped: true,
          revealed: true,
        });
        evidenceIds = [...evidenceIds, attempt.attemptId];
      }
      persist({ ...advanceReviewSession(sourceSession), evidenceIds }, ownerKey);
    } finally {
      if (ownerKeyRef.current === ownerKey) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const takeOverHere = () => {
    setAnswer(''); setHelped(false); setSubmitting(false); submittingRef.current = false;
    takeOverSession();
  };

  const accepted = item?.choices?.find((choice) => choice.id === item.acceptedAnswers?.[0])?.text || item?.acceptedAnswers?.[0];
  const displayedSaveStatus = saveStatus === 'saved' ? sessionSaveStatus : saveStatus;
  return <div className={styles.page}>{!ready ? <div className={styles.notice} role="status">Restoring the saved review…</div> : !writable && <div className={styles.notice} role="status"><strong>This review is open in another tab or linked device.</strong> This view is read-only. <button className={styles.secondary} type="button" onClick={takeOverHere}>Take over here</button></div>}<section className={styles.card}>
    <h1>Practise again</h1>
    <p>Reviewed skills return after 1, 3, 7, 14, and 30 days. Older overdue work and recent errors come first, with at most four independently reviewed items. Draft content is never admitted to this mastery queue.</p>
    {session.stage === 'idle' && <>{available.length ? <><p>{available.length} reviewed item{available.length === 1 ? ' is' : 's are'} due now.</p><button className={styles.primary} disabled={!writable} onClick={() => persist(createReviewSession(available))}>Start due review</button></> : <p>No independently reviewed skill is due now.</p>}</>}
    {session.stage === 'attempt' && item && <>
      <p className={styles.meta}>Review {session.index + 1} of {session.entries.length} · {entry.skillId} · {displayedSaveStatus}</p>
      <h2>Try this without looking back</h2>
      <ReviewQuestion item={item} answer={answer} setAnswer={setAnswer} disabled={submitting || !writable} />
      {helped && <div className={styles.feedback}><strong>Help used</strong>{item.helpSteps.map((step) => <p key={step}>{step}</p>)}<p>This attempt will not advance independent review.</p></div>}
      <div className={styles.actions}><button className={styles.primary} disabled={!answer || submitting || !writable} onClick={() => submit()}>{submitting ? 'Saving…' : 'Save review answer'}</button><button className={styles.secondary} disabled={submitting || helped || !writable} onClick={() => { if (canWrite()) setHelped(true); }}>Show help</button><button className={styles.secondary} disabled={submitting || !writable} onClick={() => submit({ omitted: true })}>I don’t know yet</button><Link className={styles.secondary} to="/">Pause review</Link></div>
    </>}
    {session.stage === 'feedback' && item && <><div className={styles.feedback}><h2>{session.lastResult.correct ? 'Correct' : session.lastResult.omitted ? 'Not answered yet' : session.lastResult.status === 'pending' ? 'Pending review' : 'Review the rule'}</h2><p>{item.explanation}</p>{!session.lastResult.correct && accepted && <p><strong>Accepted answer:</strong> {accepted}</p>}</div><button className={styles.primary} disabled={submitting || !writable} onClick={continueAfterFeedback}>{submitting ? 'Saving teaching step…' : session.index + 1 < session.entries.length ? 'Continue review' : 'Finish review'}</button></>}
    {session.stage === 'complete' && <><div className={styles.success}><h2>Review complete</h2><p>{session.entries.length} due item{session.entries.length === 1 ? '' : 's'} resolved. Independent successes advance the schedule; helped, omitted, or revealed work returns after teaching.</p></div><button className={styles.secondary} disabled={!writable} onClick={() => persist(createReviewSession())}>Close this review</button></>}
    {['attempt', 'feedback'].includes(session.stage) && !item && <div className={styles.feedback}><h2>Saved review content is unavailable</h2><p>The pinned item version was not found, so no answer or score was invented. Return after the reviewed content version is restored.</p></div>}
    {Object.keys(reviewProgress).length > dueReviews.length && <p className={styles.meta}>{Object.keys(reviewProgress).length - dueReviews.length} reviewed skill(s) are scheduled for later.</p>}
    {recent.length ? <><h2>Recent attempts</h2>{recent.map((attempt) => <p key={attempt.attemptId}><strong>{attempt.skillIds[0]}</strong>: {attempt.omitted ? 'not answered yet' : attempt.correct ? 'correct' : attempt.status === 'pending' ? 'pending review' : 'needs repair'} <span className={styles.meta}>({attempt.contentStatus})</span></p>)}</> : <p>No attempts have been saved for this learner yet.</p>}
    <Link className={styles.primary} to="/case">Continue my case</Link>
  </section></div>;
}
