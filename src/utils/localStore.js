const memoryFallback = new Map();

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJson(key, fallback = null) {
  try {
    const raw = storage()?.getItem(key) ?? memoryFallback.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  const raw = JSON.stringify(value);
  try {
    const target = storage();
    if (target) target.setItem(key, raw);
    else memoryFallback.set(key, raw);
    return true;
  } catch {
    memoryFallback.set(key, raw);
    return false;
  }
}

export function progressStorageKey(learnerId) {
  return `spelling-r1-progress:${learnerId}`;
}

export function sessionStorageKey(learnerId, mode, category) {
  return `spelling-r1-session:${learnerId}:${mode}:${category}`;
}

// Where a parent's judgements on pending answers are kept. Local to this device: the decisions are one
// person's reading, they are never evidence, and no Firestore rule exists for them yet.
export function pendingDecisionsKey(learnerId) {
  return `spelling-pending-decisions:${learnerId}`;
}

export function achievementsStorageKey(learnerId) {
  return `spelling-r1-achievements:${learnerId}`;
}

// How this learner likes to answer the spelling test: letter tiles or the in-app keyboard. Kept per
// learner and on the device, like the lesson length, because it is a preference and not a record.
export function inputModeStorageKey(learnerId) {
  return `spelling-input-mode:${learnerId}`;
}

// The words this learner asked to keep for later. Practice bookkeeping, never evidence.
export function spellAgainStorageKey(learnerId) {
  return `spelling-spell-again:${learnerId}`;
}

export function lessonMinutesStorageKey(learnerId) {
  return `spelling-lesson-minutes:${learnerId}`;
}
