import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import BadgeShelf from '../components/BadgeShelf';
import Leaderboard from '../components/Leaderboard';
import AvatarPicker from '../components/AvatarPicker';
import Dot from '../components/Dot';
import { c0LessonCatalog, learnerLessonTiles, lessonBySessionId, lessonsForTaskIds } from '../data/lessonCatalog';
import { story as storyDraft } from '../data/storyEpisodes';
import { continueCta, continueEyebrow, continueReassurance, continueTarget } from '../learning/homeContinue';
import { isCurrentLessonCompletion, nextStoryEpisode } from '../learning/storyProgress';
import { spellAgainWords } from '../persistence/spellAgain';
import { readJson, spellAgainStorageKey } from '../utils/localStore';
import styles from './Home.module.css';

const games = [
  { to: '/test', label: 'Spelling Test', desc: 'Type words you hear', icon: '✏️', color: '#C92A2A' },
  { to: '/flashcards', label: 'Flashcards', desc: 'Flip and learn', icon: '🃏', color: '#3B5BDB' },
  { to: '/scramble', label: 'Word Scramble', desc: 'Unscramble letters', icon: '🔀', color: '#FFD43B' },
  { to: '/hangman', label: 'Hangman', desc: 'Guess the word', icon: '🎯', color: '#0B7A5A' },
  { to: '/crossword', label: 'Crossword', desc: 'Fill the grid', icon: '🧩', color: '#8b5cf6' },
  { to: '/speed', label: 'Speed Round', desc: '60-second challenge', icon: '⚡', color: '#d97706' },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Home() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    stats,
    soundEnabled,
    toggleSound,
    dailyChallengeWord,
    dailyChallengeDone,
    authStatus,
    syncError,
    learnerGrade,
    profiles,
    activeProfileId,
    switchProfile,
  } = useWords();

  // Recomputed when the learner changes, because the tiles say where each lesson sits relative to
  // THIS child. Before the parent records a grade, and before the curriculum mapping is verified,
  // they say nothing — which is the honest answer, not a missing feature.
  const pilotLessons = useMemo(() => learnerLessonTiles({ learnerGrade }), [learnerGrade]);
  const activeProfile = (profiles || []).find((profile) => profile.id === activeProfileId);
  const otherProfile = (profiles || []).find((profile) => profile.id !== activeProfileId);
  const learnerName = activeProfile?.name || 'there';

  // The hero offers whatever this child already started. It reads the lesson's own saved session, so
  // it cannot promise progress the lesson would not restore.
  const continueHero = useMemo(() => continueTarget({
    tiles: pilotLessons,
    lessons: Object.values(c0LessonCatalog),
    readRaw: (key) => { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
    learnerId: activeProfileId,
  }), [pilotLessons, activeProfileId]);

  const savedWords = spellAgainWords(readJson(spellAgainStorageKey(activeProfileId), []));
  const nextEpisode = useMemo(() => nextStoryEpisode(storyDraft.episodes, {
    lessonsFor: (episode) => lessonsForTaskIds(episode.taskIds),
    isComplete: (entry) => isCurrentLessonCompletion(readJson(`spelling-lesson-complete:${activeProfileId}:${entry.id}`), lessonBySessionId(entry.id)),
  }), [activeProfileId]);

  return (
    <div className={styles.home}>
      <section className={styles.greeting}>
        <div className={styles.greetingLeft}>
          <AvatarPicker />
          <div>
            <h1 className={styles.hi}>Hi {learnerName}!</h1>
            {/* A real count from the record. The design mock showed a consecutive-day streak here; the
                app has only ever tracked a same-word streak, so that line would be a number nothing
                can produce. */}
            <p className={styles.greetingMeta}>{WEEKDAYS[new Date().getDay()]} · {stats.wordsSeen} words practised so far</p>
          </div>
        </div>
        <div className={styles.greetingRight}>
          {otherProfile && (
            <button className={styles.switchPill} onClick={() => switchProfile(otherProfile.id)}>Switch to {otherProfile.name}</button>
          )}
          <button
            className={`${styles.soundToggle} ${soundEnabled ? styles.enabled : ''}`}
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </section>

      {authStatus !== 'online' && (
        <p className={styles.notice} role="status">Offline mode: progress is saved on this device.</p>
      )}
      {syncError && <p className={styles.notice} role="alert">{syncError}</p>}

      {continueHero && (
        <Link className={styles.hero} to={continueHero.tile.to}>
          <Dot expression="idle" size={180} />
          <div className={styles.heroText}>
            <p className={styles.heroEyebrow}>{continueEyebrow(continueHero)}</p>
            <p className={styles.heroTitle}>{continueHero.tile.label}</p>
            <p className={styles.heroSub}>{continueReassurance(continueHero)}</p>
          </div>
          <span className={styles.heroCta}>{continueCta(continueHero)}</span>
        </Link>
      )}

      <section className={styles.twoUp}>
        <Link className={`${styles.wideCard} ${styles.greenCard}`} to={savedWords.length ? '/test?source=again' : '/test'}>
          <span className={styles.bigNumber}>{savedWords.length}</span>
          <span className={styles.wideCardText}>
            <span className={styles.wideCardTitle}>words to spell again</span>
            <span className={styles.wideCardSub}>
              {savedWords.length
                ? savedWords.slice(0, 4).map((word) => word.word).join(' · ')
                : 'Nothing saved yet. Save the ones you miss at the end of a round.'}
            </span>
          </span>
        </Link>
        <Link className={`${styles.wideCard} ${styles.blueCard}`} to="/case">
          <span className={styles.bigNumber}>{nextEpisode ? nextEpisode.episode.sequence : '✓'}</span>
          <span className={styles.wideCardText}>
            <span className={styles.wideCardTitle}>Story · {storyDraft.title}</span>
            <span className={styles.wideCardSub}>
              {nextEpisode ? `Episode ${nextEpisode.episode.sequence} · ${nextEpisode.episode.title}` : 'Every episode so far is solved.'}
            </span>
          </span>
        </Link>
      </section>

      <section aria-labelledby="learning-actions">
        <h2 id="learning-actions" className={styles.sectionHeading}>Start a language lesson</h2>
        <p className={styles.sectionIntro}>These C0 preview lessons teach a rule, preserve first answers, provide repair, and finish with a new transfer task.</p>
        <div className={styles.gamesGrid}>
          {pilotLessons.map((lesson) => (
            <Link key={lesson.to} to={lesson.to} className={styles.gameCard} style={{ '--card-color': lesson.color }}>
              <span className={styles.gameIcon} aria-hidden="true">{lesson.icon}</span>
              <h3 className={styles.gameName}>{lesson.label}</h3>
              <p className={styles.gameDesc}>{lesson.desc}</p>
              {lesson.placement && <p className={styles.gameDesc}><small>{lesson.placement}</small></p>}
              <span className={styles.gameArrow} aria-hidden="true">Start lesson →</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="journey-actions">
        <h2 id="journey-actions" className={styles.sectionHeading}>Continue your learning</h2>
        <div className={styles.gamesGrid}>
          <Link to="/case" className={styles.gameCard} style={{ '--card-color': '#3B5BDB' }}><span className={styles.gameIcon}>🔎</span><h3 className={styles.gameName}>Continue my case</h3><p className={styles.gameDesc}>Learn a rule and solve the next clue</p></Link>
          <Link to="/review" className={styles.gameCard} style={{ '--card-color': '#0B7A5A' }}><span className={styles.gameIcon}>↻</span><h3 className={styles.gameName}>Practise again</h3><p className={styles.gameDesc}>Review skills when they are due</p></Link>
          <Link to="/assessment" className={styles.gameCard} style={{ '--card-color': '#8b5cf6' }}><span className={styles.gameIcon}>🧭</span><h3 className={styles.gameName}>Assessment preview</h3><p className={styles.gameDesc}>See strengths by language skill</p></Link>
          <Link to="/progress" className={styles.gameCard} style={{ '--card-color': '#d97706' }}><span className={styles.gameIcon}>📈</span><h3 className={styles.gameName}>My progress</h3><p className={styles.gameDesc}>See evidence by skill, not one overall score</p></Link>
        </div>
      </section>

      <section className={styles.parentSection} aria-labelledby="for-the-parent">
        <h2 id="for-the-parent" className={styles.sectionHeading}>For the parent</h2>
        <p className={styles.sectionIntro}>
          Some things can only be decided by a person: which skills a child missed before Grade 5, whether a voice is
          clear on the iPad, whether a lesson actually teaches. These are yours, not theirs.
        </p>
        {/* The diagnostic sits first and named in full. It was reachable only from two thirds of the way down
            /parent, which is not reachable at all in the sense that matters: the parent looked for it and did not
            find it. A route that exists and cannot be found is the same defect as a route that does not exist. */}
        <p className={styles.parentLinks}>
          <Link className={styles.parentPrimary} to="/diagnostic">Diagnostic: what they missed before Grade 5</Link>
        </p>
        <p className={styles.sectionIntro}>
          Forty-eight questions across the sixteen skills Alberta finishes with before Grade 5, in one sitting, one
          child at a time. It teaches nothing and gives no score, and its answers never count towards mastery — it
          finds which foundations need building.
        </p>
        <p className={styles.parentLinks}>
          <Link to="/checks">Things I need you to test</Link>
          <Link to="/parent">Parent view: what is waiting for you</Link>
        </p>
      </section>

      {dailyChallengeWord && !dailyChallengeDone && (
        <section className={styles.dailyChallenge}>
          <div className={styles.dailyCard}>
            <h2 className={styles.dailyTitle}>🎯 Daily Challenge</h2>
            <p className={styles.dailyDesc}>
              Attempt these 5 words. Skip any you are not sure of — the round lists them at the end.
            </p>
            <div className={styles.dailyWords}>
              {dailyChallengeWord.map((w, idx) => (
                <div key={idx} className={styles.dailyWord}>
                  {w.word}
                </div>
              ))}
            </div>
            <Link to="/test?mode=daily" className={styles.dailyBtn}>
              Start Challenge →
            </Link>
          </div>
        </section>
      )}

      {dailyChallengeDone && (
        <section className={styles.dailyChallenge}>
          <div className={`${styles.dailyCard} ${styles.completed}`}>
            <p className={styles.completedMsg}>✅ Daily challenge complete!</p>
          </div>
        </section>
      )}

      <section className={styles.categoryBar} aria-labelledby="category-label">
        <label id="category-label" htmlFor="category-select" className={styles.categoryLabel}>
          Word List:
        </label>
        <select
          id="category-select"
          className={styles.categorySelect}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.words.length} words)
            </option>
          ))}
        </select>
      </section>

      <section aria-labelledby="word-game-activity">
        <h2 id="word-game-activity" className={styles.sectionHeading}>Word-game activity</h2>
        <p className={styles.sectionIntro}>These counts describe optional spelling-game practice. Language-lesson evidence is shown separately in My progress.</p>
        <div className={styles.statsRow} aria-label="Word-game activity">
          <div className={styles.statCard} data-stat="words-seen">
            <span className={styles.statNumber}>{stats.wordsSeen}</span>
            <span className={styles.statLabel}>Words Practiced</span>
          </div>
          <div className={styles.statCard} data-stat="attempts">
            <span className={styles.statNumber}>{stats.totalAttempts}</span>
            <span className={styles.statLabel}>Total Attempts</span>
          </div>
          <div className={styles.statCard} data-stat="accuracy">
            <span className={styles.statNumber}>
              {stats.totalAttempts > 0
                ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100)
                : 0}%
            </span>
            <span className={styles.statLabel}>Accuracy</span>
          </div>
          <div className={styles.statCard} data-stat="best-streak">
            <span className={`${styles.statNumber} ${stats.bestStreak >= 5 ? styles.fire : ''}`}>
              {stats.bestStreak >= 5 ? '🔥' : ''} {stats.bestStreak}
            </span>
            <span className={styles.statLabel}>Best Same-Word Streak</span>
          </div>
        </div>
      </section>

      <section id="games" aria-labelledby="word-games">
        <h2 id="word-games" className={styles.sectionHeading}>Optional word games</h2>
        <p className={styles.sectionIntro}>Games keep the original spelling practice available, but they are not the grammar, sentence, punctuation, or assessment program.</p>
        <div className={styles.gamesGrid}>
          {games.map((game) => (
            <Link
              key={game.to}
              to={game.to}
              className={styles.gameCard}
              style={{ '--card-color': game.color }}
              data-game={game.to.slice(1)}
            >
              <span className={styles.gameIcon} aria-hidden="true">
                {game.icon}
              </span>
              <h3 className={styles.gameName}>{game.label}</h3>
              <p className={styles.gameDesc}>{game.desc}</p>
              <span className={styles.gameArrow} aria-hidden="true">Play →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.bottomSection}>
        <BadgeShelf />
        <Leaderboard />
      </section>
    </div>
  );
}
