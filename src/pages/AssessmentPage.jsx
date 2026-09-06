import { Link } from 'react-router-dom';
import { PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import { useWords } from '../context/WordProvider';
import styles from './Learning.module.css';

export default function AssessmentPage() {
  const { activeProfileId } = useWords();
  const exposed = (form) => {
    try { return (JSON.parse(localStorage.getItem(`spelling-assessment:${activeProfileId}:${form}`))?.results?.length || 0) > 0; } catch { return false; }
  };
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{PILOT_FIXTURE_NOTICE}</p>
    <section className={styles.card}><h1>Assessment preview</h1><p>This four-item engineering check demonstrates Form A/B, first-answer capture, resume, and evidence reporting. It is not the planned 34-item reviewed assessment and must not be used for placement.</p>{(exposed('A') || exposed('B')) && <p className={styles.feedback}>Previous exposure: {exposed('A') ? 'Form A ' : ''}{exposed('B') ? 'Form B' : ''}. A repeated form is not all unseen.</p>}<div className={styles.actions}><Link className={styles.primary} to="/assessment/form-a">Start Form A</Link><Link className={styles.secondary} to="/assessment/form-b">Start Form B</Link></div></section>
  </div>;
}
