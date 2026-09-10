// The Test Lab practice run.
//
// It exercises the rules a real session uses — the same `evaluateItem`, the same
// idempotent delivery, the same resume comparison — against invented practice
// questions and a learner id no profile can hold. Nothing in here reaches Jenn's
// or Jess's records, because nothing in here goes through LearningProvider: the
// pure rules are reused, the write path is not.
//
// The questions are deliberately not curriculum. They exist to be interrupted,
// reloaded and answered offline, not to teach anything.

import { evaluateItem } from './evaluators.js';

// Profile ids are slugs of [a-z0-9-] only (see `slug` in wordCatalogue.js), so an
// id containing underscores can never belong to a learner.
export const TEST_LAB_LEARNER = '__testlab__';
export const TEST_LAB_MODE = 'testlab';
export const TEST_LAB_CONTENT_VERSION = 1;

export const TEST_LAB_ITEMS = [
  { id: 'testlab.01', prompt: 'Practice question 1 of 4. Type the word: sample', evaluator: 'spelling', acceptedAnswers: ['sample'], spokenText: 'sample' },
  { id: 'testlab.02', prompt: 'Practice question 2 of 4. Type the word: window', evaluator: 'spelling', acceptedAnswers: ['window'], spokenText: 'window' },
  { id: 'testlab.03', prompt: 'Practice question 3 of 4. Type the word: pocket', evaluator: 'spelling', acceptedAnswers: ['pocket'], spokenText: 'pocket' },
  { id: 'testlab.04', prompt: 'Practice question 4 of 4. Type the word: garden', evaluator: 'spelling', acceptedAnswers: ['garden'], spokenText: 'garden' },
];

export const TEST_LAB_ITEM_IDS = TEST_LAB_ITEMS.map((item) => item.id);

export function createTestRun(runId) {
  return { runId, index: 0, answers: [], queue: [], delivered: [], startedAt: new Date().toISOString() };
}

export function currentTestItem(state) {
  return TEST_LAB_ITEMS[state?.index] || null;
}

export function testRunProgress(state) {
  const answered = state?.answers?.length || 0;
  return {
    answered,
    total: TEST_LAB_ITEMS.length,
    queued: state?.queue?.length || 0,
    delivered: state?.delivered?.length || 0,
    complete: answered >= TEST_LAB_ITEMS.length,
  };
}

// Answering twice with the same attempt id is the same answer, not two answers.
// This is the rule the real double-submit protection relies on.
export function answerTestRun(state, response, { attemptId, online = true } = {}) {
  const item = currentTestItem(state);
  if (!item) return { state, duplicate: false, evaluation: null };
  if (attemptId && state.answers.some((answer) => answer.attemptId === attemptId)) {
    return { state, duplicate: true, evaluation: null };
  }
  const evaluation = evaluateItem(item, response);
  const answer = {
    attemptId: attemptId || `${item.id}-${state.answers.length}`,
    itemId: item.id,
    response,
    status: evaluation.status,
    answeredAt: new Date().toISOString(),
  };
  const next = {
    ...state,
    index: state.index + 1,
    answers: [...state.answers, answer],
    queue: [...state.queue, answer.attemptId],
    delivered: state.delivered,
  };
  return { state: online ? deliverTestQueue(next) : next, duplicate: false, evaluation };
}

// Delivery is by attempt id, so an answer made offline arrives exactly once when
// the queue is flushed, however many times the flush runs.
export function deliverTestQueue(state) {
  if (!state?.queue?.length) return state;
  const delivered = [...(state.delivered || [])];
  for (const attemptId of state.queue) {
    if (!delivered.includes(attemptId)) delivered.push(attemptId);
  }
  return { ...state, queue: [], delivered };
}

export function testSessionExpectation(runId) {
  return {
    id: runId,
    learnerId: TEST_LAB_LEARNER,
    mode: TEST_LAB_MODE,
    contentVersion: TEST_LAB_CONTENT_VERSION,
    orderedItemIds: TEST_LAB_ITEM_IDS,
  };
}
