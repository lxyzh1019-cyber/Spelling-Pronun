import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceReviewSession, buildReviewQueue, createReviewSession, recordReviewResult, resolveReviewItem } from '../src/learning/reviewQueue.js';

function pack(skillId, status = 'reviewed') {
  return { skillId, items: Array.from({ length: 4 }, (_, index) => ({ id: `${skillId}.${index}`, version: 3, role: 'delayed_review', responseType: 'choice', evaluator: 'choice', authorStatus: status, reviewStatus: status })) };
}

test('review queue admits only reviewed delayed variants and caps at four', () => {
  const due = Array.from({ length: 6 }, (_, index) => ({ skillId: `skill-${index}`, reviewStage: index, reviewDue: `2026-09-0${index + 1}T00:00:00.000Z` }));
  const packs = due.map(({ skillId }, index) => pack(skillId, index === 1 ? 'needs_independent_challenge' : 'reviewed'));
  const queue = buildReviewQueue(due, packs);
  assert.equal(queue.length, 4);
  assert.deepEqual(queue.map(({ skillId }) => skillId), ['skill-0', 'skill-2', 'skill-3', 'skill-4']);
  assert.equal(queue[1].itemId, 'skill-2.2');
});

test('review queue leaves recording and human-rubric work in pending-review workflows', () => {
  const humanPack = pack('PR.stress');
  humanPack.items[0] = { ...humanPack.items[0], responseType: 'recording', evaluator: 'human_rubric' };
  const queue = buildReviewQueue([{ skillId: 'PR.stress', reviewStage: 0 }], [humanPack]);
  assert.equal(queue[0].itemId, 'PR.stress.1');
});

test('review sessions pin versions, preserve feedback, and complete in order', () => {
  const packs = [pack('SE.complete')];
  const entries = buildReviewQueue([{ skillId: 'SE.complete', reviewStage: 1, reviewDue: '2026-09-01T00:00:00.000Z' }], packs);
  let session = createReviewSession(entries);
  assert.equal(resolveReviewItem(session, packs).id, 'SE.complete.1');
  session = recordReviewResult(session, { attemptId: 'attempt-1', correct: false, omitted: false });
  assert.equal(session.stage, 'feedback');
  assert.equal(session.lastResult.attemptId, 'attempt-1');
  session = advanceReviewSession(session);
  assert.equal(session.stage, 'complete');
  assert.equal(session.index, 1);
  assert.ok(session.completedAt);
});

test('missing pinned review versions never fall forward to a different item', () => {
  const session = createReviewSession([{ itemId: 'SE.complete.0', itemVersion: 2 }]);
  assert.equal(resolveReviewItem(session, [pack('SE.complete')]), null);
});
