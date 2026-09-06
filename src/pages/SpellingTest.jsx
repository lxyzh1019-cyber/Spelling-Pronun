import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { speak } from '../utils/speech';
import { shuffle } from '../utils/shuffle';
import { EMPTY_SCORE, createSessionSnapshot, isPerfectScore, nextScore, restoreSessionSnapshot, scoreTotal } from '../learning/r1Core';
import { readJson, sessionStorageKey, writeJson } from '../utils/localStore';
import { playCorrectSound, playIncorrectSound, playMilestoneSound, playHintSound } from '../utils/sounds';
import { hapticSuccess, hapticError, hapticMilestone } from '../utils/haptics';
import { triggerConfetti, triggerFireworks } from '../utils/confetti';
import MultiplayerWrapper from '../components/MultiplayerWrapper';
import styles from './SpellingTest.module.css';

export default function SpellingTest() {
  return (
    <MultiplayerWrapper>
      <SpellingTestInner />
    </MultiplayerWrapper>
  );
}

function SpellingTestInner({ sessionLearnerId }) {
  const location = useLocation();
  const {
    activeWords,
    activeProfileId,
    recordResult,
    selectedCategory,
    soundEnabled,
    unlockAchievement,
    useHint,
    hintsUsedToday,
    dailyChallengeWord,
    dailyChallengeId,
    recordDailyChallengeAttempt,
  } = useWords();
  const mode = new URLSearchParams(location.search).get('mode') === 'daily' ? 'daily' : 'practice';
  const learnerId = sessionLearnerId || activeProfileId;
  const availableWords = mode === 'daily' ? (dailyChallengeWord || []) : activeWords;
  const category = mode === 'daily' ? dailyChallengeId || 'daily-loading' : selectedCategory;
  const sessionKey = sessionStorageKey(learnerId, mode, category);
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ ...EMPTY_SCORE });
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [showHintContent, setShowHintContent] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const inputRef = useRef(null);

  const resetSession = useCallback((autoStart = false) => {
    const freshWords = mode === 'daily' ? [...availableWords] : shuffle(availableWords);
    setWords(freshWords);
    setIndex(0);
    setInput('');
    setFeedback(null);
    setScore({ ...EMPTY_SCORE });
    setFinished(false);
    setStarted(autoStart);
    setShowHintContent(false);
    setSpeechError(null);
    return freshWords;
  }, [availableWords, mode]);

  useEffect(() => {
    if (!availableWords.length) return;
    const restored = restoreSessionSnapshot(readJson(sessionKey), {
      learnerId,
      mode,
      category,
      words: availableWords,
    });
    if (restored) {
      setWords(restored.words);
      setIndex(Math.min(restored.index, restored.words.length - 1));
      setScore(restored.score || { ...EMPTY_SCORE });
      setStarted(Boolean(restored.started));
      setFinished(Boolean(restored.finished));
      setInput('');
      setFeedback(null);
    } else {
      resetSession(false);
    }
  }, [sessionKey, learnerId, mode, category, availableWords, resetSession]);

  useEffect(() => {
    if (!words.length) return;
    writeJson(sessionKey, createSessionSnapshot({ learnerId, mode, category, words, index, score, started, finished }));
  }, [sessionKey, learnerId, mode, category, words, index, score, started, finished]);

  const current = words[index];

  const speakWord = useCallback(async (word = current) => {
    if (!word) return;
    const result = await speak(word.word, { lang: 'en-CA' });
    setSpeechError(result?.ok ? null : 'Audio could not start. Tap Play Again to retry, or continue without audio.');
  }, [current]);

  const handleStart = () => {
    const startingWords = finished ? resetSession(true) : words;
    setStarted(true);
    setTimeout(() => {
      speakWord(startingWords[0]);
      inputRef.current?.focus();
    }, 100);
  };

  const handleUseHint = async () => {
    const success = await useHint();
    if (success) {
      playHintSound();
      setShowHintContent(true);
    }
  };

  const persistOutcome = (outcome, correct) => {
    const evidenceType = outcome === 'skipped'
      ? 'skip'
      : showHintContent ? 'assisted_spelling' : 'independent_spelling';
    recordResult(current.id, correct, {
      learnerId,
      evidenceType,
      helped: showHintContent,
      skipped: outcome === 'skipped',
      sessionId: sessionKey,
    });
    if (mode === 'daily') recordDailyChallengeAttempt(current.id, outcome);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim() || feedback || !current) return;
    const correct = input.trim().toLowerCase() === current.word.toLowerCase();
    setFeedback(correct ? 'correct' : 'incorrect');
    setScore((previous) => nextScore(previous, correct ? 'correct' : 'incorrect'));
    persistOutcome(correct ? 'correct' : 'incorrect', correct);
    if (correct) {
      if (soundEnabled) playCorrectSound();
      hapticSuccess();
      triggerConfetti('light');
    } else {
      if (soundEnabled) playIncorrectSound();
      hapticError();
    }
  };

  const finishSession = (finalScore) => {
    setScore(finalScore);
    setFinished(true);
    if (mode !== 'daily' && isPerfectScore(finalScore)) {
      if (soundEnabled) playMilestoneSound();
      hapticMilestone();
      triggerFireworks();
      unlockAchievement('perfect_round');
    }
  };

  const handleNext = (finalScore = score) => {
    if (index + 1 >= words.length) {
      finishSession(finalScore);
      return;
    }
    const nextWord = words[index + 1];
    setIndex((value) => value + 1);
    setInput('');
    setFeedback(null);
    setShowHintContent(false);
    setTimeout(() => {
      speakWord(nextWord);
      inputRef.current?.focus();
    }, 100);
  };

  const handleSkip = () => {
    if (!current) return;
    const finalScore = nextScore(score, 'skipped');
    setScore(finalScore);
    persistOutcome('skipped', false);
    handleNext(finalScore);
  };

  if (!availableWords.length || !words.length) {
    return <div className={styles.empty}><p>{mode === 'daily' ? 'Preparing today’s challenge…' : 'No words in this category.'}</p></div>;
  }

  if (!started) {
    return (
      <div className={styles.container}>
        <div className={styles.startCard}>
          <span className={styles.startIcon} aria-hidden="true">✏️</span>
          <h1 className={styles.startTitle}>{mode === 'daily' ? 'Daily Challenge' : 'Spelling Test'}</h1>
          <p className={styles.startInfo}>You’ll hear {words.length} words. Type each spelling, or skip it for later practice.</p>
          <button className={styles.startButton} onClick={handleStart}>Start {mode === 'daily' ? 'Challenge' : 'Test'}</button>
        </div>
      </div>
    );
  }

  if (finished) {
    const total = scoreTotal(score);
    const percentage = total ? Math.round((score.correct / total) * 100) : 0;
    const perfect = mode !== 'daily' && isPerfectScore(score);
    return (
      <div className={styles.container}>
        <div className={styles.finishCard}>
          <span className={styles.finishIcon} aria-hidden="true">{perfect ? '👑' : percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}</span>
          <h1 className={styles.finishTitle}>{mode === 'daily' ? 'Challenge Complete!' : 'Test Complete!'}</h1>
          {perfect && <p className={styles.perfect}>Perfect Score! 🌟</p>}
          <div className={styles.finishStats}>
            <div className={styles.finishStat}><span className={styles.finishStatNum}>{score.correct}</span><span>Correct</span></div>
            <div className={styles.finishStat}><span className={styles.finishStatNum}>{score.incorrect}</span><span>Incorrect</span></div>
            <div className={styles.finishStat}><span className={styles.finishStatNum}>{score.skipped}</span><span>Skipped</span></div>
            <div className={styles.finishStat}><span className={styles.finishStatNum}>{percentage}%</span><span>Score</span></div>
          </div>
          <button className={styles.startButton} onClick={handleStart}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.visuallyHidden}>{mode === 'daily' ? 'Daily Challenge' : 'Spelling Test'}</h1>
      <div className={styles.progressBar} role="progressbar" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={index} aria-label={`Word ${index + 1} of ${words.length}`}>
        <div className={styles.progressFill} style={{ width: `${(index / words.length) * 100}%` }} />
      </div>
      <div className={styles.counter}>Word {index + 1} of {words.length}</div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <button className={styles.speakBtn} onClick={() => speakWord()} aria-label="Say the word again"><span aria-hidden="true">🔊 </span>Play Again</button>
          <button className={styles.hintBtn} onClick={handleUseHint} disabled={hintsUsedToday >= 3} title={`${3 - hintsUsedToday} hints left`} aria-label={`Use hint (${3 - hintsUsedToday} remaining)`}>💡 {3 - hintsUsedToday}</button>
        </div>
        {speechError && <p role="alert">{speechError}</p>}
        <p className={styles.definition}>{current.definition}</p>
        {showHintContent && <div className={styles.hintBox}><p><strong>Hint:</strong> {current.word.charAt(0).toUpperCase()}… ({current.word.length} letters)</p></div>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="spelling-answer" className={styles.visuallyHidden}>Type the word you heard</label>
          <input id="spelling-answer" ref={inputRef} className={`${styles.input} ${feedback === 'correct' ? styles.inputCorrect : ''} ${feedback === 'incorrect' ? styles.inputIncorrect : ''}`} type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type the word…" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={Boolean(feedback)} aria-invalid={feedback === 'incorrect' ? 'true' : 'false'} />
          {!feedback && <button type="submit" className={styles.submitBtn} disabled={!input.trim()}>Check</button>}
        </form>
        <div role="status" aria-live="polite" className={styles.visuallyHidden}>{feedback === 'correct' && 'Correct!'}{feedback === 'incorrect' && `Incorrect. The correct spelling is ${current.word}.`}</div>
        {feedback === 'correct' && <div className={styles.correctFeedback}><span aria-hidden="true">✅</span> Correct!</div>}
        {feedback === 'incorrect' && <div className={styles.incorrectFeedback}><span aria-hidden="true">❌</span> The correct spelling is: <strong>{current.word}</strong></div>}
        {feedback ? <div className={styles.afterFeedback}><button className={styles.nextBtn} onClick={() => handleNext()}>Next →</button></div> : <button className={styles.skipBtn} onClick={handleSkip}>Skip this word</button>}
      </div>
      <div className={styles.liveScore}>✅ {score.correct} &nbsp; ❌ {score.incorrect} &nbsp; ⏭ {score.skipped}</div>
    </div>
  );
}
