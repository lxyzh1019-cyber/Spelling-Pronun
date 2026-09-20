// One round of the spelling test, with no React and no storage in it.
//
// Both input modes share one entry shape. A tile placement and a typed letter fill the same slots, so
// the slot rendering, the undo, the check and the results are written once and cannot drift apart —
// which matters because the whole point of shipping both is to find out which one the children use.
//
// Nothing here decides evidence. The page still records an assisted attempt as assisted; a retry round
// is a new round of new attempts and never rewrites the first ones.

export const DISTRACTOR_POOL = 'aeiourstlnmpdch';
export const LONG_WORD = 8;
export const INPUT_MODES = ['tiles', 'keyboard'];
export const HINT_CAP = 3;

export function distractorCount(word = '') {
  return word.length > LONG_WORD ? 2 : 3;
}

function shuffleWith(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

// The word's own letters plus a few that are not in it. A distractor that IS in the word would be a
// second correct tile, which makes the puzzle unsolvable in the child's eyes when they pick the twin.
export function makeTileBank(word = '', rng = Math.random) {
  const letters = [...word].map((letter, index) => ({ id: `w${index}`, letter, distractor: false }));
  const lower = word.toLowerCase();
  const pool = [...DISTRACTOR_POOL].filter((letter) => !lower.includes(letter));
  const wanted = Math.min(distractorCount(word), pool.length);
  const picked = shuffleWith(pool, rng).slice(0, wanted);
  const extras = picked.map((letter, index) => ({ id: `x${index}`, letter, distractor: true }));
  return shuffleWith([...letters, ...extras], rng);
}

export function createEntry(word, { inputMode = 'tiles', rng = Math.random } = {}) {
  const text = word?.word || '';
  return {
    wordId: word?.id ?? null,
    text,
    inputMode: INPUT_MODES.includes(inputMode) ? inputMode : 'tiles',
    bank: inputMode === 'keyboard' ? [] : makeTileBank(text, rng),
    slots: new Array(text.length).fill(null),
    history: [],
  };
}

function withSlots(entry, slots) {
  return { ...entry, slots, history: [...entry.history, entry.slots] };
}

function nextEmpty(entry) {
  return entry.slots.findIndex((slot) => slot === null);
}

export function spentTileIds(entry) {
  return new Set(entry.slots.filter(Boolean).map((slot) => slot.tileId).filter(Boolean));
}

export function placeTile(entry, tileId) {
  const tile = entry.bank.find((candidate) => candidate.id === tileId);
  if (!tile || spentTileIds(entry).has(tileId)) return entry;
  const index = nextEmpty(entry);
  if (index === -1) return entry;
  const slots = [...entry.slots];
  slots[index] = { letter: tile.letter, tileId };
  return withSlots(entry, slots);
}

export function typeLetter(entry, letter) {
  if (typeof letter !== 'string' || !/^[a-z]$/i.test(letter)) return entry;
  const index = nextEmpty(entry);
  if (index === -1) return entry;
  const slots = [...entry.slots];
  slots[index] = { letter, tileId: null };
  return withSlots(entry, slots);
}

export function removeSlot(entry, slotIndex) {
  if (!entry.slots[slotIndex]) return entry;
  const slots = [...entry.slots];
  slots[slotIndex] = null;
  return withSlots(entry, slots);
}

export function backspace(entry) {
  const filled = entry.slots.reduce((last, slot, index) => (slot ? index : last), -1);
  return filled === -1 ? entry : removeSlot(entry, filled);
}

export function undoLast(entry) {
  if (!entry.history.length) return entry;
  const history = [...entry.history];
  const slots = history.pop();
  return { ...entry, slots, history };
}

export function clearEntry(entry) {
  if (!entry.slots.some(Boolean)) return entry;
  return withSlots(entry, new Array(entry.slots.length).fill(null));
}

export function isComplete(entry) {
  return entry.slots.length > 0 && entry.slots.every(Boolean);
}

export function answerFrom(entry) {
  return entry.slots.map((slot) => (slot ? slot.letter : '')).join('');
}

export function checkAnswer(word, answer = '') {
  const attempt = String(answer).trim();
  return { attempt, correct: attempt.toLowerCase() === String(word?.word || '').toLowerCase() };
}

// The whole grammar of the answer row.
//
// `right` and `kept` are deliberately different states. Green means the whole word was right; a letter
// that happened to land in the right place inside a wrong spelling stays dark, because colouring it
// green would tell a child that part of a misspelling was correct.
export function slotStates(word, entry, feedback = null) {
  const text = String(word?.word || '');
  const next = nextEmpty(entry);
  return entry.slots.map((slot, index) => {
    if (feedback === 'correct') return 'right';
    if (feedback === 'incorrect') {
      return slot && slot.letter.toLowerCase() === (text[index] || '').toLowerCase() ? 'kept' : 'wrong';
    }
    if (slot) return 'filled';
    return index === next ? 'next' : 'empty';
  });
}

export function feedbackCopy(word, correct, hintShown = false) {
  if (correct) {
    return {
      tone: 'green',
      title: 'Yes!',
      body: hintShown
        ? 'You used a hint on this one — worth another go later.'
        : `${word.word} — spelled right first try.`,
    };
  }
  return {
    tone: 'red',
    title: 'Not yet',
    body: word.hint ? `It’s ${word.word}. ${word.hint}.` : `It’s ${word.word}.`,
  };
}

export function makeResult({ word, outcome, attempt = '', assisted = false, inputMode = 'tiles' }) {
  return { wordId: word.id, word: word.word, outcome, attempt, assisted, inputMode };
}

export function resultNote(result) {
  if (result.outcome === 'correct') return result.assisted ? 'Right — with a hint' : 'Right, on your own';
  if (result.outcome === 'skipped') return 'Skipped — not tried yet';
  return `You wrote "${result.attempt}"`;
}

export function resultBadge(result) {
  if (result.outcome === 'correct') return '✓';
  if (result.outcome === 'skipped') return '↷';
  return '✗';
}

export function resultsSummary(results = []) {
  const total = results.length;
  const correct = results.filter((result) => result.outcome === 'correct').length;
  const missed = results.filter((result) => result.outcome === 'incorrect').length;
  const skipped = results.filter((result) => result.outcome === 'skipped').length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const title = total && correct === total ? 'Every one right!' : pct >= 70 && total ? 'Good round' : 'Round done';
  return { total, correct, missed, skipped, pct, title, dot: total && pct >= 70 ? 'happy' : 'idle' };
}

// What a second round would contain. The missed and the skipped, in the order they were asked, because
// a child re-reading their own round should find it in the shape they left it.
export function retryQueue(results = [], words = []) {
  const wanted = new Set(results.filter((result) => result.outcome !== 'correct').map((result) => result.wordId));
  const queue = words.filter((word) => wanted.has(word.id));
  if (!queue.length) return { words: [...words], label: 'Go again' };
  return { words: queue, label: `Try those ${queue.length} again` };
}

export function hintLabel(hintsUsedToday = 0, hintShowing = false, cap = HINT_CAP) {
  if (hintShowing) return 'Hint showing';
  const left = Math.max(0, cap - hintsUsedToday);
  return left === 0 ? 'No hints left today' : `Ask Dot (${left} left)`;
}

export function hintText(word) {
  const letters = `${word.word.length} letters`;
  return word.hint ? `Hint: ${word.hint} · ${letters}` : `Hint: ${letters}`;
}
