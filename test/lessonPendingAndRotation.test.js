import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKED_SOLUTION_AFTER, continueLesson, createLessonState, lessonContinueLabel, lessonFeedbackHeading, lessonFeedbackMessage, startLesson, submitLessonResult } from '../src/learning/lessonFlow.js';
import { PRACTICE_PER_SITTING, c0LessonCatalog, lessonForSitting } from '../src/data/lessonCatalog.js';
import { evaluateItem } from '../src/learning/evaluators.js';

const attempting = () => startLesson(createLessonState());

// DEF: a typed answer the key did not list evaluates to `pending`, but the lesson passed only
// `evaluation.correct` to the flow, so the child was told "Not yet", sent into a repair they did not
// need, and charged a retry towards the worked solution.
test('a pending answer is not counted as a miss', () => {
  const state = submitLessonResult(attempting(), false, { pending: true });
  assert.equal(state.retryCount, 0, 'a pending answer used a retry');
  assert.equal(state.lastResult.pending, true);
  assert.equal(state.lastResult.correct, false);
});

test('a pending answer is never shown to the learner as wrong', () => {
  const state = submitLessonResult(attempting(), false, { pending: true });
  assert.equal(lessonFeedbackHeading(state.lastResult), 'Sent for review');
  assert.equal(lessonContinueLabel(state), 'Continue');
  const message = lessonFeedbackMessage(state.lastResult, { explanation: 'The only accepted answer is X.' });
  assert.ok(!message.includes('The only accepted answer'), 'the pending learner was shown the answer key as a correction');
  assert.match(message, /not marked right or wrong/i);
});

test('a pending answer advances instead of entering repair', () => {
  const state = continueLesson(submitLessonResult(attempting(), false, { pending: true }), 6, 2);
  assert.notEqual(state.stage, 'repair');
  assert.equal(state.stage, 'attempt');
  assert.equal(state.practiceIndex, 1);
});

test('a genuinely wrong answer still repairs and still counts its retries', () => {
  let state = submitLessonResult(attempting(), false, {});
  assert.equal(state.retryCount, 1);
  assert.equal(lessonFeedbackHeading(state.lastResult), 'Not yet');
  state = continueLesson(state, 6, 2);
  assert.equal(state.stage, 'repair');
  for (let round = 1; round < WORKED_SOLUTION_AFTER; round += 1) state = continueLesson(submitLessonResult(state, false, {}), 6, 2);
  assert.equal(state.stage, 'worked_solution');
});

test('an unanswered item is still unresolved and still repairs', () => {
  const state = submitLessonResult(attempting(), false, { omitted: true });
  assert.equal(state.retryCount, 1);
  assert.equal(lessonFeedbackHeading(state.lastResult), 'Not answered yet');
  assert.equal(continueLesson(state, 6, 2).stage, 'repair');
});

// The end-to-end case the audit found: the punctuation item accepts one exact string, and an
// exclamation mark is a reasonable alternative. The real evaluator must drive the real flow.
test('the real punctuation item sends a reasonable alternative to review, not to repair', () => {
  const lesson = c0LessonCatalog['pilot-pu-capitals'];
  const typed = [...lesson.practicePool, ...lesson.transfer].find((entry) => entry.responseType === 'text' && entry.allowReview);
  assert.ok(typed, 'expected a typed punctuation item that allows review');
  const key = typed.acceptedAnswers[0];
  const alternative = key.replace(/\.$/, '!');
  assert.notEqual(alternative, key);
  const evaluation = evaluateItem(typed, alternative);
  assert.equal(evaluation.status, 'pending');
  const state = submitLessonResult(attempting(), evaluation.correct, { pending: evaluation.status === 'pending' });
  assert.equal(state.retryCount, 0);
  assert.equal(lessonFeedbackHeading(state.lastResult), 'Sent for review');
  assert.notEqual(continueLesson(state, 6, 2).stage, 'repair');
  // And the exact key still passes.
  assert.equal(evaluateItem(typed, key).status, 'correct');
});

