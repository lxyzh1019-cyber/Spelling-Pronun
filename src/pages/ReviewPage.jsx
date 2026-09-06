import { Link } from 'react-router-dom';
import { useLearning } from '../context/LearningProvider';
import styles from './Learning.module.css';

export default function ReviewPage() {
  const { attempts, dueReviews, reviewProgress } = useLearning();
  const recent = attempts.slice(-8).reverse();
  return <div className={styles.page}><section className={styles.card}><h1>Practise again</h1><p>Reviewed skills return after 1, 3, 7, 14, and 30 days. Older overdue work and recent errors come first, with at most four items at lesson start. Engineering fixtures are excluded from this mastery queue.</p>{dueReviews.length ? <><h2>Due now</h2>{dueReviews.map((entry) => <p key={entry.skillId}><strong>{entry.skillId}</strong> — due {new Date(entry.reviewDue).toLocaleDateString('en-CA')}</p>)}</> : <p>No reviewed skill is due now.</p>}{Object.keys(reviewProgress).length > dueReviews.length && <p className={styles.meta}>{Object.keys(reviewProgress).length - dueReviews.length} reviewed skill(s) are scheduled for later.</p>}{recent.length ? <><h2>Recent preview attempts</h2>{recent.map((attempt) => <p key={attempt.attemptId}><strong>{attempt.skillIds[0]}</strong>: {attempt.omitted ? 'not answered yet' : attempt.correct ? 'correct' : 'needs repair'} <span className={styles.meta}>({attempt.contentStatus})</span></p>)}</> : <p>No attempts have been saved for this learner yet.</p>}<Link className={styles.primary} to="/case">Continue my case</Link></section></div>;
}
