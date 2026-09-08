import test from 'node:test';
import assert from 'node:assert/strict';
import educationalData from '../src/data/reviews.educational.c0.json' with { type: 'json' };
import challengeData from '../src/data/reviews.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { validateEducationalPackReviews } from '../src/learning/contentReview.js';
import { buildReviewQueue } from '../src/learning/reviewQueue.js';

test('all four C0 lesson packs have full educational/source review records', () => {
  const validation = validateEducationalPackReviews({ reviews: educationalData.reviews, challengeReviews: challengeData.reviews, packs: c0PilotPacks, sources: sourceData.sources });
  assert.deepEqual(validation.errors, []);
  assert.equal(educationalData.reviews.length, 4);
  assert.equal(new Set(educationalData.reviews.flatMap((review) => review.itemIds)).size, 96);
  assert.ok(c0PilotPacks.every((pack) => pack.items.every((item) => item.authorStatus === 'reviewed' && item.reviewStatus === 'reviewed')));
});

test('reviewed C0 lesson content remains unreleased and excluded from mastery review', () => {
  assert.ok(c0PilotPacks.every((pack) => pack.items.every((item) => item.releaseStatus === 'not_released')));
  const due = c0PilotPacks.map((pack) => ({ skillId: pack.skillId, reviewStage: 0 }));
  assert.deepEqual(buildReviewQueue(due, c0PilotPacks), []);
});

test('educational review validator rejects a partial item range', () => {
  const review = educationalData.reviews[0];
  const invalid = { ...review, itemIds: review.itemIds.slice(1) };
  const validation = validateEducationalPackReviews({ reviews: [invalid], challengeReviews: challengeData.reviews, packs: c0PilotPacks, sources: sourceData.sources });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('misses items')));
});

test('educational review validator requires an explicit reviewed-not-released decision', () => {
  const review = educationalData.reviews[0];
  const invalid = { ...review, releaseDecision: 'released' };
  const validation = validateEducationalPackReviews({ reviews: [invalid], challengeReviews: challengeData.reviews, packs: c0PilotPacks, sources: sourceData.sources });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('reviewed-not-released')));
});
