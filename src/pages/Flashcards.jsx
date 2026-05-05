import { useState, useCallback } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './Flashcards.module.css';

function speak(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1;
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards() {
  const { activeWords } = useWords();
  const [cards, setCards] = useState(() => [...activeWords]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffledMode, setShuffledMode] = useState(false);

  const current = cards[index];

  const handleFlip = () => setFlipped((f) => !f);

  const handlePrev = () => {
    setFlipped(false);
    setIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };

  const handleShuffle = () => {
    setCards(shuffle(cards));
    setIndex(0);
    setFlipped(false);
  };

  const toggleShuffleMode = () => {
    if (!shuffledMode) {
      handleShuffle();
    } else {
      setCards([...activeWords]);
      setIndex(0);
    }
    setShuffledMode((s) => !s);
    setFlipped(false);
  };

  const speakWord = useCallback(() => {
    if (current) speak(current.word);
  }, [current]);

  if (!activeWords.length) {
    return (
      <div className={styles.empty}>
        <p>No words in this category. Add some words to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Flashcards</h1>
      <p className={styles.counter}>
        Card {index + 1} of {cards.length}
      </p>

      <button
        type="button"
        className={styles.cardWrapper}
        onClick={handleFlip}
        aria-pressed={flipped}
        aria-label={flipped ? `Definition of ${current.word}` : `Word: ${current.word}. Activate to reveal definition.`}
      >
        <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
          <div className={styles.front}>
            <span className={styles.wordText}>{current.word}</span>
            <span className={styles.tapHint} aria-hidden="true">Tap to flip</span>
          </div>
          <div className={styles.back}>
            <span className={styles.definitionText}>{current.definition}</span>
            <span className={styles.tapHint} aria-hidden="true">Tap to flip back</span>
          </div>
        </div>
      </button>

      <div className={styles.controls}>
        <button className={styles.navBtn} onClick={handlePrev} aria-label="Previous card">
          <span aria-hidden="true">← </span>Prev
        </button>
        <button className={styles.speakBtn} onClick={speakWord} aria-label="Listen to the word">
          <span aria-hidden="true">🔊 </span>Listen
        </button>
        <button className={styles.navBtn} onClick={handleNext} aria-label="Next card">
          Next<span aria-hidden="true"> →</span>
        </button>
      </div>

      <button className={styles.shuffleToggle} onClick={toggleShuffleMode}>
        <span aria-hidden="true">{shuffledMode ? '📋 ' : '🔀 '}</span>
        {shuffledMode ? 'Original Order' : 'Shuffle Cards'}
      </button>
    </div>
  );
}
