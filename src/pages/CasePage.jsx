import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import storyDraft from '../data/story.c0.draft.json';
import { readJson } from '../utils/localStore';
import styles from './Learning.module.css';

const episodeLessons = {
  'c0.story.01': [
    { id: 'pilot-sp-patterns', label: 'Spelling clue' },
    { id: 'pilot-pu-capitals', label: 'Capitals clue' },
  ],
  'c0.story.02': [{ id: 'pilot-se-complete', label: 'Complete-sentence clue' }],
};

export default function CasePage() {
  const { activeProfileId } = useWords();
  const completed = (lessonId) => Boolean(readJson(`spelling-lesson-complete:${activeProfileId}:${lessonId}`));
  const episodeComplete = (episodeId) => episodeLessons[episodeId].every((lesson) => completed(lesson.id));
  const firstComplete = episodeComplete('c0.story.01');
  return <div className={styles.page}>
    <p className={styles.notice} role="note">Draft C0 story preview. Historical notes have source records, but the episodes and language tasks still require independent review before release.</p>
    <h1>{storyDraft.title}</h1>
    {storyDraft.episodes.map((episode, index) => {
      const unlocked = index === 0 || firstComplete;
      const solved = episodeComplete(episode.id);
      return <section className={styles.card} key={episode.id}>
        <p className={styles.meta}>{episode.fictionLabel} · Episode {episode.sequence} · {unlocked ? solved ? 'solved' : 'available' : 'locked'}</p>
        <h2>{episode.title}</h2>
        {unlocked ? <><p>{episode.intro}</p><p><strong>Problem:</strong> {episode.problem}</p><div className={styles.actions}>{episodeLessons[episode.id].map((lesson) => completed(lesson.id) ? <span className={styles.success} key={lesson.id}>✓ {lesson.label}</span> : <Link className={styles.primary} key={lesson.id} to={`/lesson/${lesson.id}?episode=${episode.id}`}>{lesson.label}</Link>)}</div>{solved ? <><div className={styles.success}><h3>Case reveal</h3><p>{episode.reveal}</p></div><h3>History behind the mystery</h3><p>{episode.historyBehindMystery}</p><p><strong>Next question:</strong> {episode.unresolvedQuestion}</p></> : <p>The reveal stays sealed until every language clue above is resolved.</p>}</> : <p>Finish Episode 1’s spelling and capitals clues to unlock this episode.</p>}
      </section>;
    })}
    <section className={styles.card}><h2>Pronoun workshop</h2><p>This pilot pack is a workshop outside Chapter 1, as the story plan permits.</p><Link className={styles.secondary} to="/lesson/pilot-gr-pronouns">Open pronoun workshop</Link></section>
  </div>;
}
