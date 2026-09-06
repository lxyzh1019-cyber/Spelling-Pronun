import { Link } from 'react-router-dom';
import { useLearning } from '../context/LearningProvider';
import styles from './Learning.module.css';

export default function ReviewPage() {
  const { attempts } = useLearning();
  const recent = attempts.slice(-8).reverse();
  return <div className={styles.page}><section className={styles.card}><h1>Practise again</h1><p>The scheduler will place reviewed skills here at 1, 3, 7, 14, and 30 days. Engineering fixtures are excluded from due mastery reviews.</p>{recent.length ? <><h2>Recent preview attempts</h2>{recent.map((attempt) => <p key={attempt.attemptId}><strong>{attempt.skillIds[0]}</strong>: {attempt.correct ? 'correct' : 'needs repair'} <span className={styles.meta}>({attempt.contentStatus})</span></p>)}</> : <p>No attempts have been saved for this learner yet.</p>}<Link className={styles.primary} to="/case">Continue my case</Link></section></div>;
}
