// Storage for the below-grade diagnostic, fenced off by name.
//
// WHY THIS EXISTS RATHER THAN GOING THROUGH `LearningProvider`. `submitAttempt` refuses nothing —
// it has no role check and no release check — so a diagnostic answer routed through the learner
// write path would land in the same attempt record as everything else. Today only
// `attemptIsInTrack` keeps it out of mastery, because the content is `not_released`. That is one
// filter standing between a locator and a child's permanent record, and one filter is not enough
// for a promise this file makes in its own name.
//
// Keeping the answers in their own namespace makes "a diagnostic answer is never mastery evidence"
// structural. There is no path from here into `spelling-attempts`, so it cannot be weakened by a
// later change to an evaluator or a track filter.
//
// Every key written begins with `spelling-diagnostic-`, and `writeDiagnosticRun` refuses anything
// else rather than trusting its caller — the same fence `testLabStore.js` uses, for the same reason.
// Reset clears the run it is given and nothing else; there is deliberately no clear-everything.

export const DIAGNOSTIC_PREFIX = 'spelling-diagnostic-';

// Not a learner id from the profile list. The diagnostic records WHO was observed as a field inside
// the run, the way the Family Pilot checks do, rather than writing under a learner's own key.
export function diagnosticKey(learnerId, formId) {
  return `${DIAGNOSTIC_PREFIX}run:${formId}:${learnerId}`;
}

export function isDiagnosticKey(key) {
  return typeof key === 'string' && key.startsWith(DIAGNOSTIC_PREFIX);
}

export function createDiagnosticRun(formId, learnerId, startedAt = new Date().toISOString()) {
  return {
    formId,
    learnerId,
    startedAt,
    // Keyed by item id, and written once. See `answerDiagnostic`.
    answers: {},
  };
}

export function readDiagnosticRun(storage = globalThis.localStorage, learnerId, formId) {
  try {
    const raw = storage?.getItem(diagnosticKey(learnerId, formId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A run from another learner or another form is not this run, whatever the key said.
    if (parsed?.formId !== formId || parsed?.learnerId !== learnerId) return null;
    return { ...parsed, answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {} };
  } catch {
    return null;
  }
}

export function writeDiagnosticRun(storage = globalThis.localStorage, run) {
  const key = diagnosticKey(run.learnerId, run.formId);
  // The fence: refuse to write anywhere that is not obviously diagnostic storage.
  if (!isDiagnosticKey(key)) throw new Error('Diagnostic storage refused a key outside its namespace');
  try {
    storage?.setItem(key, JSON.stringify(run));
    return true;
  } catch {
    return false;
  }
}

// The first answer stands. This is the same rule `firstAttempts` applies when building the report,
// enforced here as well so a resumed run cannot quietly overwrite what a child already said — and so
// the two never disagree about which answer counted.
export function answerDiagnostic(run, itemId, choiceId, correct, answeredAt = new Date().toISOString()) {
  if (run.answers[itemId]) return { run, recorded: false };
  return {
    run: { ...run, answers: { ...run.answers, [itemId]: { itemId, choiceId, correct, answeredAt } } },
    recorded: true,
  };
}

export function resumeDiagnosticRun(storage = globalThis.localStorage, learnerId, formId) {
  const existing = readDiagnosticRun(storage, learnerId, formId);
  if (existing) return { run: existing, resumed: true };
  const run = createDiagnosticRun(formId, learnerId);
  writeDiagnosticRun(storage, run);
  return { run, resumed: false };
}

// Clears one learner's run of one form. Never a broad reset.
export function clearDiagnosticRun(storage = globalThis.localStorage, learnerId, formId) {
  try {
    storage?.removeItem(diagnosticKey(learnerId, formId));
    return true;
  } catch {
    return false;
  }
}

// The shape `buildDiagnosticReport` consumes. It reads `itemId` and `correct` only, but the whole
// answer is kept so a parent can see what was chosen.
export function attemptsFrom(run) {
  return Object.values(run?.answers || {}).sort((a, b) => String(a.answeredAt).localeCompare(String(b.answeredAt)));
}
