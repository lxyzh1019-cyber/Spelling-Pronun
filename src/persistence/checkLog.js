// The human-check log: what a person observed, kept on the device that observed it.
//
// A re-check never erases the earlier result. Recording over a row pushes the
// previous entry into that row's history, so a problem that was later fixed is
// still visible as a problem that was found.

import { isResultValue } from '../learning/humanChecks.js';

const CHECK_LOG_KEY = 'spelling-family-human-checks-v1';
const MAX_HISTORY = 8;

function read(storage) {
  try {
    const raw = storage?.getItem(CHECK_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function write(storage, next) {
  try {
    storage?.setItem(CHECK_LOG_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function readCheckLog(storage = globalThis.localStorage) {
  return read(storage);
}

export function recordCheckResult(storage = globalThis.localStorage, entry = {}) {
  const { promptId, result, note = '', recordedAt = new Date().toISOString(), recordedBy = '' } = entry;
  if (!promptId || !isResultValue(result)) return read(storage);
  const current = read(storage);
  const previous = current[promptId];
  const history = previous
    ? [{ result: previous.result, note: previous.note || '', recordedAt: previous.recordedAt }, ...(previous.history || [])].slice(0, MAX_HISTORY)
    : [];
  const next = {
    ...current,
    [promptId]: { promptId, result, note: String(note || '').slice(0, 600), recordedAt, recordedBy, history },
  };
  write(storage, next);
  return next;
}

// Clearing a row removes only the current answer; the earlier attempts stay.
export function clearCheckResult(storage = globalThis.localStorage, promptId) {
  const current = read(storage);
  const existing = current[promptId];
  if (!existing) return current;
  const history = [{ result: existing.result, note: existing.note || '', recordedAt: existing.recordedAt }, ...(existing.history || [])].slice(0, MAX_HISTORY);
  const next = { ...current };
  if (history.length) next[promptId] = { promptId, cleared: true, history };
  else delete next[promptId];
  write(storage, next);
  return next;
}

export { CHECK_LOG_KEY };
