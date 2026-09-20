import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import BadgeShelf from '../components/BadgeShelf';
import Leaderboard from '../components/Leaderboard';
import AvatarPicker from '../components/AvatarPicker';
import { learnerLessonTiles } from '../data/lessonCatalog';
import styles from './Home.module.css';

const games = [
  { to: '/test', label: 'Spelling Test', desc: 'Type words you hear', icon: '✏️', color: '#f59e0b' },
  { to: '/flashcards', label: 'Flashcards', desc: 'Flip and learn', icon: '🃏', color: '#3b82f6' },
  { to: '/scramble', label: 'Word Scramble', desc: 'Unscramble letters', icon: '🔀', color: '#8b5cf6' },
  { to: '/hangman', label: 'Hangman', desc: 'Guess the word', icon: '🎯', color: '#ef4444' },
  { to: '/crossword', label: 'Crossword', desc: 'Fill the grid', icon: '🧩', color: '#10b981' },
  { to: '/speed', label: 'Speed Round', desc: '60-second challenge', icon: '⚡', color: '#8b5cf6' },
];


export default function Home() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    activeWords,
    stats,
    soundEnabled,
    toggleSound,
    dailyChallengeWord,
    dailyChallengeDone,
    authStatus,
    syncError,
    learnerGrade,
  } = useWords();

  // Recomputed when the learner changes, because the tiles say where each lesson sits relative to
  // THIS child. Before the parent records a grade, and before the curriculum mapping is verified,
  // they say nothing — which is the honest answer, not a missing feature.
  const pilotLessons = useMemo(() => learnerLessonTiles({ learnerGrade }), [learnerGrade]);

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.heading}>Spelling and Language Tutor</h1>
        <p className={styles.subtitle}>
          Learn spelling, sentence, punctuation, and grammar skills through short lessons, then use word games as optional practice.
        </p>
        <div className={styles.controls}>
          <AvatarPicker />
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
        <p role="status">Offline mode: progress is saved on this device.</p>
      )}
      {syncError && <p role="alert">{syncError}</p>}

      <section aria-labelledby="learning-actions">
        <h2 id="learning-actions">Start a language lesson</h2>
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
        <h2 id="journey-actions">Continue your learning</h2>
        <div className={styles.gamesGrid}>
          <Link to="/case" className={styles.gameCard} style={{ '--card-color': '#2563eb' }}><span className={styles.gameIcon}>🔎</span><h3 className={styles.gameName}>Continue my case</h3><p className={styles.gameDesc}>Learn a rule and solve the next clue</p></Link>
          <Link to="/review" className={styles.gameCard} style={{ '--card-color': '#059669' }}><span className={styles.gameIcon}>↻</span><h3 className={styles.gameName}>Practise again</h3><p className={styles.gameDesc}>Review skills when they are due</p></Link>
          <Link to="/assessment" className={styles.gameCard} style={{ '--card-color': '#7c3aed' }}><span className={styles.gameIcon}>🧭</span><h3 className={styles.gameName}>Assessment preview</h3><p className={styles.gameDesc}>See strengths by language skill</p></Link>
          <Link to="/progress" className={styles.gameCard} style={{ '--card-color': '#d97706' }}><span className={styles.gameIcon}>📈</span><h3 className={styles.gameName}>My progress</h3><p className={styles.gameDesc}>See evidence by skill, not one overall score</p></Link>
        </div>
      </section>

      <section className={styles.parentSection} aria-labelledby="for-the-parent">
        <h2 id="for-the-parent">For the parent</h2>
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
              Attempt these 5 words. Skips are saved for later practice.
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
        <h2 id="word-game-activity">Word-game activity</h2>
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
        <h2 id="word-games">Optional word games</h2>
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
