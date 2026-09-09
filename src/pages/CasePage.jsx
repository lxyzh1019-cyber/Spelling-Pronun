import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { c0Story as storyDraft } from '../data/storyEpisodes';
import { lessonBySessionId } from '../data/lessonCatalog';
import { isCurrentLessonCompletion } from '../learning/storyProgress';
import { useCancellableSpeech } from '../hooks/useCancellableSpeech';
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
  const [audioStatus, setAudioStatus] = useState({ episodeId: null, message: '' });
  const { play: playSpeech } = useCancellableSpeech(activeProfileId);
  useEffect(() => {
    setAudioStatus({ episodeId: null, message: '' });
  }, [activeProfileId]);
  const playRecap = async (episode) => {
    setAudioStatus({ episodeId: episode.id, message: 'Starting recap audio…' });
    const result = await playSpeech(episode.recap, { lang: 'en-CA', rate: 0.88 });
    if (result.reason === 'cancelled') return;
    setAudioStatus({
      episodeId: episode.id,
      message: result.ok
        ? result.usedRequestedLocale ? 'Recap playing in Canadian English.' : 'Recap playing with an available English voice; a Canadian English voice was not available.'
        : 'Recap audio could not start. Read the recap below or tap Play recap to try again.',
    });
  };
  const completed = (lessonId) => {
    const lesson = lessonBySessionId(lessonId);
    const record = readJson(`spelling-lesson-complete:${activeProfileId}:${lessonId}`);
    return isCurrentLessonCompletion(record, lesson);
  };
  const episodeComplete = (episodeId) => episodeLessons[episodeId].every((lesson) => completed(lesson.id));
  const firstComplete = episodeComplete('c0.story.01');
  return <div className={styles.page}>
    <p className={styles.notice} role="note">Integrated C0 story preview. The episodes completed challenge, educational/source review, and app integration, but still require learner testing before release.</p>
    <h1>{storyDraft.title}</h1>
    {storyDraft.episodes.map((episode, index) => {
      const unlocked = index === 0 || firstComplete;
      const solved = episodeComplete(episode.id);
      return <section className={styles.card} key={episode.id}>
        <p className={styles.meta}>{episode.fictionLabel} · Episode {episode.sequence} · {unlocked ? solved ? 'solved' : 'available' : 'locked'}</p>
        <h2>{episode.title}</h2>
        {unlocked ? <><p>{episode.intro}</p><div className={styles.feedback}><h3>Two-sentence recap</h3><p>{episode.recap}</p><button className={styles.secondary} type="button" onClick={() => playRecap(episode)}>Play recap</button>{audioStatus.episodeId === episode.id && <p role="status">{audioStatus.message}</p>}</div><p><strong>Problem:</strong> {episode.problem}</p><div className={styles.actions}>{episodeLessons[episode.id].map((lesson) => completed(lesson.id) ? <span className={styles.success} key={lesson.id}>✓ {lesson.label}</span> : <Link className={styles.primary} key={lesson.id} to={`/lesson/${lesson.id}?episode=${episode.id}`}>{lesson.label}</Link>)}</div>{solved ? <><div className={styles.success}><h3>Case reveal</h3><p>{episode.reveal}</p></div><h3>History behind the mystery</h3><p>{episode.historyBehindMystery}</p><p><strong>Next question:</strong> {episode.unresolvedQuestion}</p></> : <p>The reveal stays sealed until every language clue above is resolved.</p>}</> : <p>Finish Episode 1’s spelling and capitals clues to unlock this episode.</p>}
      </section>;
    })}
    <section className={styles.card}><h2>Pronoun workshop</h2><p>This pilot pack is a workshop outside Chapter 1, as the story plan permits.</p><Link className={styles.secondary} to="/lesson/pilot-gr-pronouns">Open pronoun workshop</Link></section>
  </div>;
}
