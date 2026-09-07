import test from 'node:test';
import assert from 'node:assert/strict';
import story from '../src/data/story.c0.draft.json' with { type: 'json' };
import reviewData from '../src/data/reviews.story.c0.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0PilotItems } from '../src/data/packs.c0.draft.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';
import { validateStoryReviews } from '../src/learning/contentReview.js';

test('chapter-one story challenge covers both versioned episodes and every source/task link', () => {
  const validation = validateStoryReviews({ reviews: reviewData.reviews, story, items: c0PilotItems, sources: sourceData.sources });
  assert.deepEqual(validation.errors, []);
  assert.equal(reviewData.reviews[0].results.length, 2);
  assert.ok(story.episodes.every((episode) => episode.version === 1 && episode.reviewStatus === 'independently_challenged'));
});

test('story task links exactly match the learner tasks in its linked lessons', () => {
  const expectedEpisodeOne = ['pilot-sp-patterns', 'pilot-pu-capitals'].flatMap((id) => [...c0LessonCatalog[id].practice, ...c0LessonCatalog[id].transfer].map((item) => item.id));
  const expectedEpisodeTwo = [...c0LessonCatalog['pilot-se-complete'].practice, ...c0LessonCatalog['pilot-se-complete'].transfer].map((item) => item.id);
  assert.deepEqual(story.episodes[0].taskIds, expectedEpisodeOne);
  assert.deepEqual(story.episodes[1].taskIds, expectedEpisodeTwo);
});

test('story challenge validator rejects incomplete coverage and unresolved promotion', () => {
  const review = reviewData.reviews[0];
  const invalid = { ...review, results: review.results.slice(1), discrepancies: [{ episodeId: 'c0.story.01', status: 'open' }] };
  const validation = validateStoryReviews({ reviews: [invalid], story, items: c0PilotItems, sources: sourceData.sources });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('misses episodes')));
  assert.ok(validation.errors.some((error) => error.includes('unresolved discrepancies')));
});
