import { Link } from 'react-router-dom';
import { PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import styles from './Learning.module.css';

export default function AssessmentPage() {
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{PILOT_FIXTURE_NOTICE}</p>
    <section className={styles.card}><h1>Assessment preview</h1><p>This four-item engineering check demonstrates Form A/B, first-answer capture, resume, and a skill recommendation. It is not the planned 34-item reviewed assessment and must not be used for placement.</p><div className={styles.actions}><Link className={styles.primary} to="/assessment/form-a">Start Form A</Link><Link className={styles.secondary} to="/assessment/form-b">Start Form B</Link></div></section>
  </div>;
}
