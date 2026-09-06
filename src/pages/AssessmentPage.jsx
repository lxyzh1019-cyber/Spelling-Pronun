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
    <section className={styles.card}><h1>Assessment preview</h1><p>Each draft form has 34 items in two resumable parts: spelling, decoding, listening, speaking, sentences, editing, and writing. Content and synthetic audio still require independent review, so results must not be used for placement or mastery.</p>{(exposed('A') || exposed('B')) && <p className={styles.feedback}>Previous exposure: {exposed('A') ? 'Form A ' : ''}{exposed('B') ? 'Form B' : ''}. A repeated form is not all unseen.</p>}<div className={styles.actions}><Link className={styles.primary} to="/assessment/form-a">Start Form A</Link><Link className={styles.secondary} to="/assessment/form-b">Start Form B</Link></div></section>
  </div>;
}
