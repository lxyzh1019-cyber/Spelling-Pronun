// The story's totals, against the plan.
//
// `docs/MASTER_PLAN.md` commits Season 1 to six chapters of two episodes each, and the R3-G1 gate
// requires all twelve. Until 2026-09-18 only chapter one's two existed, and the six new lessons built
// that day were given no episode at all despite a standing decision to keep the story for everything
// — a gap nobody could see, because nothing counted.
//
// `story.ledger.json` is generated from the story files themselves rather than maintained by hand, so
// an episode cannot be written or lost without the count moving. These tests hold it to that.
import test from 'node:test';
import assert from 'node:assert/strict';
import ledger from '../src/data/story.ledger.json' with { type: 'json' };
import c0Story from '../src/data/story.c0.draft.json' with { type: 'json' };
import c1Story from '../src/data/story.c1.draft.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0PilotItems } from '../src/data/packs.c0.draft.js';
import { c1Items } from '../src/data/packs.c1.draft.js';
import { foundationItems } from '../src/data/packs.foundation.draft.js';
import { punctuationItems } from '../src/data/packs.punctuation.draft.js';
import { sentenceItems } from '../src/data/packs.sentences.draft.js';
import { readingGrade } from '../src/learning/readability.js';

const allEpisodes = [...c0Story.episodes, ...c1Story.episodes];
const itemIds = new Set([...c0PilotItems, ...c1Items, ...foundationItems, ...punctuationItems, ...sentenceItems].map((item) => item.id));
const sourceIds = new Set(sourceData.sources.map((source) => source.id));

test('the ledger states the plan’s totals and matches the episodes that exist', () => {
  assert.equal(ledger.plannedChapters, 6);
  assert.equal(ledger.episodesPerChapter, 2);
  assert.equal(ledger.plannedEpisodes, 12);
  assert.equal(ledger.writtenEpisodes, allEpisodes.length, 'the ledger disagrees with the story files');
  assert.equal(ledger.remainingEpisodes, ledger.plannedEpisodes - ledger.writtenEpisodes);
  assert.equal(ledger.chapters.length, 6);
  const counted = ledger.chapters.reduce((sum, chapter) => sum + chapter.writtenEpisodes, 0);
  assert.equal(counted, ledger.writtenEpisodes, 'the per-chapter counts do not add up to the total');
  // Nothing is released, and only chapter one is pilot-approved.
  assert.equal(ledger.releasedEpisodes, 0);
  assert.equal(ledger.pilotApprovedEpisodes, 2);
});

// A chapter short of its two episodes must say what is missing. "Not written yet" with no reason is
// how a gap becomes permanent.
test('every unfinished chapter says what is blocking it', () => {
  for (const chapter of ledger.chapters) {
    assert.ok(chapter.setting && chapter.caseProgression && chapter.languageFocus, `chapter ${chapter.chapter} lost its plan entry`);
    assert.ok(chapter.writtenEpisodes <= chapter.plannedEpisodes, `chapter ${chapter.chapter} has more episodes than planned`);
    if (chapter.writtenEpisodes < chapter.plannedEpisodes) {
      assert.ok(chapter.blockedBy && chapter.blockedBy.length > 40, `chapter ${chapter.chapter} is unfinished without saying why`);
    } else {
      assert.equal(chapter.blockedBy, undefined, `chapter ${chapter.chapter} is complete but claims to be blocked`);
    }
  }
});

test('every episode is whole, sourced, and labelled as fiction', () => {
  assert.equal(new Set(allEpisodes.map((episode) => episode.id)).size, allEpisodes.length, 'an episode id is used twice');
  for (const episode of allEpisodes) {
    for (const field of ['intro', 'recap', 'problem', 'decision', 'consequence', 'unresolvedQuestion', 'reveal', 'historyBehindMystery']) {
      assert.ok(String(episode[field] || '').trim().length > 30, `${episode.id} is missing ${field}`);
    }
    assert.ok(episode.fictionLabel, `${episode.id} has no fiction label`);
    assert.match(episode.historyBehindMystery, /Documented:/, `${episode.id} dropped its documented claims`);
    assert.match(episode.historyBehindMystery, /Invented:/, `${episode.id} dropped its invented-element disclosure`);
    for (const id of episode.sourceIds) assert.ok(sourceIds.has(id), `${episode.id} cites unknown source ${id}`);
    // The recap is two sentences by design: it is read before the episode, not instead of it.
    assert.equal(episode.recap.split(/[.!?]+\s/).filter(Boolean).length, 2, `${episode.id} recap is not two sentences`);
    const words = episode.intro.trim().split(/\s+/).length;
    assert.ok(words >= 60 && words <= 100, `${episode.id} intro is ${words} words, outside the plan's 60 to 100`);
  }
});

// Every task an episode names has to exist, or the episode promises lessons a child cannot open.
test('every episode links to real lesson objects', () => {
  for (const episode of allEpisodes) {
    assert.ok(episode.taskIds.length > 0, `${episode.id} links to no lesson`);
    assert.equal(episode.taskIds.length % 8, 0, `${episode.id} links ${episode.taskIds.length} tasks, not whole lessons of eight`);
    for (const id of episode.taskIds) assert.ok(itemIds.has(id), `${episode.id} links unknown item ${id}`);
    assert.equal(new Set(episode.taskIds).size, episode.taskIds.length, `${episode.id} links the same item twice`);
  }
  // No item belongs to two episodes: that would let one lesson unlock two parts of the case.
  const all = allEpisodes.flatMap((episode) => episode.taskIds);
  assert.equal(new Set(all).size, all.length, 'an item is linked by more than one episode');
});

// The readability band the parent set on 2026-09-18: a year or two above the children, with the fact
// box held below the prose because it carries the documented-and-invented disclosure.
test('every episode reads inside the band, and none claims a status it has not earned', () => {
  for (const episode of allEpisodes) {
    const prose = ['intro', 'recap', 'reveal', 'problem'].map((field) => episode[field]).join(' ');
    const { grade } = readingGrade(prose);
    assert.ok(grade >= 6.5, `${episode.id} reads at grade ${grade.toFixed(1)}, below the floor of 6.5`);
    assert.ok(grade <= 8.5, `${episode.id} reads at grade ${grade.toFixed(1)}, above the ceiling of 8.5`);
    assert.ok(readingGrade(episode.historyBehindMystery).grade <= 9, `${episode.id} fact box reads too high`);
  }
  // Everything written since chapter one is draft and says so.
  for (const episode of c1Story.episodes) {
    assert.equal(episode.authorStatus, 'draft', `${episode.id} claims to be authored and reviewed`);
    assert.equal(episode.reviewStatus, 'needs_independent_challenge', `${episode.id} claims a review that has not happened`);
    assert.equal(episode.integrationStatus, 'not_integrated');
    assert.equal(episode.releaseStatus, 'not_released');
    assert.equal(episode.pilotStatus, undefined, `${episode.id} claims a pilot approval nobody recorded`);
  }
});
