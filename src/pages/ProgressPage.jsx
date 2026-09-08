import { useLearning } from '../context/LearningProvider';
import { summarizeSkillEvidence } from '../learning/mastery';
import styles from './Learning.module.css';

export default function ProgressPage() {
  const { skills, masteryBySkill, pilotMasteryBySkill, pilotScopeIds, attempts } = useLearning();
  const pilotMode = pilotScopeIds.length > 0;
  const pendingCount = attempts.filter((attempt) => attempt.status === 'pending' && !attempt.omitted && !attempt.technicalFailure).length;
  return <div className={styles.page}><section className={styles.card}><h1>My progress</h1><p>Progress is reported skill by skill. Only attempts on released content count toward mastery. Practice on preview or pilot content, helped answers, repeats, and pending answers are shown for transparency but are not counted.</p>{pendingCount > 0 && <p className={styles.notice} role="status">{pendingCount} answer{pendingCount === 1 ? ' is' : 's are'} pending review. Pending answers are not counted as right or wrong.</p>}<div className={styles.grid}>{skills.map((skill) => { const mastery = masteryBySkill[skill.id]; const reviewFlag = mastery?.needsReview ? ' · needs review' : ''; const evidence = summarizeSkillEvidence(attempts.filter((attempt) => attempt.skillIds.includes(skill.id))); return <article className={styles.skill} key={skill.id}><h2>{skill.id}</h2><p className={styles.meta}>{skill.track}</p><p><strong>{mastery?.status || 'not_started'}</strong>{reviewFlag}</p>{pilotMode && pilotMasteryBySkill?.[skill.id]?.eligibleCount > 0 && <p className={styles.meta}>Pilot record: {pilotMasteryBySkill[skill.id].status} (pilot evidence only, not validated progress)</p>}<p>{evidence.recorded} recorded attempt{evidence.recorded === 1 ? '' : 's'}: {evidence.released} count toward mastery{evidence.pilot > 0 ? `, ${evidence.pilot} pilot evidence` : ''}{evidence.notCounted > 0 ? `, ${evidence.notCounted} not counted` : ''}</p></article>; })}</div></section></div>;
}
