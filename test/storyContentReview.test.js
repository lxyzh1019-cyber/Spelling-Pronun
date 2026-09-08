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
  assert.ok(story.episodes.every((episode) => episode.version === 2 && episode.reviewStatus === 'reviewed'));
});

test('story task links match the authored learner tasks, and quarantined tasks are withheld not deleted', async () => {
  const { c0PilotPacks } = await import('../src/data/packs.c0.draft.js');
  const { isQuarantined } = await import('../src/learning/contentCorrections.js');
  const authoredTasks = (sessionId) => {
    const pack = c0PilotPacks.find((candidate) => candidate.id === c0LessonCatalog[sessionId].packId);
    return pack.items.filter((item) => ['independent', 'transfer'].includes(item.role)).slice(0, 6).concat(pack.items.filter((item) => item.role === 'transfer')).map((item) => item.id);
  };
  // The story's declared task list is authored content and still names every task, including any
  // that is currently quarantined.
  assert.deepEqual(story.episodes[0].taskIds, [...authoredTasks('pilot-sp-patterns'), ...authoredTasks('pilot-pu-capitals')]);
  assert.deepEqual(story.episodes[1].taskIds, authoredTasks('pilot-se-complete'));

  // What the app serves excludes the quarantined task, so the episode's usable coverage is smaller
  // than its declared list until the correction is reviewed.
  const served = new Set(Object.values(c0LessonCatalog).flatMap((lesson) => [...lesson.practice, ...lesson.transfer].map((item) => item.id)));
  const withheld = story.episodes.flatMap((episode) => episode.taskIds).filter((id) => !served.has(id));
  const quarantinedIds = c0PilotPacks.flatMap((pack) => pack.items).filter(isQuarantined).map((item) => item.id);
  assert.ok(withheld.every((id) => quarantinedIds.includes(id)), 'only a quarantined task may be missing from a served lesson');
});

test('story challenge validator rejects incomplete coverage and unresolved promotion', () => {
  const review = reviewData.reviews[0];
  const invalid = { ...review, results: review.results.slice(1), discrepancies: [{ episodeId: 'c0.story.01', status: 'open' }] };
  const validation = validateStoryReviews({ reviews: [invalid], story, items: c0PilotItems, sources: sourceData.sources });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('misses episodes')));
  assert.ok(validation.errors.some((error) => error.includes('unresolved discrepancies')));
});
