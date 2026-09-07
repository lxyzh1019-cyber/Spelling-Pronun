import test from 'node:test';
import assert from 'node:assert/strict';
import story from '../src/data/story.c0.draft.json' with { type: 'json' };
import educationalData from '../src/data/reviews.educational.story.c0.json' with { type: 'json' };
import challengeData from '../src/data/reviews.story.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0PilotItems } from '../src/data/packs.c0.draft.js';
import { validateEducationalStoryReviews } from '../src/learning/contentReview.js';

const validate = (reviews = educationalData.reviews) => validateEducationalStoryReviews({
  reviews,
  challengeReviews: challengeData.reviews,
  story,
  items: c0PilotItems,
  sources: sourceData.sources,
});

test('both C0 story episodes have complete educational/source review records', () => {
  assert.deepEqual(validate().errors, []);
  assert.equal(new Set(educationalData.reviews[0].results.map((result) => result.episodeId)).size, 2);
  assert.ok(story.episodes.every((episode) => episode.authorStatus === 'reviewed' && episode.reviewStatus === 'reviewed'));
});

test('reviewed C0 story episodes remain explicitly unreleased', () => {
  assert.equal(story.status, 'integrated');
  assert.ok(story.episodes.every((episode) => episode.releaseStatus === 'not_released'));
  assert.equal(educationalData.reviews[0].releaseDecision, 'reviewed_not_released');
});

test('educational story validator rejects incomplete coverage and a release claim', () => {
  const review = educationalData.reviews[0];
  const invalid = { ...review, results: review.results.slice(1), releaseDecision: 'released' };
  const validation = validate([invalid]);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('misses episodes')));
  assert.ok(validation.errors.some((error) => error.includes('reviewed-not-released')));
});
