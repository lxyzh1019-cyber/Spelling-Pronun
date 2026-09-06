import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import styles from './Learning.module.css';

export default function ParentPage() {
  const { activeProfileId, authStatus, syncError } = useWords(); const { attempts, saveStatus } = useLearning();
  return <div className={styles.page}><section className={styles.card}><h1>Parent view</h1><p><strong>Learner:</strong> {activeProfileId}</p><p><strong>Account connection:</strong> {authStatus}</p><p><strong>Learning data:</strong> {saveStatus}</p><p><strong>Preview attempts on this device:</strong> {attempts.length}</p>{syncError && <p role="alert">{syncError}</p>}<h2>Current limitations</h2><p>Cross-device verification, reviewed curriculum content, pronunciation scoring, and the family pilot are not complete. No unreviewed fixture attempt is treated as mastery evidence.</p></section></div>;
}
