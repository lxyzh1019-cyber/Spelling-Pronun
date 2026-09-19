// Can a story episode reach a child, and does an unapproved one stay out?
//
// Until 2026-09-19 neither question applied to the ten episodes of chapters 2 to 6, because
// `storyEpisodes.js` imported `story.c0.draft.json` alone. They were not gated — they were invisible.
// An approval record for one of them would have changed nothing.
//
// That is DEF-56's exact shape, and it survived the DEF-56 fix: that fix covered packs and Home
// tiles, and the story path was listed in the same plan and not done.
import test from 'node:test';
import assert from 'node:assert/strict';
import c1Draft from '../src/data/story.c1.draft.json' with { type: 'json' };
import c0Draft from '../src/data/story.c0.draft.json' with { type: 'json' };
import ledger from '../src/data/story.ledger.json' with { type: 'json' };
import { allStoryEpisodes, c1StoryEpisodes, storyEpisodes } from '../src/data/storyEpisodes.js';
import { finaliseDraftEpisodes } from '../src/data/draftBatch.js';
import { lessonsForTaskIds } from '../src/data/lessonCatalog.js';

test('every written episode is read by the app, not just chapter one', () => {
  assert.equal(allStoryEpisodes.length, c0Draft.episodes.length + c1Draft.episodes.length);
  assert.equal(allStoryEpisodes.length, ledger.writtenEpisodes, 'the app and the ledger disagree');
  assert.equal(c1StoryEpisodes.length, 10);
  // In reading order, so the unlock chain means what it says.
  const order = allStoryEpisodes.map((episode) => `${episode.chapter}.${episode.sequence}`);
  assert.deepEqual(order, [...order].sort((a, b) => Number(a) - Number(b)));
});

// The gate. Approval decides what a learner sees, and nothing here is approved but chapter one.
test('only approved episodes reach a learner', () => {
  assert.equal(storyEpisodes.length, 2, 'an unapproved episode reached the story page');
  for (const episode of storyEpisodes) assert.equal(episode.releaseStatus, 'pilot_approved');
  for (const episode of c1StoryEpisodes) {
    assert.equal(episode.releaseStatus, 'not_released', `${episode.id} is released without a parent decision`);
  }
  // Mutation: approve one in a fixture and it becomes visible, with no code change. If this half
  // fails, the gate above is passing because nothing is wired rather than because it is withheld.
  const target = c1Draft.episodes[0];
  const ready = { ...target, reviewStatus: 'reviewed', integrationStatus: 'integrated' };
  const approvals = [{ scopeId: target.id, scopeType: 'episode', decision: 'approved', decidedBy: 'parent', decidedAt: '2026-09-19' }];
  assert.equal(finaliseDraftEpisodes([ready], { approvals })[0].releaseStatus, 'pilot_approved');
});

// `CasePage` held this mapping as a hardcoded two-entry literal, so an episode outside chapter 1 did
// not degrade — it threw, on `episodeLessons[episode.id].every(...)` of undefined.
test('an episode finds its lessons from its own task ids', () => {
  // The derivation reproduces what the hardcoded map said, in the same order.
  assert.deepEqual(
    lessonsForTaskIds(allStoryEpisodes.find((episode) => episode.id === 'c0.story.01').taskIds).map((entry) => entry.id),
    ['pilot-sp-patterns', 'pilot-pu-capitals'],
  );
  assert.deepEqual(
    lessonsForTaskIds(allStoryEpisodes.find((episode) => episode.id === 'c0.story.02').taskIds).map((entry) => entry.id),
    ['pilot-se-complete'],
  );
  // And every episode answers rather than throwing, including the ten whose lessons are draft.
  for (const episode of allStoryEpisodes) {
    const lessons = lessonsForTaskIds(episode.taskIds);
    assert.ok(Array.isArray(lessons), `${episode.id} produced no answer`);
    for (const lesson of lessons) assert.ok(lesson.id && lesson.label, `${episode.id} produced a lesson with no label`);
  }
  assert.deepEqual(lessonsForTaskIds([]), []);
  assert.deepEqual(lessonsForTaskIds(['nope.not.an.item']), []);
});

// A draft lesson must never be linked from an episode, even once the episode itself is approved.
test('an episode never links a lesson a learner cannot open', () => {
  for (const episode of allStoryEpisodes) {
    for (const lesson of lessonsForTaskIds(episode.taskIds)) {
      assert.match(lesson.id, /^pilot-/, `${episode.id} links ${lesson.id}, which is not an approved lesson`);
    }
  }
  // Chapter 2's first episode names the pronoun pack, which IS approved, so it resolves; the other
  // nine name draft packs and resolve to nothing rather than to a broken link.
  const withLessons = allStoryEpisodes.filter((episode) => lessonsForTaskIds(episode.taskIds).length > 0);
  assert.deepEqual(withLessons.map((episode) => episode.id), ['c0.story.01', 'c0.story.02', 'c1.story.ch2.01']);
});
