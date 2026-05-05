import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import BadgeShelf from '../components/BadgeShelf';
import Leaderboard from '../components/Leaderboard';
import AvatarPicker from '../components/AvatarPicker';
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
    completeDailyChallenge,
  } = useWords();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.heading}>Welcome to Spelling Tutor</h1>
        <p className={styles.subtitle}>
          Practice spelling words from the Alberta curriculum. Pick a game and get started!
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

      {dailyChallengeWord && !dailyChallengeDone && (
        <section className={styles.dailyChallenge}>
          <div className={styles.dailyCard}>
            <h2 className={styles.dailyTitle}>🎯 Daily Challenge</h2>
            <p className={styles.dailyDesc}>
              Complete these 5 words for bonus XP!
            </p>
            <div className={styles.dailyWords}>
              {dailyChallengeWord.map((w, idx) => (
                <div key={idx} className={styles.dailyWord}>
                  {w.word}
                </div>
              ))}
            </div>
            <Link to="/test" className={styles.dailyBtn}>
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

      <section className={styles.statsRow} aria-label="Your progress">
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
          <span className={styles.statLabel}>Best Streak</span>
        </div>
      </section>

      <section className={styles.gamesGrid} aria-label="Games">
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
            <h2 className={styles.gameName}>{game.label}</h2>
            <p className={styles.gameDesc}>{game.desc}</p>
            <span className={styles.gameArrow} aria-hidden="true">Play →</span>
          </Link>
        ))}
      </section>

      <section className={styles.bottomSection}>
        <BadgeShelf />
        <Leaderboard />
      </section>
    </div>
  );
}
