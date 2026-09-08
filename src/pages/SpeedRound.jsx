import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import { speak } from '../utils/speech';
import { shuffle } from '../utils/shuffle';
import { playCorrectSound, playIncorrectSound, playMilestoneSound } from '../utils/sounds';
import { hapticSuccess, hapticError, hapticMilestone } from '../utils/haptics';
import { triggerConfetti } from '../utils/confetti';
import { SPEED_MODES as MODES, buildSpeedRoundList, evidenceTypeForMode, recordSpeedOutcome } from '../learning/speedRound';
import styles from './SpeedRound.module.css';

const PASS_AFTER_MS = 5000;

export default function SpeedRound() {
  const { allWords, recordResult, soundEnabled, unlockAchievement } = useWords();
  const [mode, setMode] = useState('quick');
  const [gameState, setGameState] = useState('start'); // start | playing | finish
  const [timeLeft, setTimeLeft] = useState(MODES.quick.timeLimit);
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [canPass, setCanPass] = useState(false);
  const [misses, setMisses] = useState([]);
  // Guards a double Enter on the same word: one submission per index.
  const advancingRef = useRef(false);
  useEffect(() => { advancingRef.current = false; }, [index, gameState]);
  const inputRef = useRef(null);
  const gameTimerRef = useRef(null);
  const passTimerRef = useRef(null);
  // Mirror score in a ref so timer callbacks and post-setState reads see the
  // latest value (the setInterval below captures `score` from game start, and
  // `advance` runs synchronously with the same render's stale `score`).
  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const stopTimers = () => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (passTimerRef.current) clearTimeout(passTimerRef.current);
  };

  useEffect(() => {
    return stopTimers;
  }, []);

  const startGame = () => {
    const cfg = MODES[mode];
    const list = buildSpeedRoundList(shuffle(allWords), cfg.count);
    setWords(list);
    setMisses([]);
    setIndex(0);
    setScore(0);
    scoreRef.current = 0;
    setInput('');
    setFeedback(null);
    setTimeLeft(cfg.timeLimit);
    setGameState('playing');
    setCanPass(false);

    if (inputRef.current) inputRef.current.focus();

    if (cfg.timeLimit > 0) {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('finish');
            stopTimers();
            if (soundEnabled) playMilestoneSound();
            hapticMilestone();
            if (scoreRef.current >= 8) unlockAchievement('speed_demon');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const advance = (didAnswer) => {
    setInput('');
    setFeedback(null);
    setCanPass(false);

    if (index + 1 >= words.length) {
      setGameState('finish');
      stopTimers();
      if (soundEnabled) playMilestoneSound();
      hapticMilestone();
      if (scoreRef.current >= 8) unlockAchievement('speed_demon');
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !words[index] || advancingRef.current) return;
    advancingRef.current = true;

    const current = words[index];
    const isCorrect = input.trim().toLowerCase() === current.word.toLowerCase();
    const evidenceType = evidenceTypeForMode(mode);

    if (isCorrect) {
      scoreRef.current += 1;
      setScore((s) => s + 1);
      if (soundEnabled) playCorrectSound();
      hapticSuccess();
      triggerConfetti('light');
      recordResult(current.id, true, { evidenceType });
    } else {
      if (soundEnabled) playIncorrectSound();
      hapticError();
      setMisses((list) => recordSpeedOutcome(list, current, { typed: input }));
      recordResult(current.id, false, { evidenceType });
    }

    advance(true);
  };

  const handlePass = () => {
    const current = words[index];
    if (!current || advancingRef.current) return;
    advancingRef.current = true;
    setMisses((list) => recordSpeedOutcome(list, current, { passed: true }));
    recordResult(current.id, false, { evidenceType: evidenceTypeForMode(mode), skipped: true });
    advance(false);
  };

  // Reset the 5s pass-button timer whenever the user types or moves to a new word
  useEffect(() => {
    if (gameState !== 'playing') return;
    setCanPass(false);
    if (passTimerRef.current) clearTimeout(passTimerRef.current);
    passTimerRef.current = setTimeout(() => setCanPass(true), PASS_AFTER_MS);
    return () => {
      if (passTimerRef.current) clearTimeout(passTimerRef.current);
    };
  }, [gameState, index, input]);

  if (gameState === 'start') {
    const cfg = MODES[mode];
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            {cfg.icon}
          </span>
          <h1 className={styles.title}>Speed Round</h1>
          <div className={styles.modeRow} role="radiogroup" aria-label="Mode">
            {Object.entries(MODES).map(([key, m]) => (
              <button
                key={key}
                role="radio"
                aria-checked={mode === key}
                className={`${styles.modeBtn} ${mode === key ? styles.modeBtnActive : ''}`}
                onClick={() => setMode(key)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <p className={styles.desc}>
            {cfg.timeLimit > 0
              ? `Type as many words as you can in ${cfg.timeLimit} seconds! This is timed retrieval practice, not a lesson.`
              : `Untimed practice through up to ${cfg.count} words at your own pace. It is optional practice, not a required lesson.`}
            {' '}If you're stuck for 5 seconds, a Pass button appears.
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
          {misses.length > 0 ? (
            <div className={styles.missList} aria-label="Words to review">
              <h2 className={styles.missHeading}>Review these {misses.length} word{misses.length === 1 ? '' : 's'}</h2>
              <ul>
                {misses.map((miss, position) => (
                  <li key={`${miss.wordId}-${position}`}>
                    <strong>{miss.word}</strong> — {miss.definition}
                    {miss.passed ? ' (passed)' : miss.typed ? ` (you typed “${miss.typed}”)` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className={styles.desc}>No misses to review.</p>}
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
        {MODES[mode].timeLimit > 0 ? (
          <div className={styles.timer} style={{ color: timeLeft <= 10 ? '#ef4444' : '#3b82f6' }}>
            ⏱️ {timeLeft}s
          </div>
        ) : (
          <div className={styles.timer}>📚 {index + 1}/{words.length}</div>
        )}
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

          {canPass && (
            <button
              type="button"
              className={styles.passBtn}
              onClick={handlePass}
              aria-label="Pass this word and go to the next"
            >
              Pass / Next →
            </button>
          )}

          <p className={styles.counter}>
            {index + 1} / {words.length}
          </p>
        </div>
      )}
    </div>
  );
}
