import { Link } from 'react-router-dom';
import { C0_ASSESSMENT_NOTICE, c0AssessmentForms } from '../data/assessment.c0.draft';
import { useWords } from '../context/WordProvider';
import { parseLocalSession } from '../persistence/durableSession';
import styles from './Learning.module.css';

export default function AssessmentPage() {
  const { activeProfileId } = useWords();
  const exposed = (form) => {
    const storageKey = `spelling-assessment:${activeProfileId}:${form}`;
    const formData = c0AssessmentForms.find((candidate) => candidate.form === form);
    try {
      const state = parseLocalSession(localStorage.getItem(storageKey), { id: storageKey, learnerId: activeProfileId, mode: 'assessment', contentVersion: formData?.version, orderedItemIds: formData?.items.map((item) => item.id) });
      return (state?.results?.length || 0) > 0;
    } catch { return false; }
  };
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{C0_ASSESSMENT_NOTICE}</p>
    <section className={styles.card}><h1>Assessment preview</h1><p>Each form has 34 items in two resumable parts: spelling, decoding, listening, speaking, sentences, editing, and writing. All prompts completed challenge review, and the 14 Part B prompts in each form completed educational/source review and app integration. Part A still requires reviewed human audio and specialist pronunciation/decoding review. Results must not be used for placement or mastery.</p>{(exposed('A') || exposed('B')) && <p className={styles.feedback}>Previous exposure: {exposed('A') ? 'Form A ' : ''}{exposed('B') ? 'Form B' : ''}. A repeated form is not all unseen.</p>}<div className={styles.actions}><Link className={styles.primary} to="/assessment/form-a">Start Form A</Link><Link className={styles.secondary} to="/assessment/form-b">Start Form B</Link></div></section>
  </div>;
}
