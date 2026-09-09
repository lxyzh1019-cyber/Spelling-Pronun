import { useLearning } from '../context/LearningProvider';
import { buildProgressView } from '../learning/mastery';
import styles from './Learning.module.css';

export default function ProgressPage() {
  const { skills, masteryBySkill, pilotMasteryBySkill, pilotScopeIds, attempts } = useLearning();
  const view = buildProgressView({ skills, attempts, masteryBySkill, pilotMasteryBySkill, pilotScopeIds });
  return <div className={styles.page}><section className={styles.card}><h1>My progress</h1><p>Progress is reported skill by skill. Only attempts on released content count toward mastery. Practice on preview or pilot content, helped answers, repeats, and pending answers are shown for transparency but are not counted.</p>{view.pendingCount > 0 && <p className={styles.notice} role="status">{view.pendingCount} answer{view.pendingCount === 1 ? ' is' : 's are'} pending review. Pending answers are not counted as right or wrong.</p>}<div className={styles.grid}>{view.rows.map((row) => <article className={styles.skill} key={row.skillId}><h2>{row.skillId}</h2><p className={styles.meta}>{row.track}</p><p><strong>{row.status}</strong>{row.needsReview ? ' · needs review' : ''}</p>{row.showPilotRow && <p className={styles.meta}>Pilot record: {row.pilotStatus} (pilot evidence only, not validated progress)</p>}<p>{row.evidence.recorded} recorded attempt{row.evidence.recorded === 1 ? '' : 's'}: {row.evidence.released} count toward mastery{row.evidence.pilot > 0 ? `, ${row.evidence.pilot} pilot evidence` : ''}{row.evidence.notCounted > 0 ? `, ${row.evidence.notCounted} not counted` : ''}</p></article>)}</div></section></div>;
}
