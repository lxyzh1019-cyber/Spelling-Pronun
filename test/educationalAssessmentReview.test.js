import test from 'node:test';
import assert from 'node:assert/strict';
import educationalData from '../src/data/reviews.educational.assessment.c0.json' with { type: 'json' };
import challengeData from '../src/data/reviews.assessment.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0AssessmentForms, c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { validateEducationalAssessmentReviews } from '../src/learning/contentReview.js';

const validate = (reviews = educationalData.reviews) => validateEducationalAssessmentReviews({
  reviews,
  challengeReviews: challengeData.reviews,
  assessments: c0AssessmentForms,
  sources: sourceData.sources,
});

test('both C0 assessment forms record exact partial educational reviews', () => {
  assert.deepEqual(validate().errors, []);
  assert.deepEqual(educationalData.reviews.map((review) => review.reviewedItemIds.length), [14, 14]);
  assert.deepEqual(educationalData.reviews.map((review) => review.blockedItemIds.length), [20, 20]);
  assert.equal(new Set(educationalData.reviews.flatMap((review) => [...review.reviewedItemIds, ...review.blockedItemIds])).size, 68);
});

test('only the 28 source-reviewed Part B prompts advance and none are released', () => {
  const reviewed = c0AssessmentItems.filter((item) => item.reviewStatus === 'reviewed');
  const blocked = c0AssessmentItems.filter((item) => item.reviewStatus === 'independently_challenged');
  assert.equal(reviewed.length, 28);
  assert.ok(reviewed.every((item) => item.part === 'B' && item.authorStatus === 'reviewed'));
  assert.equal(blocked.length, 40);
  assert.ok(blocked.every((item) => item.part === 'A' && item.authorStatus === 'draft'));
  assert.ok(c0AssessmentItems.every((item) => item.releaseStatus === 'not_released'));
});

test('partial assessment validator rejects missing coverage and unexplained blocks', () => {
  const review = educationalData.reviews[0];
  const invalid = { ...review, reviewedItemIds: review.reviewedItemIds.slice(1), blockedGroups: [] };
  const validation = validate([invalid]);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('misses items')));
  assert.ok(validation.errors.some((error) => error.includes('blocked groups')));
});
