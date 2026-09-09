import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptStatusFor, buildAttempt, nextAttemptOrdinal } from '../src/learning/attemptRecord.js';

const item = { id: 'i1', version: 2, primarySkill: 'SP.patterns', secondarySkills: ['PU.capitals-endmarks'], reviewStatus: 'reviewed', releaseStatus: 'pilot_approved' };
const base = { item, response: 'cat', evaluation: { status: 'correct', correct: true }, learnerId: 'jenn', attemptId: 'a1', eventTime: '2026-09-09T12:00:00.000Z', edmontonDate: '2026-09-09' };

test('only the first answer to an item in a session is ordinal one', () => {
  const prior = [
    { sessionId: 's1', itemId: 'i1', technicalFailure: false },
    { sessionId: 's1', itemId: 'other', technicalFailure: false },
    { sessionId: 's2', itemId: 'i1', technicalFailure: false },
  ];
  assert.equal(nextAttemptOrdinal(prior, { sessionId: 's1', itemId: 'i1' }), 2, 'a second answer in the same session is a retry');
  assert.equal(nextAttemptOrdinal(prior, { sessionId: 's3', itemId: 'i1' }), 1, 'a new session starts again at one');
  assert.equal(nextAttemptOrdinal([], { sessionId: 's1', itemId: 'i1' }), 1);
});

test('a technical failure does not consume the first ordinal', () => {
  // The microphone failing must not turn the learner's real answer into a retry that cannot count.
  const prior = [{ sessionId: 's1', itemId: 'i1', technicalFailure: true }];
  assert.equal(nextAttemptOrdinal(prior, { sessionId: 's1', itemId: 'i1' }), 1);
});

test('status precedence puts a technical failure and an omission above the evaluator', () => {
  const evaluation = { status: 'correct', correct: true };
  assert.equal(attemptStatusFor(evaluation, { technicalFailure: true }), 'technical_failure');
  assert.equal(attemptStatusFor(evaluation, { omitted: true }), 'omitted');
  assert.equal(attemptStatusFor(evaluation, {}), 'correct');
  assert.equal(attemptStatusFor({ status: 'pending' }, {}), 'pending');
});

test('an attempt carries the content lifecycle it was answered under', () => {
  const pilot = buildAttempt({ ...base, metadata: { sessionId: 's1' } });
  assert.equal(pilot.contentStatus, 'pilot_approved');
  assert.equal(buildAttempt({ ...base, item: { ...item, releaseStatus: undefined }, metadata: {} }).contentStatus, 'not_released');
  assert.deepEqual(pilot.skillIds, ['SP.patterns', 'PU.capitals-endmarks']);
  assert.equal(pilot.itemVersion, 2);
  assert.equal(pilot.ordinal, 1);
  assert.ok(Object.isFrozen(pilot), 'an attempt is immutable once built');
});

test('an omitted answer is never correct, whatever the evaluator returned', () => {
  const omitted = buildAttempt({ ...base, evaluation: { status: 'correct', correct: true }, metadata: { sessionId: 's1', omitted: true } });
  assert.equal(omitted.correct, false);
  assert.equal(omitted.status, 'omitted');
  assert.equal(omitted.omitted, true);
});
