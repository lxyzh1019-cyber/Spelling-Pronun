import test from 'node:test';
import assert from 'node:assert/strict';
import { PENDING_DECISIONS, buildPendingQueue, needsHumanReview, recordPendingDecision, summarisePendingReview } from '../src/learning/pendingReview.js';
import { buildAttempt } from '../src/learning/attemptRecord.js';
import { evaluateItem, evidenceEligible } from '../src/learning/evaluators.js';
import { deriveMastery } from '../src/learning/mastery.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';

const typedItem = [...c0LessonCatalog['pilot-pu-capitals'].practicePool, ...c0LessonCatalog['pilot-pu-capitals'].transfer]
  .find((item) => item.responseType === 'text' && item.allowReview);

const attemptFor = (response, metadata = {}, eventTime = '2026-09-17T10:00:00.000Z') => buildAttempt({
  item: typedItem,
  response,
  evaluation: evaluateItem(typedItem, response),
  metadata: { sessionId: 's1', evidenceType: 'independent_choice', ...metadata },
  priorAttempts: [],
  learnerId: 'jenn',
  eventTime,
  edmontonDate: '2026-09-17',
  attemptId: metadata.attemptId || 'a1',
});

test('an answer the evaluator could not decide waits for a person', () => {
  const alternative = typedItem.acceptedAnswers[0].replace(/\.$/, '!');
  const attempt = attemptFor(alternative);
  assert.equal(attempt.status, 'pending');
  assert.ok(needsHumanReview(attempt));
  const [row] = buildPendingQueue([attempt], [typedItem]);
  assert.equal(row.submitted, alternative);
  assert.equal(row.prompt, typedItem.prompt);
  assert.deepEqual(row.expected, typedItem.acceptedAnswers);
  assert.equal(row.itemMissing, false);
});

test('a correct answer never reaches the queue', () => {
  const correct = attemptFor(typedItem.acceptedAnswers[0]);
  assert.equal(correct.status, 'correct');
  assert.equal(buildPendingQueue([correct], [typedItem]).length, 0);
});

// Worth knowing when reading the queue: these typed items carry `allowReview`, so the evaluator never
// marks one incorrect. Anything but the exact key is pending, whether it is a good alternative or a
// plain mistake. That is deliberate — no machine marks a typed sentence wrong here — and it means the
// parent's queue holds both, and that these items produce no automatic evidence either way.
test('a typed sentence is never machine-marked wrong, so plain mistakes queue too', () => {
  const mistake = attemptFor('nonsense that is not close', {}, '2026-09-17T11:00:00.000Z');
  assert.equal(mistake.status, 'pending');
  assert.equal(buildPendingQueue([mistake], [typedItem]).length, 1);
});

// A technical failure was deferred, not judged, and an omission has no answer. Neither is something a
// person can read and decide, so neither belongs in the queue.
test('a deferred or unanswered item is not something to adjudicate', () => {
  const technical = attemptFor(null, { technicalFailure: true });
  const omitted = attemptFor(null, { omitted: true });
  assert.equal(needsHumanReview(technical), false);
  assert.equal(needsHumanReview(omitted), false);
  assert.equal(buildPendingQueue([technical, omitted], [typedItem]).length, 0);
});

test('a decided answer leaves the queue and the count moves across', () => {
  const attempt = attemptFor(typedItem.acceptedAnswers[0].replace(/\.$/, '!'));
  let decisions = [];
  assert.deepEqual(summarisePendingReview([attempt], decisions), { waiting: 1, reviewed: 0, acceptable: 0 });
  decisions = recordPendingDecision(decisions, { attemptId: attempt.attemptId, decision: PENDING_DECISIONS.ACCEPTED, decidedBy: 'Parent' });
  assert.equal(buildPendingQueue([attempt], [typedItem], decisions).length, 0);
  assert.deepEqual(summarisePendingReview([attempt], decisions), { waiting: 0, reviewed: 1, acceptable: 1 });
});

// Attempts are immutable and create-only. A judgement is a separate record that points at one.
test('a decision never edits the attempt it judges', () => {
  const attempt = attemptFor(typedItem.acceptedAnswers[0].replace(/\.$/, '!'));
  const before = JSON.stringify(attempt);
  recordPendingDecision([], { attemptId: attempt.attemptId, decision: PENDING_DECISIONS.ACCEPTED, decidedBy: 'Parent' });
  assert.equal(JSON.stringify(attempt), before);
  assert.throws(() => { attempt.status = 'correct'; }, 'the attempt record is not frozen');
});

test('the first judgement stands, as a first answer does', () => {
  const first = recordPendingDecision([], { attemptId: 'a1', decision: PENDING_DECISIONS.ACCEPTED, decidedBy: 'Parent', note: 'reads fine' });
  const second = recordPendingDecision(first, { attemptId: 'a1', decision: PENDING_DECISIONS.REJECTED, decidedBy: 'Parent' });
  assert.equal(second.length, 1);
  assert.equal(second[0].decision, PENDING_DECISIONS.ACCEPTED);
  assert.equal(second[0].note, 'reads fine');
});

test('a decision must name the attempt, the judgement and who made it', () => {
  assert.throws(() => recordPendingDecision([], { decision: PENDING_DECISIONS.ACCEPTED, decidedBy: 'Parent' }), /name the attempt/);
  assert.throws(() => recordPendingDecision([], { attemptId: 'a1', decision: 'looks_ok', decidedBy: 'Parent' }), /Unknown decision/);
  assert.throws(() => recordPendingDecision([], { attemptId: 'a1', decision: PENDING_DECISIONS.ACCEPTED }), /who made it/);
});

// The rule that must not be weakened: a person reading an answer at the kitchen table is not the
// reviewed, independent evidence the release gates require. Accepting an answer must leave mastery
// exactly where it was.
test('accepting an answer creates no mastery evidence', () => {
  const attempt = attemptFor(typedItem.acceptedAnswers[0].replace(/\.$/, '!'));
  assert.equal(evidenceEligible(attempt), false, 'a pending attempt was already eligible evidence');
  const decisions = recordPendingDecision([], { attemptId: attempt.attemptId, decision: PENDING_DECISIONS.ACCEPTED, decidedBy: 'Parent' });
  assert.equal(decisions[0].countsAsEvidence, false);
  const mastery = deriveMastery([attempt]);
  assert.equal(mastery.eligibleCount, 0);
  assert.equal(mastery.status, 'unassessed', 'a pending answer moved mastery');
});

test('an answer whose item is gone is still readable, and says so', () => {
  const attempt = attemptFor(typedItem.acceptedAnswers[0].replace(/\.$/, '!'));
  const [row] = buildPendingQueue([attempt], []);
  assert.equal(row.itemMissing, true);
  assert.equal(row.prompt, null);
  assert.equal(row.submitted, attempt.originalAnswer, 'the learner answer must survive a missing item');
});

test('the queue is worked oldest first', () => {
  const alternative = typedItem.acceptedAnswers[0].replace(/\.$/, '!');
  const later = attemptFor(alternative, { attemptId: 'later' }, '2026-09-17T12:00:00.000Z');
  const earlier = attemptFor(alternative, { attemptId: 'earlier' }, '2026-09-17T08:00:00.000Z');
  assert.deepEqual(buildPendingQueue([later, earlier], [typedItem]).map((row) => row.attemptId), ['earlier', 'later']);
});
