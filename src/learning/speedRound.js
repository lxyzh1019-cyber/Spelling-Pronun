// Pure helpers for the Speed Round game so its rules can be tested without the page.
export const SPEED_MODES = {
  quick: { label: 'Quick (60 seconds)', timeLimit: 60, count: 20, icon: '⚡', evidenceType: 'timed_retrieval_practice' },
  practice: { label: 'Practice (200 words, untimed)', timeLimit: 0, count: 200, icon: '📚', evidenceType: 'untimed_practice' },
};

// Never repeats a word: the list is capped at the pool size.
export function buildSpeedRoundList(shuffledPool, count) {
  return shuffledPool.slice(0, Math.min(count, shuffledPool.length));
}

export function evidenceTypeForMode(mode) {
  return SPEED_MODES[mode]?.evidenceType || 'timed_retrieval_practice';
}

// Keeps every miss (wrong or passed) with what was typed, for review after the round.
export function recordSpeedOutcome(misses, word, { typed = '', passed = false }) {
  return [...misses, { wordId: word.id, word: word.word, definition: word.definition, typed: typed.trim(), passed }];
}
