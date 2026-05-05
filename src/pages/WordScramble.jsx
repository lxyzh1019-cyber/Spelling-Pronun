import { useState, useEffect, useCallback } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './WordScramble.module.css';

function scrambleWord(word) {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Make sure scrambled is actually different
  if (letters.join('') === word && letters.length > 2) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function WordScramble() {
  const { activeWords, recordResult } = useWords();
  const [currentWord, setCurrentWord] = useState(null);
  const [scrambled, setScrambled] = useState([]);
  const [built, setBuilt] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect'
  const [hintRevealed, setHintRevealed] = useState(false);

  const newWord = useCallback(() => {
    if (!activeWords.length) return;
    const word = pickRandom(activeWords);
    const scr = scrambleWord(word.word);
    setCurrentWord(word);
    setScrambled(scr);
    setBuilt([]);
    setRemaining(scr.map((l, i) => i));
    setAttemptsLeft(3);
    setFeedback(null);
    setHintRevealed(false);
  }, [activeWords]);

  useEffect(() => {
    newWord();
  }, [newWord]);

  const handleLetterClick = (idx) => {
    if (feedback) return;
    const letter = scrambled[idx];
    setBuilt((b) => [...b, { letter, sourceIdx: idx }]);
    setRemaining((r) => r.filter((i) => i !== idx));
  };

  const handleBuiltClick = (builtIdx) => {
    if (feedback) return;
    const removed = built[builtIdx];
    setBuilt((b) => b.filter((_, i) => i !== builtIdx));
    setRemaining((r) => [...r, removed.sourceIdx].sort((a, b) => a - b));
  };

  const handleCheck = () => {
    const guess = built.map((b) => b.letter).join('');
    const isCorrect = guess === currentWord.word;
    if (isCorrect) {
      setFeedback('correct');
      recordResult(currentWord.word, true);
    } else {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      if (newAttempts <= 0) {
        setFeedback('incorrect');
        recordResult(currentWord.word, false);
      } else {
        // Wrong but still have attempts — just let them try again
        setFeedback(null);
      }
    }
  };

  const handleHint = () => {
    if (hintRevealed) return;
    setHintRevealed(true);
    // Place the first letter of the word automatically
    const firstLetter = currentWord.word[0];
    const idxInScrambled = remaining.find((i) => scrambled[i].toLowerCase() === firstLetter.toLowerCase());
    if (idxInScrambled !== undefined) {
      setBuilt((b) => [...b, { letter: firstLetter, sourceIdx: idxInScrambled }]);
      setRemaining((r) => r.filter((i) => i !== idxInScrambled));
    }
  };

  const handleReset = () => {
    // Reset current word's tiles without picking a new word
    setBuilt([]);
    setRemaining(scrambled.map((_, i) => i));
    setAttemptsLeft(3);
    setFeedback(null);
    setHintRevealed(false);
  };

  if (!activeWords.length) {
    return (
      <div className={styles.empty}>
        <p>No words in this category. Add some words to get started!</p>
      </div>
    );
  }

  if (!currentWord) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Word Scramble</h1>
      <p className={styles.hint}>Unscramble the letters to spell the word</p>

      <div className={styles.definitionCard}>
        <span className={styles.defLabel}>Hint:</span>
        <span className={styles.defText}>{currentWord.definition}</span>
      </div>

      <div className={styles.attemptsRow} role="status" aria-label={`${attemptsLeft} attempts remaining`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`${styles.attemptDot} ${i < attemptsLeft ? styles.attemptActive : styles.attemptUsed}`}
          />
        ))}
      </div>

      {/* Built word - where user arranges letters */}
      <div className={styles.builtRow}>
        {built.map((item, i) => (
          <button
            key={`built-${i}`}
            className={`${styles.tile} ${styles.builtTile}`}
            onClick={() => handleBuiltClick(i)}
            disabled={!!feedback}
          >
            {item.letter}
          </button>
        ))}
        {built.length === 0 && (
          <span className={styles.placeholder}>Click letters below to build the word</span>
        )}
      </div>

      {feedback === 'correct' && (
        <div className={styles.correctMsg} role="status" aria-live="polite">
          <span aria-hidden="true">✅ </span>Correct! Well done!
        </div>
      )}
      {feedback === 'incorrect' && (
        <div className={styles.incorrectMsg} role="alert">
          <span aria-hidden="true">❌ </span>The word was: <strong>{currentWord.word}</strong>
        </div>
      )}

      {/* Scrambled letters pool */}
      <div className={styles.scrambleRow}>
        {scrambled.map((letter, i) => (
          <button
            key={i}
            className={`${styles.tile} ${styles.scrambleTile} ${!remaining.includes(i) ? styles.usedTile : ''}`}
            onClick={() => handleLetterClick(i)}
            disabled={!remaining.includes(i) || !!feedback}
          >
            {!remaining.includes(i) ? '' : letter}
          </button>
        ))}
      </div>

      <div className={styles.actionRow}>
        {!feedback && built.length > 0 && (
          <button className={styles.checkBtn} onClick={handleCheck}>
            Check
          </button>
        )}
        {!feedback && !hintRevealed && (
          <button className={styles.hintBtn} onClick={handleHint}>
            <span aria-hidden="true">💡 </span>Hint
          </button>
        )}
      </div>

      {feedback && (
        <div className={styles.afterRow}>
          <button className={styles.nextBtn} onClick={newWord}>
            Next Word →
          </button>
        </div>
      )}

      {!feedback && (
        <div className={styles.bottomRow}>
          <button className={styles.resetBtn} onClick={handleReset}>
            🔄 Reset
          </button>
          <button className={styles.skipBtn} onClick={newWord}>
            Skip Word
          </button>
        </div>
      )}
    </div>
  );
}
