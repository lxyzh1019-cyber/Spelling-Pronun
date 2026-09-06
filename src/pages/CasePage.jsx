import { Link } from 'react-router-dom';
import { pilotEpisode, PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import styles from './Learning.module.css';

export default function CasePage() {
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{PILOT_FIXTURE_NOTICE}</p>
    <section className={styles.card}>
      <p className={styles.meta}>{pilotEpisode.fictionLabel} · Chapter {pilotEpisode.chapter}</p>
      <h1>{pilotEpisode.title}</h1>
      <p>{pilotEpisode.intro}</p>
      <p>The resolution stays sealed until you complete an unseen transfer question.</p>
      <div className={styles.actions}><Link className={styles.primary} to="/lesson/pilot-se-complete">Start the clue lesson</Link><Link className={styles.secondary} to="/assessment">Try assessment preview</Link></div>
    </section>
  </div>;
}
