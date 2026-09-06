import test from 'node:test';
import assert from 'node:assert/strict';
import reviewData from '../src/data/reviews.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { validateContentReviews } from '../src/learning/contentReview.js';
import { buildReviewQueue } from '../src/learning/reviewQueue.js';

test('completed pack challenges record every item and support only challenge-stage promotion', () => {
  const result = validateContentReviews({ reviews: reviewData.reviews, packs: c0PilotPacks, sources: sourceData.sources });
  assert.deepEqual(result.errors, []);
  assert.equal(reviewData.reviews.length, 4);
  for (const review of reviewData.reviews) {
    assert.equal(review.results.length, 24);
    assert.equal(new Set(review.results.map(({ itemId }) => itemId)).size, 24);
    assert.ok(review.results.every(({ outcome }) => outcome === 'pass'));
    assert.ok(review.discrepancies.every(({ status }) => status === 'resolved'));
  }
});

test('challenged content is still excluded from delayed review and mastery queues', () => {
  const due = reviewData.reviews.map(({ skillId }) => ({ skillId, reviewStage: 0, reviewDue: '2026-09-06' }));
  assert.deepEqual(buildReviewQueue(due, c0PilotPacks), []);
});

test('challenge validator rejects partial coverage and unresolved promotion', () => {
  const review = reviewData.reviews[0];
  const partial = { ...review, results: review.results.slice(1), discrepancies: [{ itemId: review.results[0].itemId, status: 'open' }] };
  const result = validateContentReviews({ reviews: [partial], packs: c0PilotPacks, sources: sourceData.sources });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('misses items')));
  assert.ok(result.errors.some((error) => error.includes('unresolved discrepancies')));
});
