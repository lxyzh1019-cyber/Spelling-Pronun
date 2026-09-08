import { useLearning } from '../context/LearningProvider';
import styles from './Learning.module.css';

export default function ProgressPage() {
  const { skills, masteryBySkill, attempts } = useLearning();
  const pendingCount = attempts.filter((attempt) => attempt.status === 'pending' && !attempt.omitted && !attempt.technicalFailure).length;
  return <div className={styles.page}><section className={styles.card}><h1>My progress</h1><p>Progress is reported skill by skill. Unreviewed fixture attempts are visible for transparency but excluded from mastery.</p>{pendingCount > 0 && <p className={styles.notice} role="status">{pendingCount} answer{pendingCount === 1 ? ' is' : 's are'} pending review. Pending answers are not counted as right or wrong.</p>}<div className={styles.grid}>{skills.map((skill) => { const mastery = masteryBySkill[skill.id]; const reviewFlag = mastery?.needsReview ? ' · needs review' : ''; const count = attempts.filter((attempt) => attempt.skillIds.includes(skill.id)).length; return <article className={styles.skill} key={skill.id}><h2>{skill.id}</h2><p className={styles.meta}>{skill.track}</p><p><strong>{mastery?.status || 'not_started'}</strong>{reviewFlag}</p><p>{count} recorded attempt{count === 1 ? '' : 's'} ({attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && attempt.contentStatus !== 'not_reviewed').length} eligible for mastery)</p></article>; })}</div></section></div>;
}
