// The R2 (M3) checklist's ticks, notes and problems log, kept on this device.
//
// It has its own key, separate from the human-check log (`checkLog.js`), so that log's entries keep
// exactly the fields they have always had. Every read and write is wrapped: a blocked or full
// storage returns an empty list on read and `saved: false` on write, and never throws, so the page
// keeps working for the visit and can say that nothing was saved.
//
// There is deliberately no delete for a problem row. A problem that turned out not to matter is
// given a decision, the way the check log keeps an earlier result instead of erasing it.

import { DECISIONS, SEVERITIES, heldExitTickKeys } from '../learning/r2Checklist.js';
import { r2ChecklistItems } from '../data/r2Checklist.js';
import { edmontonDayKey } from '../learning/r1Core.js';

export const R2_CHECKLIST_KEY = 'spelling-r2-checklist-v1';
const MAX_NOTE = 600;
const MAX_FIELD = 200;
const MAX_PROBLEMS = 200;

function empty() {
  return { ticks: {}, problems: [] };
}

export function readR2Checklist(storage) {
  try {
    const raw = storage?.getItem(R2_CHECKLIST_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return empty();
    const ticks = parsed.ticks && typeof parsed.ticks === 'object' && !Array.isArray(parsed.ticks) ? parsed.ticks : {};
    const problems = Array.isArray(parsed.problems) ? parsed.problems.filter((problem) => problem && typeof problem === 'object') : [];
    return { ticks, problems };
  } catch {
    return empty();
  }
}

// An exit row a problem is holding back loses its stored tick and note, so it has to be ticked
// again after the problem is resolved. Applied on every write, and a held row cannot be ticked.
function releaseHeldTicks(state) {
  const held = heldExitTickKeys(r2ChecklistItems, state);
  if (!held.length) return state;
  const ticks = { ...state.ticks };
  held.forEach((key) => { delete ticks[key]; });
  return { ...state, ticks };
}

function write(storage, state) {
  try {
    if (!storage) return false;
    storage.setItem(R2_CHECKLIST_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const text = (value, max) => String(value ?? '').trim().slice(0, max);
const severityOf = (value) => (SEVERITIES.includes(value) ? value : '');
const decisionOf = (value, fallback = 'open') => (DECISIONS.includes(value) ? value : fallback);

export function setChecklistTick(storage, key, { done = false, note = '', at = new Date().toISOString() } = {}) {
  const current = readR2Checklist(storage);
  if (!key) return { state: current, saved: false };
  const state = releaseHeldTicks({
    ...current,
    ticks: { ...current.ticks, [key]: { done: Boolean(done), note: text(note, MAX_NOTE), updatedAt: at } },
  });
  return { state, saved: write(storage, state) };
}

export function addProblem(storage, problem = {}, { id, at = new Date().toISOString() } = {}) {
  const current = readR2Checklist(storage);
  const where = text(problem.where, MAX_FIELD);
  const what = text(problem.what, MAX_NOTE);
  if (!where || !what || current.problems.length >= MAX_PROBLEMS) return { state: current, saved: false, added: false };
  const entry = {
    id: id || `problem-${Date.parse(at) || Date.now()}-${current.problems.length + 1}`,
    where,
    learnerId: text(problem.learnerId, 80),
    what,
    severity: severityOf(problem.severity),
    decision: decisionOf(problem.decision),
    date: /^\d{4}-\d{2}-\d{2}$/.test(problem.date || '') ? problem.date : edmontonDayKey(new Date(at)),
    recordedAt: at,
  };
  const state = releaseHeldTicks({ ...current, problems: [...current.problems, entry] });
  return { state, saved: write(storage, state), added: true };
}

// Changes the fields given and keeps the rest. An unknown severity reads as unset and an unknown
// decision leaves the current one, rather than guessing.
export function updateProblem(storage, id, patch = {}) {
  const current = readR2Checklist(storage);
  const index = current.problems.findIndex((problem) => problem.id === id);
  if (index < 0) return { state: current, saved: false };
  const previous = current.problems[index];
  const next = { ...previous };
  if ('where' in patch && text(patch.where, MAX_FIELD)) next.where = text(patch.where, MAX_FIELD);
  if ('what' in patch && text(patch.what, MAX_NOTE)) next.what = text(patch.what, MAX_NOTE);
  if ('learnerId' in patch) next.learnerId = text(patch.learnerId, 80);
  if ('severity' in patch) next.severity = severityOf(patch.severity);
  if ('decision' in patch) next.decision = decisionOf(patch.decision, previous.decision);
  if ('date' in patch && /^\d{4}-\d{2}-\d{2}$/.test(patch.date || '')) next.date = patch.date;
  const problems = [...current.problems];
  problems[index] = next;
  const state = releaseHeldTicks({ ...current, problems });
  return { state, saved: write(storage, state) };
}
