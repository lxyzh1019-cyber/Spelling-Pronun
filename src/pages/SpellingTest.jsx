import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import { speak } from '../utils/speech';
import { shuffle } from '../utils/shuffle';
import styles from './SpellingTest.module.css';

export default function SpellingTest() {
  const { activeWords, recordResult, selectedCategory } = useWords();
  const [shuffled, setShuffled] = useState([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [score, setScore] = useState({ correct: 0, incorrect: 0, skipped: 0 });
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setShuffled(shuffle(activeWords));
    setIndex(0);
    setInput('');
    setFeedback(null);
    setScore({ correct: 0, incorrect: 0, skipped: 0 });
    setFinished(false);
    setStarted(false);
  }, [activeWords, selectedCategory]);

  const current = shuffled[index];

  const speakCurrent = useCallback(() => {
    if (current) speak(current.word);
  }, [current]);

  const handleStart = () => {
    setStarted(true);
    setTimeout(() => {
      speakCurrent();
      inputRef.current?.focus();
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || feedback) return;

    const isCorrect = input.trim().toLowerCase() === current.word.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    recordResult(current.id, isCorrect);
    setScore((s) => ({
      ...s,
      correct: s.correct + (isCorrect ? 1 : 0),
      incorrect: s.incorrect + (isCorrect ? 0 : 1),
    }));
  };

  const handleNext = () => {
    if (index + 1 >= shuffled.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setInput('');
      setFeedback(null);
      setTimeout(() => {
        speakCurrent();
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleSkip = () => {
    setScore((s) => ({ ...s, skipped: s.skipped + 1 }));
    handleNext();
  };

  if (!activeWords.length) {
    return (
      <div className={styles.empty}>
        <p>No words in this category. Add some words to get started!</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className={styles.container}>
        <div className={styles.startCard}>
          <span className={styles.startIcon} aria-hidden="true">✏️</span>
          <h1 className={styles.startTitle}>Spelling Test</h1>
          <p className={styles.startInfo}>
            You'll hear {shuffled.length} words spoken aloud. Type the correct spelling for each one.
          </p>
          <button className={styles.startButton} onClick={handleStart}>
            Start Test
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const total = score.correct + score.incorrect + score.skipped;
    const pct = total > 0 ? Math.round((score.correct / total) * 100) : 0;
    return (
      <div className={styles.container}>
        <div className={styles.finishCard}>
          <span className={styles.finishIcon} aria-hidden="true">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</span>
          <h1 className={styles.finishTitle}>Test Complete!</h1>
          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{score.correct}</span>
              <span>Correct</span>
            </div>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{score.incorrect}</span>
              <span>Incorrect</span>
            </div>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{score.skipped}</span>
              <span>Skipped</span>
            </div>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{pct}%</span>
              <span>Score</span>
            </div>
          </div>
          <button className={styles.startButton} onClick={handleStart}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.visuallyHidden}>Spelling Test</h1>
      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={shuffled.length}
        aria-valuenow={index}
        aria-label={`Word ${index + 1} of ${shuffled.length}`}
      >
        <div className={styles.progressFill} style={{ width: `${((index) / shuffled.length) * 100}%` }} />
      </div>
      <div className={styles.counter}>
        Word {index + 1} of {shuffled.length}
      </div>

      <div className={styles.card}>
        <button className={styles.speakBtn} onClick={speakCurrent} aria-label="Say the word again">
          <span aria-hidden="true">🔊 </span>Play Again
        </button>

        <p className={styles.definition}>{current.definition}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="spelling-answer" className={styles.visuallyHidden}>
            Type the word you heard
          </label>
          <input
            id="spelling-answer"
            ref={inputRef}
            className={`${styles.input} ${feedback === 'correct' ? styles.inputCorrect : ''} ${feedback === 'incorrect' ? styles.inputIncorrect : ''}`}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type the word..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={!!feedback}
            aria-invalid={feedback === 'incorrect' ? 'true' : 'false'}
          />
          {!feedback && (
            <button type="submit" className={styles.submitBtn} disabled={!input.trim()}>
              Check
            </button>
          )}
        </form>

        <div role="status" aria-live="polite" className={styles.visuallyHidden}>
          {feedback === 'correct' && 'Correct!'}
          {feedback === 'incorrect' && `Incorrect. The correct spelling is ${current.word}.`}
        </div>

        {feedback === 'correct' && (
          <div className={styles.correctFeedback}>
            <span className={styles.feedbackIcon} aria-hidden="true">✅</span> Correct!
          </div>
        )}

        {feedback === 'incorrect' && (
          <div className={styles.incorrectFeedback}>
            <span className={styles.feedbackIcon} aria-hidden="true">❌</span>
            The correct spelling is: <strong>{current.word}</strong>
          </div>
        )}

        {feedback && (
          <div className={styles.afterFeedback}>
            <button className={styles.nextBtn} onClick={handleNext}>
              Next →
            </button>
          </div>
        )}

        {!feedback && (
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip this word
          </button>
        )}
      </div>

      <div className={styles.liveScore}>
        ✅ {score.correct} &nbsp; ❌ {score.incorrect} &nbsp; ⏭ {score.skipped}
      </div>
    </div>
  );
}
