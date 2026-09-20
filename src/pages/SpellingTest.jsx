import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useCancellableSpeech } from '../hooks/useCancellableSpeech';
import { shuffle } from '../utils/shuffle';
import { EMPTY_SCORE, createSessionSnapshot, isPerfectScore, nextScore, restoreSessionSnapshot } from '../learning/r1Core';
import {
  answerFrom, backspace, checkAnswer, clearEntry, createEntry, feedbackCopy, hintLabel, hintText,
  isComplete, makeResult, placeTile, removeSlot, resultBadge, resultNote, resultsSummary, retryQueue,
  slotStates, spentTileIds, typeLetter, undoLast,
} from '../learning/spellingRound';
import { DOT_TIMING } from '../learning/dotExpressions';
import { addSpellAgain, removeSpellAgain, spellAgainWords } from '../persistence/spellAgain';
import { inputModeStorageKey, readJson, sessionStorageKey, spellAgainStorageKey, writeJson } from '../utils/localStore';
import { playCorrectSound, playIncorrectSound, playMilestoneSound, playHintSound } from '../utils/sounds';
import { hapticSuccess, hapticError, hapticMilestone } from '../utils/haptics';
import { triggerConfetti, triggerFireworks } from '../utils/confetti';
import MultiplayerWrapper from '../components/MultiplayerWrapper';
import Dot from '../components/Dot';
import styles from './SpellingTest.module.css';

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const BURST = [...new Array(16)].map((_, index) => {
  const angle = ((Math.PI * 2 * index) / 16);
  return { id: index, x: Math.round(Math.cos(angle) * 140), y: Math.round(Math.sin(angle) * 140 - 40) };
});

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
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'daily' ? 'daily' : 'practice';
  const learnerId = sessionLearnerId || activeProfileId;
  // The words this learner kept from an earlier round. Read on every render so the start screen and the
  // "Save for later" button never disagree about how many are waiting.
  const savedList = readJson(spellAgainStorageKey(learnerId), []);
  const savedWords = spellAgainWords(savedList);
  const [source, setSource] = useState(() => (params.get('source') === 'again' ? 'again' : 'list'));
  const usingSaved = source === 'again' && mode !== 'daily' && savedWords.length > 0;
  const availableWords = mode === 'daily' ? (dailyChallengeWord || []) : usingSaved ? savedWords : activeWords;
  const listName = mode === 'daily' ? 'Daily challenge' : usingSaved ? 'Spell again' : selectedCategory;
  const category = mode === 'daily' ? dailyChallengeId || 'daily-loading' : usingSaved ? 'spell-again' : selectedCategory;
  const sessionKey = sessionStorageKey(learnerId, mode, category);
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ ...EMPTY_SCORE });
  const [results, setResults] = useState([]);
  const [round, setRound] = useState(null);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [showHintContent, setShowHintContent] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [inputMode, setInputMode] = useState(() => (readJson(inputModeStorageKey(learnerId), 'tiles') === 'keyboard' ? 'keyboard' : 'tiles'));
  const [dotExpression, setDotExpression] = useState('idle');
  const [toast, setToast] = useState('');
  const speechTimerRef = useRef(null);
  const idleTimersRef = useRef([]);
  const pointingTimerRef = useRef(null);

  const resetSession = useCallback((autoStart = false) => {
    const freshWords = mode === 'daily' ? [...availableWords] : shuffle(availableWords);
    setWords(freshWords);
    setIndex(0);
    setEntry(freshWords[0] ? createEntry(freshWords[0], { inputMode }) : null);
    setFeedback(null);
    setScore({ ...EMPTY_SCORE });
    setResults([]);
    setRound(null);
    setFinished(false);
    setStarted(autoStart);
    setShowHintContent(false);
    setSpeechError(null);
    setDotExpression('idle');
    return freshWords;
  }, [availableWords, mode, inputMode]);

  useEffect(() => {
    if (!availableWords.length) return;
    const restored = restoreSessionSnapshot(readJson(sessionKey), {
      learnerId,
      mode,
      category,
      words: availableWords,
    });
    if (restored) {
      const restoredIndex = Math.min(restored.index, restored.words.length - 1);
      setWords(restored.words);
      setIndex(restoredIndex);
      setScore(restored.score || { ...EMPTY_SCORE });
      setResults(restored.results || []);
      setRound(restored.round || null);
      setStarted(Boolean(restored.started));
      setFinished(Boolean(restored.finished));
      // The letters in the row are not restored; the word is re-offered empty so nothing half-placed
      // is ever read as an answer the child gave.
      setEntry(createEntry(restored.words[restoredIndex], { inputMode }));
      setFeedback(null);
    } else {
      resetSession(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, learnerId, mode, category, availableWords]);

  useEffect(() => {
    if (!words.length) return;
    writeJson(sessionKey, createSessionSnapshot({ learnerId, mode, category, words, index, score, started, finished, results, round }));
  }, [sessionKey, learnerId, mode, category, words, index, score, started, finished, results, round]);

  const current = words[index];
  const { play: playSpeech } = useCancellableSpeech(`${sessionKey}:${current?.id || current?.word || 'none'}`);

  useEffect(() => () => clearTimeout(speechTimerRef.current), [sessionKey]);
  useEffect(() => () => {
    idleTimersRef.current.forEach(clearTimeout);
    clearTimeout(pointingTimerRef.current);
  }, []);

  // Dot goes quiet, then thoughtful, then to sleep. Any touch wakes her. She never says any of it.
  const armIdle = useCallback(() => {
    idleTimersRef.current.forEach(clearTimeout);
    idleTimersRef.current = [
      setTimeout(() => setDotExpression((current) => (current === 'idle' ? 'thinking' : current)), DOT_TIMING.thinkingAfterMs),
      setTimeout(() => setDotExpression((current) => (current === 'idle' || current === 'thinking' ? 'asleep' : current)), DOT_TIMING.asleepAfterMs),
    ];
  }, []);

  const touch = useCallback(() => {
    setDotExpression((current) => (current === 'thinking' || current === 'asleep' ? 'idle' : current));
    armIdle();
  }, [armIdle]);

  const speakWord = useCallback(async (word = current) => {
    if (!word) return;
    const result = await playSpeech(word.word, { lang: 'en-CA' });
    if (result.reason === 'cancelled') return;
    setSpeechError(result?.ok ? null : 'Audio could not start. Tap Hear it again to retry, or continue without audio.');
  }, [current, playSpeech]);

  const queueWordSpeech = (word) => {
    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => speakWord(word), 100);
  };

  const beginRound = (roundWords, nextRound) => {
    setWords(roundWords);
    setIndex(0);
    setEntry(createEntry(roundWords[0], { inputMode }));
    setFeedback(null);
    setScore({ ...EMPTY_SCORE });
    setResults([]);
    setRound(nextRound);
    setFinished(false);
    setStarted(true);
    setShowHintContent(false);
    setDotExpression('idle');
    queueWordSpeech(roundWords[0]);
    armIdle();
  };

  const handleStart = () => {
    const startingWords = finished ? resetSession(true) : words;
    setStarted(true);
    setEntry(createEntry(startingWords[0], { inputMode }));
    queueWordSpeech(startingWords[0]);
    armIdle();
  };

  const startSaved = () => {
    setSource('again');
    setStarted(false);
  };

  const chooseInputMode = (next) => {
    touch();
    setInputMode(next);
    writeJson(inputModeStorageKey(learnerId), next);
    if (current && !feedback) setEntry(createEntry(current, { inputMode: next }));
  };

  const handleUseHint = async () => {
    touch();
    if (showHintContent || feedback || hintsUsedToday >= 3) return;
    const success = await useHint();
    if (!success) return;
    playHintSound();
    setShowHintContent(true);
    setDotExpression('pointing');
    clearTimeout(pointingTimerRef.current);
    pointingTimerRef.current = setTimeout(() => setDotExpression((current) => (current === 'pointing' ? 'idle' : current)), DOT_TIMING.pointingMs);
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
      inputMode,
      sessionId: sessionKey,
    });
    // A retry round is practice. The daily challenge keeps the answer the child gave it the first time.
    if (mode === 'daily' && round?.kind !== 'retry') recordDailyChallengeAttempt(current.id, outcome);
  };

  const handleCheck = () => {
    if (!current || !entry || feedback || !isComplete(entry)) return;
    touch();
    const { correct, attempt } = checkAnswer(current, answerFrom(entry));
    setFeedback(correct ? 'correct' : 'incorrect');
    setScore((previous) => nextScore(previous, correct ? 'correct' : 'incorrect'));
    setResults((previous) => [...previous, makeResult({ word: current, outcome: correct ? 'correct' : 'incorrect', attempt, assisted: showHintContent, inputMode })]);
    persistOutcome(correct ? 'correct' : 'incorrect', correct);
    // A word kept for later leaves the list once it is spelled unaided. Spelled with a hint, it stays:
    // a helped answer is not evidence that it is learned, and this list is what the child comes back to.
    if (usingSaved && correct && !showHintContent) {
      writeJson(spellAgainStorageKey(learnerId), removeSpellAgain(savedList, [current.id]));
    }
    setDotExpression(correct ? 'happy' : 'oops');
    idleTimersRef.current.forEach(clearTimeout);
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
    setDotExpression('idle');
    idleTimersRef.current.forEach(clearTimeout);
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
    setEntry(createEntry(nextWord, { inputMode }));
    setFeedback(null);
    setShowHintContent(false);
    setDotExpression('idle');
    queueWordSpeech(nextWord);
    armIdle();
  };

  const handleSkip = () => {
    if (!current || feedback) return;
    touch();
    const finalScore = nextScore(score, 'skipped');
    setScore(finalScore);
    setResults((previous) => [...previous, makeResult({ word: current, outcome: 'skipped', inputMode })]);
    persistOutcome('skipped', false);
    handleNext(finalScore);
  };

  // A physical keyboard is accepted alongside the in-app one. The in-app keyboard exists because the
  // iOS one resizes the viewport and breaks the landscape layout, so there is deliberately no input.
  useEffect(() => {
    if (!started || finished || inputMode !== 'keyboard') return undefined;
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (feedback) handleNext(); else handleCheck();
        return;
      }
      if (feedback) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        touch();
        setEntry((value) => (value ? backspace(value) : value));
        return;
      }
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        touch();
        setEntry((value) => (value ? typeLetter(value, event.key.toLowerCase()) : value));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!availableWords.length || !words.length || !entry) {
    return <div className={styles.empty}><p>{mode === 'daily' ? 'Preparing today’s challenge…' : 'No words in this category.'}</p></div>;
  }

  if (!started) {
    return (
      <div className={styles.page}>
        <div className={styles.startCard}>
          <Dot expression="idle" size={180} />
          <h1 className={styles.startTitle}>{mode === 'daily' ? 'Daily challenge' : usingSaved ? 'Spell again' : 'Spelling test'}</h1>
          <p className={styles.startInfo}>
            You’ll hear {words.length} words. Spell each one with tiles or the keyboard, or skip it — skipped words are
            listed at the end so you can try them again.
          </p>
          <div className={styles.startActions}>
            <button className={styles.primaryBtn} onClick={handleStart}>Start</button>
            {mode !== 'daily' && savedWords.length > 0 && !usingSaved && (
              <button className={styles.secondaryBtn} onClick={startSaved}>Spell again ({savedWords.length})</button>
            )}
            {usingSaved && <button className={styles.secondaryBtn} onClick={() => { setSource('list'); setStarted(false); }}>Back to the word list</button>}
          </div>
          {toast && <p className={styles.toast} role="status">{toast}</p>}
        </div>
      </div>
    );
  }

  if (finished) {
    const summary = resultsSummary(results);
    const queue = retryQueue(results, words);
    const saveForLater = () => {
      const keep = queue.label === 'Go again' ? [] : queue.words;
      if (keep.length) writeJson(spellAgainStorageKey(learnerId), addSpellAgain(savedList, keep, { savedAt: new Date().toISOString() }));
      setToast(keep.length ? `Saved — ${keep.length} words waiting under Spell again.` : 'Nothing to save — every word was right.');
      setSource('list');
      resetSession(false);
    };
    return (
      <div className={styles.page}>
        <div className={styles.resultsHead}>
          <Dot expression={summary.dot} size={110} />
          <div>
            <h1 className={styles.resultsTitle}>{summary.title}</h1>
            <p className={styles.resultsSub}>{summary.correct} of {summary.total} right · {summary.pct}%</p>
          </div>
          <div className={styles.stats}>
            <div className={`${styles.stat} ${styles.statCorrect}`}><span className={styles.statNum}>{summary.correct}</span><span>Correct</span></div>
            <div className={`${styles.stat} ${styles.statMissed}`}><span className={styles.statNum}>{summary.missed}</span><span>Missed</span></div>
            <div className={`${styles.stat} ${styles.statSkipped}`}><span className={styles.statNum}>{summary.skipped}</span><span>Skipped</span></div>
          </div>
        </div>
        <div className={styles.review}>
          <h2 className={styles.reviewHeading}>This round, word by word</h2>
          <ul className={styles.reviewList}>
            {results.map((result, position) => (
              <li className={`${styles.reviewRow} ${styles[`row_${result.outcome}`]}`} key={`${result.wordId}-${position}`}>
                <span className={styles.reviewBadge} aria-hidden="true">{resultBadge(result)}</span>
                <span className={styles.reviewWord}>{result.word}</span>
                <span className={styles.reviewNote}>{resultNote(result)}</span>
                <button className={styles.hearRow} onClick={() => playSpeech(result.word, { lang: 'en-CA' })} aria-label={`Hear ${result.word} again`}>🔊</button>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.resultsFooter}>
          <button className={styles.retryBtn} onClick={() => beginRound(shuffle(queue.words), { kind: 'retry', number: (round?.number || 1) + 1 })}>
            <span className={styles.footerTitle}>{queue.label}</span>
            <span className={styles.footerSub}>Same words, right now</span>
          </button>
          <button className={styles.saveBtn} onClick={saveForLater}>
            <span className={styles.footerTitle}>Save for later</span>
            <span className={styles.footerSub}>Goes to “Spell again” on the start screen</span>
          </button>
        </div>
      </div>
    );
  }

  const states = slotStates(current, entry, feedback);
  const spent = spentTileIds(entry);
  const answered = entry.slots.some(Boolean);
  const complete = isComplete(entry);
  const narrow = current.word.length > 8;
  const copy = feedback ? feedbackCopy(current, feedback === 'correct', showHintContent) : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link className={styles.backBtn} to="/" aria-label="Back to home"><span aria-hidden="true">←</span></Link>
          <div>
            <h1 className={styles.title}>{mode === 'daily' ? 'Daily challenge' : 'Spelling test'}</h1>
            <p className={styles.meta}>{listName} · word {index + 1} of {words.length}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <p className={styles.liveScore}>
            <span className={styles.scoreCorrect}>✓ {score.correct}</span>
            <span className={styles.scoreWrong}>✗ {score.incorrect}</span>
            <span>↷ {score.skipped}</span>
          </p>
          <div className={styles.modeToggle} role="group" aria-label="How to answer">
            <button className={inputMode === 'tiles' ? styles.modeOn : styles.modeOff} aria-pressed={inputMode === 'tiles'} onClick={() => chooseInputMode('tiles')}>Tiles</button>
            <button className={inputMode === 'keyboard' ? styles.modeOn : styles.modeOff} aria-pressed={inputMode === 'keyboard'} onClick={() => chooseInputMode('keyboard')}>Keyboard</button>
          </div>
        </div>
      </div>

      <div className={styles.progressBar} role="progressbar" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={index} aria-label={`Word ${index + 1} of ${words.length}`}>
        <div className={styles.progressFill} style={{ width: `${(index / words.length) * 100}%` }} />
      </div>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <button className={styles.dotButton} onClick={handleUseHint} aria-label={hintLabel(hintsUsedToday, showHintContent)}>
            <Dot expression={dotExpression} size={140} />
          </button>
          <p className={styles.definition}>{current.definition}</p>
          {showHintContent && <p className={styles.hintBox}>{hintText(current)}</p>}
          {speechError && <p className={styles.noSound} role="alert">{speechError}</p>}
          <div className={styles.panelActions}>
            <button className={styles.hearBtn} onClick={() => { touch(); speakWord(); }}><span aria-hidden="true">🔊 </span>Hear it again</button>
            <button className={styles.askBtn} onClick={handleUseHint} disabled={showHintContent || hintsUsedToday >= 3}>{hintLabel(hintsUsedToday, showHintContent)}</button>
          </div>
        </div>

        <div className={styles.answerColumn}>
          <div className={styles.answerCard}>
            <p className={styles.answerLabel}><span>YOUR ANSWER</span><span className={styles.answerMode}>{inputMode === 'tiles' ? 'Tap the letters below' : 'Type it on the keyboard'}</span></p>
            <div className={`${styles.slotRow} ${feedback === 'incorrect' ? styles.slotRowShake : ''}`} role="group" aria-label="Your answer">
              {entry.slots.map((slot, position) => {
                const state = states[position];
                const className = `${styles.slot} ${styles[`slot_${state}`]} ${narrow ? styles.slotNarrow : ''}`;
                if (slot && !feedback && inputMode === 'tiles') {
                  return <button className={className} key={position} onClick={() => { touch(); setEntry((value) => removeSlot(value, position)); }} aria-label={`Remove ${slot.letter}`}>{slot.letter}</button>;
                }
                return <span className={className} key={position} style={feedback === 'correct' ? { animationDelay: `${position * 50}ms` } : undefined}>{slot ? slot.letter : ''}</span>;
              })}
              {feedback === 'correct' && <span className={styles.burst} aria-hidden="true">
                {BURST.map((spark) => <i key={spark.id} style={{ '--bx': `${spark.x}px`, '--by': `${spark.y}px` }} />)}
              </span>}
            </div>

            <div role="status" aria-live="polite" className={styles.visuallyHidden}>
              {feedback === 'correct' && 'Correct!'}
              {feedback === 'incorrect' && `Incorrect. The correct spelling is ${current.word}.`}
            </div>

            {copy ? (
              <div className={`${styles.feedbackBar} ${copy.tone === 'green' ? styles.feedbackGreen : styles.feedbackRed}`}>
                <strong className={styles.feedbackTitle}>{copy.title}</strong>
                <span className={styles.feedbackBody}>{copy.body}</span>
                <button className={styles.nextBtn} onClick={() => handleNext()}>{index + 1 >= words.length ? 'See results →' : 'Next word →'}</button>
              </div>
            ) : (
              <div className={styles.controls}>
                <button className={styles.ghostBtn} disabled={!answered} onClick={() => { touch(); setEntry((value) => undoLast(value)); }}><span aria-hidden="true">↶ </span>Undo</button>
                <button className={styles.ghostBtn} disabled={!answered} onClick={() => { touch(); setEntry((value) => clearEntry(value)); }}>Clear</button>
                <button className={styles.skipBtn} onClick={handleSkip}>Skip this word</button>
                <button className={styles.checkBtn} disabled={!complete} onClick={handleCheck}>Check <span aria-hidden="true">✓</span></button>
              </div>
            )}
          </div>

          {inputMode === 'tiles' ? (
            <div className={styles.bank} role="group" aria-label="Letter tiles">
              {entry.bank.map((tile) => (
                <button
                  className={`${styles.tile} ${spent.has(tile.id) ? styles.tileSpent : ''}`}
                  key={tile.id}
                  disabled={spent.has(tile.id) || Boolean(feedback)}
                  onClick={() => { touch(); setEntry((value) => placeTile(value, tile.id)); }}
                >{tile.letter}</button>
              ))}
            </div>
          ) : (
            <div className={styles.keyboard} role="group" aria-label="Keyboard">
              {KEY_ROWS.map((row, rowIndex) => (
                <div className={styles.keyRow} key={row}>
                  {[...row].map((letter) => (
                    <button className={styles.key} key={letter} disabled={Boolean(feedback)} onClick={() => { touch(); setEntry((value) => typeLetter(value, letter)); }}>{letter}</button>
                  ))}
                  {rowIndex === KEY_ROWS.length - 1 && (
                    <button className={`${styles.key} ${styles.keyWide}`} disabled={Boolean(feedback)} onClick={() => { touch(); setEntry((value) => backspace(value)); }} aria-label="Backspace">⌫</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
