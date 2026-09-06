import test from 'node:test';
import assert from 'node:assert/strict';
import reviewData from '../src/data/reviews.assessment.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { validateAssessmentReviews } from '../src/learning/contentReview.js';

test('assessment challenge records all 68 prompts without removing audio release blocks', () => {
  const result = validateAssessmentReviews({ reviews: reviewData.reviews, assessments: c0AssessmentForms, sources: sourceData.sources });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(reviewData.reviews.map((review) => review.results.length), [34, 34]);
  assert.equal(new Set(reviewData.reviews.flatMap((review) => review.results.map((result) => result.itemId))).size, 68);
  assert.ok(reviewData.reviews.every((review) => review.audioDependency.includes('excluded from evidence')));
  assert.ok(c0AssessmentForms.flatMap((form) => form.items).filter((item) => item.audioStatus).every((item) => item.audioStatus === 'synthetic_preview'));
});

test('assessment challenge validator rejects partial or unresolved promotion', () => {
  const review = reviewData.reviews[0];
  const invalid = { ...review, results: review.results.slice(1), discrepancies: [{ itemId: review.results[0].itemId, status: 'open' }] };
  const result = validateAssessmentReviews({ reviews: [invalid], assessments: c0AssessmentForms, sources: sourceData.sources });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('misses items')));
  assert.ok(result.errors.some((error) => error.includes('unresolved discrepancies')));
});
