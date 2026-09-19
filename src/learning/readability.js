// Reading level for learner-facing prose.
//
// Why this exists: the C0 story episodes were written for a Grade 5/6 reader but land around Grade 9
// to 10, and their `History behind the mystery` notes around Grade 12 to 14. Nothing in the app or the
// review records measured that, so the review dimension named `age_accessibility` was a label a
// reviewer ticked rather than a number anyone could check.
//
// This is Flesch-Kincaid grade level. It is a coarse instrument: it counts sentence length and
// syllables, and knows nothing about whether a word is familiar. A passage can pass and still be hard
// because its vocabulary is specialised. It is used here as a ceiling that catches prose that is
// plainly too dense, never as evidence that a text is suitable.

const VOWEL_RUNS = /[aeiouy]+/g;

// Syllable estimate for one word. Deliberately simple and deterministic.
export function syllablesIn(word) {
  const letters = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!letters) return 0;
  // A trailing silent e is not a syllable (`make`), but a consonant followed by `le` is one
  // (`bi-cy-cle`, `ta-ble`), and dropping the e must never leave a word with no vowel run at all.
  const silentE = letters.length > 2 && letters.endsWith('e') && !/[aeiouy]e$/.test(letters) && !/[^aeiouy]le$/.test(letters);
  const trimmed = silentE ? letters.slice(0, -1) : letters;
  const runs = trimmed.match(VOWEL_RUNS);
  return Math.max(1, runs ? runs.length : 1);
}

export function countWords(text) {
  return String(text).trim().split(/\s+/).filter(Boolean);
}

// Sentences are split on terminal punctuation. A trailing fragment with no end mark still counts, so a
// text that forgets its final period is not scored as one enormous sentence.
export function countSentences(text) {
  const parts = String(text).split(/[.!?]+/).map((part) => part.trim()).filter((part) => part.length > 1);
  return Math.max(1, parts.length);
}

export function readingGrade(text) {
  const words = countWords(text);
  if (!words.length) return { grade: 0, words: 0, sentences: 0, wordsPerSentence: 0, syllablesPerWord: 0 };
  const sentences = countSentences(text);
  const syllables = words.reduce((sum, word) => sum + syllablesIn(word), 0);
  const wordsPerSentence = words.length / sentences;
  const syllablesPerWord = syllables / words.length;
  return {
    grade: 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59,
    words: words.length,
    sentences,
    wordsPerSentence,
    syllablesPerWord,
  };
}