// DEF: the catalog served `independent` items `.slice(0, 6)` and nothing consumed `guided`, so ten of
// every pack's twenty-four objects could never be reached by any learner.
test('every authored item in a pack is reachable', async () => {
  const { c0PilotPacks } = await import('../src/data/packs.c0.draft.js');
  const { buildReviewQueue } = await import('../src/learning/reviewQueue.js');
  const { EVIDENCE_TRACKS } = await import('../src/learning/pilotApproval.js');
  for (const lesson of Object.values(c0LessonCatalog)) {
    const pack = c0PilotPacks.find((candidate) => candidate.id === lesson.packId);
    const reachable = new Set();
    lesson.examples.forEach((item) => reachable.add(item.id));
    lesson.guided.forEach((item) => reachable.add(item.id));
    lesson.transfer.forEach((item) => reachable.add(item.id));
    for (let sitting = 0; sitting < 6; sitting += 1) lessonForSitting(lesson, sitting).practice.forEach((item) => reachable.add(item.id));
    // Delayed-review items are reached through the review queue rather than the lesson. The queue
    // serves one variant per review stage, so a learner meets them as the 1/3/7/14/30-day schedule
    // advances; reaching them all therefore means walking the stages.
    const variantCount = pack.items.filter((item) => item.role === 'delayed_review').length;
    for (let reviewStage = 0; reviewStage < variantCount; reviewStage += 1) {
      buildReviewQueue([{ skillId: pack.skillId, reviewStage, reviewDue: '2026-01-01' }], c0PilotPacks, 1, { track: EVIDENCE_TRACKS.PILOT })
        .forEach((entry) => reachable.add(entry.itemId));
    }
    const unreachable = pack.items.filter((item) => !reachable.has(item.id)).map((item) => `${item.id} (${item.role})`);
    assert.deepEqual(unreachable, [], `${pack.id} has items no learner can ever see`);
  }
});

test('a repeated lesson serves different independent questions', () => {
  const lesson = c0LessonCatalog['pilot-sp-patterns'];
  const first = lessonForSitting(lesson, 0).practice.map((item) => item.id);
  const second = lessonForSitting(lesson, 1).practice.map((item) => item.id);
  assert.equal(first.length, PRACTICE_PER_SITTING);
  assert.equal(second.length, PRACTICE_PER_SITTING);
  assert.notDeepEqual(first, second, 'the second sitting re-asked the same six questions in the same order');
  const covered = new Set([...first, ...second]);
  assert.equal(covered.size, lesson.practicePool.length, 'two sittings did not cover the independent pool');
});

test('a sitting always gets a full lesson, whatever the sitting number', () => {
  for (const lesson of Object.values(c0LessonCatalog)) {
    for (const sitting of [0, 1, 5, 99, -3, undefined, null, Number.NaN]) {
      const served = lessonForSitting(lesson, sitting);
      assert.equal(served.practice.length, Math.min(PRACTICE_PER_SITTING, lesson.practicePool.length), `sitting ${sitting} served the wrong number of questions`);
      assert.equal(new Set(served.practice.map((item) => item.id)).size, served.practice.length, `sitting ${sitting} repeated a question within one lesson`);
    }
  }
});

// Guided items teach; they are `instruction_only` and must never be served as scored questions.
test('guided items are teaching only and never enter the independent question set', () => {
  for (const lesson of Object.values(c0LessonCatalog)) {
    assert.ok(lesson.guided.length > 0, `${lesson.sessionId} shows no worked examples`);
    lesson.guided.forEach((item) => assert.equal(item.evidenceEligibility, 'instruction_only'));
    const practiceIds = new Set(Object.values([0, 1, 2]).flatMap((sitting) => lessonForSitting(lesson, sitting).practice.map((item) => item.id)));
    lesson.guided.forEach((item) => assert.ok(!practiceIds.has(item.id), `${item.id} was served as an independent question`));
  }
});

// The rotation changes which items a lesson serves, and `useDurableSession` treats a different
// `orderedItemIds` as an incompatible snapshot. That interaction decides whether a half-finished lesson
// resumes or is silently thrown away, so it is tested rather than reasoned about.
test('rotating the practice window resumes a sitting in progress and starts the next one fresh', async () => {
  const { selectSessionState } = await import('../src/persistence/durableSession.js');
  const lesson = c0LessonCatalog['pilot-sp-patterns'];
  const configFor = (sitting) => {
    const served = lessonForSitting(lesson, sitting);
    return { id: 'key', learnerId: 'jenn', mode: 'lesson', contentVersion: lesson.version, orderedItemIds: [...served.practice, ...served.transfer].map((item) => item.id) };
  };
  const midLesson = { stage: 'attempt', practiceIndex: 3, transferIndex: 0, retryCount: 0, lastResult: null, orderSeed: 'seed-1' };
  const snapshot = { ...configFor(0), mirrorVersion: 1, state: midLesson, revision: 4 };
  const fallback = () => ({ stage: 'teach' });

  const resumed = selectSessionState({ localRaw: JSON.stringify(snapshot), durableSnapshot: snapshot, expected: configFor(0), fallback });
  assert.equal(resumed.state.practiceIndex, 3, 'a reload during the same sitting lost the learner\'s place');
  assert.equal(resumed.state.orderSeed, 'seed-1', 'the option order was not restored with the session');

  const nextSitting = selectSessionState({ localRaw: JSON.stringify(snapshot), durableSnapshot: snapshot, expected: configFor(1), fallback });
  assert.equal(nextSitting.source, 'new', 'the next sitting reused the previous sitting\'s saved state');
  assert.equal(nextSitting.state.stage, 'teach');
});
