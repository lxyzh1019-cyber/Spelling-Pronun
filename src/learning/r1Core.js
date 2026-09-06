export const EMPTY_SCORE = Object.freeze({ correct: 0, incorrect: 0, skipped: 0 });

export function nextScore(score = EMPTY_SCORE, outcome) {
  if (!['correct', 'incorrect', 'skipped'].includes(outcome)) {
    throw new Error(`Unknown spelling outcome: ${outcome}`);
  }
  return { ...score, [outcome]: (score[outcome] || 0) + 1 };
}

export function scoreTotal(score = EMPTY_SCORE) {
  return (score.correct || 0) + (score.incorrect || 0) + (score.skipped || 0);
}

export function isPerfectScore(score = EMPTY_SCORE) {
  const total = scoreTotal(score);
  return total > 0 && score.correct === total && score.skipped === 0;
}

export function edmontonDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createAttempt({
  attemptId,
  wordId,
  learnerId,
  correct,
  evidenceType = 'independent_spelling',
  sessionId = null,
  helped = false,
  skipped = false,
  clientTime = new Date().toISOString(),
}) {
  if (!attemptId || !wordId || !learnerId) throw new Error('Attempt identity is required');
  return {
    attemptId,
    wordId,
    learnerId,
    correct: Boolean(correct),
    evidenceType,
    sessionId,
    helped: Boolean(helped),
    skipped: Boolean(skipped),
    clientTime,
  };
}

export function applyAttempts(progress, attempts, now = new Date()) {
  const next = { ...progress };
  for (const attempt of attempts) {
    const previous = next[attempt.wordId] || { attempts: 0, correct: 0, streak: 0 };
    next[attempt.wordId] = {
      ...previous,
      attempts: previous.attempts + 1,
      correct: previous.correct + (attempt.correct ? 1 : 0),
      streak: attempt.correct ? previous.streak + 1 : 0,
      lastSeen: now,
      lastEvidenceType: attempt.evidenceType,
    };
  }
  return next;
}

export function progressStats(progress) {
  const entries = Object.values(progress || {});
  return {
    totalAttempts: entries.reduce((sum, entry) => sum + (entry.attempts || 0), 0),
    totalCorrect: entries.reduce((sum, entry) => sum + (entry.correct || 0), 0),
    wordsSeen: entries.length,
    bestWordStreak: entries.reduce((max, entry) => Math.max(max, entry.streak || 0), 0),
  };
}

export function dailyChallengeComplete(wordIds, attemptsByWord) {
  return wordIds.length > 0 && wordIds.every((wordId) => Boolean(attemptsByWord[wordId]));
}

export function createSessionSnapshot({ learnerId, mode, category, words, index = 0, score = EMPTY_SCORE, started = false, finished = false }) {
  return {
    version: 1,
    learnerId,
    mode,
    category,
    wordIds: words.map((word) => word.id),
    index,
    score: { ...score },
    started,
    finished,
    savedAt: new Date().toISOString(),
  };
}

export function restoreSessionSnapshot(snapshot, { learnerId, mode, category, words }) {
  if (!snapshot || snapshot.version !== 1 || snapshot.learnerId !== learnerId || snapshot.mode !== mode || snapshot.category !== category) return null;
  const byId = new Map(words.map((word) => [word.id, word]));
  const restoredWords = snapshot.wordIds.map((id) => byId.get(id)).filter(Boolean);
  if (!restoredWords.length || restoredWords.length !== snapshot.wordIds.length) return null;
  return { ...snapshot, words: restoredWords };
}
