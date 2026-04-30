import { useState, useEffect, useCallback } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './Hangman.module.css';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const MAX_WRONG = 7;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Hangman() {
  const { activeWords, recordResult } = useWords();
  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const newGame = useCallback(() => {
    if (!activeWords.length) return;
    const w = pickRandom(activeWords);
    setWord(w.word.toLowerCase());
    setGuessed(new Set());
    setWrongGuesses(0);
    setGameOver(false);
    setWon(false);
  }, [activeWords]);

  useEffect(() => {
    newGame();
  }, [newGame]);

  const handleGuess = (letter) => {
    if (gameOver || guessed.has(letter)) return;
    const newGuessed = new Set(guessed);
    newGuessed.add(letter);
    setGuessed(newGuessed);

    if (!word.includes(letter)) {
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= MAX_WRONG) {
        setGameOver(true);
        setWon(false);
        recordResult(word, false);
      }
    } else {
      // Check if word is complete
      const allGuessed = word.split('').every((l) => newGuessed.has(l));
      if (allGuessed) {
        setGameOver(true);
        setWon(true);
        recordResult(word, true);
      }
    }
  };

  // Keyboard handling
  useEffect(() => {
    const handler = (e) => {
      const letter = e.key.toLowerCase();
      if (ALPHABET.includes(letter) && !gameOver) {
        handleGuess(letter);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [word, guessed, gameOver, wrongGuesses, handleGuess]);

  const displayWord = word
    .split('')
    .map((l) => (guessed.has(l) ? l : '_'))
    .join(' ');

  if (!activeWords.length) {
    return (
      <div className={styles.empty}>
        <p>No words in this category. Add some words to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Hangman</h2>

      <div className={styles.canvasWrapper}>
        <svg className={styles.canvas} viewBox="0 0 200 230" width="200" height="230">
          {/* Gallows */}
          <line x1="20" y1="220" x2="180" y2="220" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="220" x2="50" y2="20" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="20" x2="140" y2="20" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
          <line x1="140" y1="20" x2="140" y2="50" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />

          {/* Head */}
          {wrongGuesses >= 1 && (
            <circle cx="140" cy="70" r="20" fill="none" stroke="#ef4444" strokeWidth="3" />
          )}
          {/* Body */}
          {wrongGuesses >= 2 && (
            <line x1="140" y1="90" x2="140" y2="150" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Left arm */}
          {wrongGuesses >= 3 && (
            <line x1="140" y1="105" x2="115" y2="130" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Right arm */}
          {wrongGuesses >= 4 && (
            <line x1="140" y1="105" x2="165" y2="130" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Left leg */}
          {wrongGuesses >= 5 && (
            <line x1="140" y1="150" x2="115" y2="185" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Right leg */}
          {wrongGuesses >= 6 && (
            <line x1="140" y1="150" x2="165" y2="185" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          )}
          {/* Face */}
          {wrongGuesses >= 7 && (
            <>
              <line x1="132" y1="62" x2="136" y2="66" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="136" y1="62" x2="132" y2="66" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="148" y1="62" x2="144" y2="66" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="144" y1="62" x2="148" y2="66" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <path d="M 133 78 Q 140 85 147 78" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>

      <div className={styles.wordDisplay}>{displayWord}</div>

      <div className={styles.guessesLeft}>
        Wrong guesses: {wrongGuesses} / {MAX_WRONG}
      </div>

      {gameOver && (
        <div className={won ? styles.winMsg : styles.loseMsg}>
          {won ? '🎉 You won!' : `💀 Game over! The word was: ${word}`}
        </div>
      )}

      {gameOver && (
        <button className={styles.newGameBtn} onClick={newGame}>
          New Game
        </button>
      )}

      {!gameOver && (
        <div className={styles.keyboard}>
          {ALPHABET.map((letter) => {
            const isGuessed = guessed.has(letter);
            const isCorrect = isGuessed && word.includes(letter);
            const isWrong = isGuessed && !word.includes(letter);
            let cls = styles.key;
            if (isCorrect) cls = `${styles.key} ${styles.keyCorrect}`;
            else if (isWrong) cls = `${styles.key} ${styles.keyWrong}`;
            else cls = `${styles.key} ${styles.keyUnused}`;

            return (
              <button
                key={letter}
                className={cls}
                onClick={() => handleGuess(letter)}
                disabled={isGuessed}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
