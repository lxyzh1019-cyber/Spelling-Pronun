import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { story as storyDraft } from '../data/storyEpisodes';
import { lessonBySessionId, lessonsForTaskIds } from '../data/lessonCatalog';
import { isCurrentLessonCompletion } from '../learning/storyProgress';
import { useCancellableSpeech } from '../hooks/useCancellableSpeech';
import { readJson } from '../utils/localStore';
import styles from './Learning.module.css';

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
  // Derived from each episode's own task ids rather than a hardcoded map. An episode with no
  // openable lesson yet is NOT complete — `[].every()` is true, which would have marked it solved
  // and revealed its answer to a child who had done nothing.
  const lessonsFor = (episode) => lessonsForTaskIds(episode.taskIds);
  const episodeComplete = (episode) => {
    const lessons = lessonsFor(episode);
    return lessons.length > 0 && lessons.every((lesson) => completed(lesson.id));
  };
  return <div className={styles.page}>
    <p className={styles.notice} role="note">Integrated C0 story preview. The episodes completed challenge, educational/source review, and app integration, but still require learner testing before release.</p>
    <h1>{storyDraft.title}</h1>
    {storyDraft.episodes.map((episode, index) => {
      // Each episode unlocks the next, rather than every episode hanging off chapter 1.
      const unlocked = index === 0 || episodeComplete(storyDraft.episodes[index - 1]);
      const solved = episodeComplete(episode);
      const lessons = lessonsFor(episode);
      return <section className={styles.card} key={episode.id}>
        <p className={styles.meta}>{episode.fictionLabel} · Episode {episode.sequence} · {unlocked ? solved ? 'solved' : 'available' : 'locked'}</p>
        <h2>{episode.title}</h2>
        {unlocked ? <><p>{episode.intro}</p><div className={styles.feedback}><h3>Two-sentence recap</h3><p>{episode.recap}</p><button className={styles.secondary} type="button" onClick={() => playRecap(episode)}>Play recap</button>{audioStatus.episodeId === episode.id && <p role="status">{audioStatus.message}</p>}</div><p><strong>Problem:</strong> {episode.problem}</p><div className={styles.actions}>{lessons.map((lesson) => completed(lesson.id) ? <span className={styles.success} key={lesson.id}>✓ {lesson.label}</span> : <Link className={styles.primary} key={lesson.id} to={`/lesson/${lesson.id}?episode=${episode.id}`}>{lesson.label}</Link>)}</div>{lessons.length === 0 && <p role="status">The lessons for this episode are written but not yet approved, so there is nothing to open here.</p>}{solved ? <><div className={styles.success}><h3>Case reveal</h3><p>{episode.reveal}</p></div><h3>History behind the mystery</h3><p>{episode.historyBehindMystery}</p><p><strong>Next question:</strong> {episode.unresolvedQuestion}</p></> : <p>The reveal stays sealed until every language clue above is resolved.</p>}</> : <p>Finish the previous episode’s language clues to unlock this one.</p>}
      </section>;
    })}
    <section className={styles.card}><h2>Pronoun workshop</h2><p>This pilot pack is a workshop outside Chapter 1, as the story plan permits.</p><Link className={styles.secondary} to="/lesson/pilot-gr-pronouns">Open pronoun workshop</Link></section>
  </div>;
}
