// Word-game totals are a cache derived from the immutable attempt record, never a number one
// device pushes over another's. Every attempt is written once to `spelling-attempts` under its own
// ID, so any device that can read that collection can recompute the same totals.
//
// Legacy rows imported from a device before attempts existed (`importedFromLocal`) carry counts
// with no matching attempt documents. Those counts are kept as a base and the derived attempts are
// added on top. Rows created by the app's own writes have one attempt document per increment, so
// their base is zero.

export const PROGRESS_DERIVATION_VERSION = 1;

export function attemptBaseFor(existingRow = {}) {
  // Once a base has been recorded it is authoritative, so re-deriving a row the app already wrote
  // cannot fold its own total back in as a new base.
  if (existingRow.baseAttempts !== undefined || existingRow.baseCorrect !== undefined) {
    return { attempts: existingRow.baseAttempts || 0, correct: existingRow.baseCorrect || 0 };
  }
  if (!existingRow.importedFromLocal) return { attempts: 0, correct: 0 };
  return { attempts: existingRow.attempts || 0, correct: existingRow.correct || 0 };
}

// Deduplicates by attempt ID and orders by client time so a replayed or re-read attempt cannot
// count twice and the streak reflects the real order of answers.
export function orderedWordAttempts(attempts = [], wordId) {
  const byId = new Map();
  for (const attempt of attempts) {
    if (!attempt?.attemptId || attempt.wordId !== wordId) continue;
    if (!byId.has(attempt.attemptId)) byId.set(attempt.attemptId, attempt);
  }
  return [...byId.values()].sort((a, b) => String(a.clientTime || '').localeCompare(String(b.clientTime || '')));
}

export function deriveWordRow(existingRow = {}, attempts = [], wordId) {
  const ordered = orderedWordAttempts(attempts, wordId);
  const base = attemptBaseFor(existingRow);
  let streak = 0;
  let derivedBest = 0;
  let correct = 0;
  for (const attempt of ordered) {
    if (attempt.correct) {
      streak += 1;
      correct += 1;
      derivedBest = Math.max(derivedBest, streak);
    } else {
      streak = 0;
    }
  }
  const derived = {
    attempts: base.attempts + ordered.length,
    correct: base.correct + correct,
    streak: ordered.length ? streak : existingRow.streak || 0,
    bestStreak: Math.max(derivedBest, existingRow.bestStreak || 0, existingRow.streak || 0),
    baseAttempts: base.attempts,
    baseCorrect: base.correct,
    derivedFromAttempts: ordered.length,
    derivationVersion: PROGRESS_DERIVATION_VERSION,
    ...(existingRow.importedFromLocal ? { importedFromLocal: true } : {}),
    ...(ordered.length ? { lastEvidenceType: ordered[ordered.length - 1].evidenceType } : {}),
  };
  // A device that cannot see every attempt yet (offline backlog, partial read) must never lower a
  // total another device already recorded. Such a row is held back rather than written.
  const heldBack = derived.attempts < (existingRow.attempts || 0) || derived.correct < (existingRow.correct || 0);
  return { derived, heldBack };
}

export function deriveWordRows({ existingRows = {}, attempts = [], wordIds = null } = {}) {
  const targets = wordIds ? [...new Set(wordIds)] : [...new Set(attempts.map(({ wordId }) => wordId).filter(Boolean))];
  const rows = {};
  const heldBack = [];
  for (const wordId of targets) {
    const { derived, heldBack: blocked } = deriveWordRow(existingRows[wordId] || {}, attempts, wordId);
    if (blocked) heldBack.push(wordId);
    else rows[wordId] = derived;
  }
  return { rows, heldBack };
}

// Write descriptors for the derived rows. Every write is a merge of a fully derived value, so
// repeating a flush produces the same document instead of adding to it.
export function planProgressWrites(uid, learnerId, rows = {}) {
  return Object.entries(rows).map(([wordId, data]) => ({
    collection: 'spelling-progress',
    id: `${uid}_${learnerId}_${wordId}`,
    mode: 'merge',
    data: { userId: uid, profileId: learnerId, wordId, ...data },
  }));
}
