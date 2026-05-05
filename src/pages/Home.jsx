import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import styles from './Home.module.css';

const games = [
  { to: '/test', label: 'Spelling Test', desc: 'Type words you hear', icon: '✏️', color: '#f59e0b' },
  { to: '/flashcards', label: 'Flashcards', desc: 'Flip and learn', icon: '🃏', color: '#3b82f6' },
  { to: '/scramble', label: 'Word Scramble', desc: 'Unscramble letters', icon: '🔀', color: '#8b5cf6' },
  { to: '/hangman', label: 'Hangman', desc: 'Guess the word', icon: '🎯', color: '#ef4444' },
  { to: '/crossword', label: 'Crossword', desc: 'Fill the grid', icon: '🧩', color: '#10b981' },
];

export default function Home() {
  const { categories, selectedCategory, setSelectedCategory, activeWords, stats, loading } = useWords();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.heading}>Welcome to Spelling Tutor</h1>
        <p className={styles.subtitle}>
          Practice spelling words from the Alberta curriculum. Pick a game and get started!
        </p>
      </section>

      <section className={styles.categoryBar} aria-labelledby="category-label">
        <label id="category-label" htmlFor="category-select" className={styles.categoryLabel}>Word List:</label>
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
          <span className={styles.statNumber}>{stats.bestStreak}</span>
          <span className={styles.statLabel}>Best Streak</span>
        </div>
      </section>

      <section className={styles.gamesGrid} aria-label="Games">
        {games.map((game) => (
          <Link key={game.to} to={game.to} className={styles.gameCard} style={{ '--card-color': game.color }} data-game={game.to.slice(1)}>
            <span className={styles.gameIcon} aria-hidden="true">{game.icon}</span>
            <h2 className={styles.gameName}>{game.label}</h2>
            <p className={styles.gameDesc}>{game.desc}</p>
            <span className={styles.gameArrow} aria-hidden="true">Play →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
