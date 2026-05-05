import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import { speak } from '../utils/speech';
import { shuffle } from '../utils/shuffle';
import { playCorrectSound, playIncorrectSound, playMilestoneSound } from '../utils/sounds';
import { hapticSuccess, hapticError, hapticMilestone } from '../utils/haptics';
import { triggerConfetti } from '../utils/confetti';
import styles from './SpeedRound.module.css';

const TIME_LIMIT = 60; // seconds

export default function SpeedRound() {
  const { allWords, recordResult, soundEnabled, unlockAchievement } = useWords();
  const [gameState, setGameState] = useState('start'); // start | playing | finish
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);
  const gameTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

  const startGame = () => {
    const shuffled = shuffle(allWords).slice(0, 20);
    setWords(shuffled);
    setIndex(0);
    setScore(0);
    setInput('');
    setFeedback(null);
    setTimeLeft(TIME_LIMIT);
    setGameState('playing');

    if (inputRef.current) inputRef.current.focus();

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('finish');
          clearInterval(gameTimerRef.current);
          if (soundEnabled) playMilestoneSound();
          hapticMilestone();
          if (score >= 8) unlockAchievement('speed_demon');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !words[index]) return;

    const current = words[index];
    const isCorrect = input.trim().toLowerCase() === current.word.toLowerCase();

    if (isCorrect) {
      setScore((s) => s + 1);
      if (soundEnabled) playCorrectSound();
      hapticSuccess();
      triggerConfetti('light');
      recordResult(current.id, true);
    } else {
      if (soundEnabled) playIncorrectSound();
      hapticError();
      recordResult(current.id, false);
    }

    setInput('');
    setFeedback(null);

    if (index + 1 >= words.length) {
      setGameState('finish');
      clearInterval(gameTimerRef.current);
      if (soundEnabled) playMilestoneSound();
      hapticMilestone();
      if (score >= 8) unlockAchievement('speed_demon');
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (gameState === 'start') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            ⚡
          </span>
          <h1 className={styles.title}>Speed Round</h1>
          <p className={styles.desc}>
            Type as many words as you can in {TIME_LIMIT} seconds! No sound, just speed.
          </p>
          <button className={styles.startBtn} onClick={startGame}>
            Start Challenge
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finish') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            {score >= 12 ? '🏆' : score >= 8 ? '🎯' : '⚡'}
          </span>
          <h1 className={styles.title}>Round Complete!</h1>
          <p className={styles.score}>{score} words</p>
          {score >= 8 && <p className={styles.badge}>🏅 Speed Demon unlocked!</p>}
          <button className={styles.startBtn} onClick={startGame}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const current = words[index];
  const progress = ((index + 1) / words.length) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.timer} style={{ color: timeLeft <= 10 ? '#ef4444' : '#3b82f6' }}>
          ⏱️ {timeLeft}s
        </div>
        <div className={styles.scoreDisplay}>Score: {score}</div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      {current && (
        <div className={styles.card}>
          <p className={styles.definition}>{current.definition}</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="speed-input" className={styles.visuallyHidden}>
              Type the word
            </label>
            <input
              id="speed-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type and press Enter..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={styles.input}
            />
          </form>

          <p className={styles.counter}>
            {index + 1} / {words.length}
          </p>
        </div>
      )}
    </div>
  );
}
