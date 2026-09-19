// The lifecycle records Claude prepares, and the line Claude may not cross in preparing them.
//
// The parent chose to keep the full lifecycle — an independent challenge, an educational review, an
// integration record — with Claude drafting the records rather than the parent writing them from
// scratch. That is a reasonable division of labour and a dangerous one, because the whole value of
// the lifecycle is that a person made a judgement. A record that LOOKS signed is worse than no
// record at all.
//
// So the boundary is mechanical here rather than remembered:
//
//   integration   Claude may draft it in full. Every claim is checkable by re-running a named test.
//   challenge     Claude may draft it only as a self-challenge, and it must say so in its own fields.
//   educational   Claude may prepare the form and never the verdict.
import test from 'node:test';
import assert from 'node:assert/strict';
import integration from '../src/data/integration.batches.json' with { type: 'json' };
import challenge from '../src/data/reviews.batches.json' with { type: 'json' };
import educational from '../src/data/reviews.educational.batches.json' with { type: 'json' };
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { c1StoryEpisodes } from '../src/data/storyEpisodes.js';

const allPacks = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks];
const packIds = new Set(allPacks.map((pack) => pack.id));

// THE RULE. Nothing Claude writes may carry a judgement attributed to anyone.
test('no record Claude drafted carries a review verdict', () => {
  for (const form of educational.reviews) {
    assert.equal(form.verdict, null, `${form.id} has a verdict Claude must not set`);
    assert.equal(form.reviewedBy, null, `${form.id} names a reviewer`);
    assert.equal(form.reviewedAt, null, `${form.id} is dated as reviewed`);
    assert.equal(form.status, 'awaiting_parent');
    for (const pack of form.packs) {
      assert.equal(pack.verdict, null, `${pack.packId} has a verdict Claude must not set`);
    }
  }
  for (const episode of educational.episodesAwaitingReview) {
    assert.equal(episode.verdict, null, `${episode.episodeId} has a verdict Claude must not set`);
  }
  // And nothing anywhere in these three files claims a person decided something.
  const text = JSON.stringify([integration, challenge, educational]);
  assert.doesNotMatch(text, /"reviewedBy"\s*:\s*"(?!null)/, 'a record names a reviewer');
  assert.doesNotMatch(text, /"decidedBy"\s*:\s*"/, 'a record names a decider');
  assert.doesNotMatch(text, /"verdict"\s*:\s*"/, 'a record carries a verdict');
});

// A self-challenge that did not say it was one would read exactly like an independent pass, which is
// the stage the lifecycle actually requires.
test('the challenge records say plainly that they are not independent', () => {
  assert.ok(challenge.limitation.length > 200, 'the limitation is not stated at the top level');
  assert.match(challenge.limitation, /author checking their own work/i);
  for (const record of challenge.reviews) {
    assert.equal(record.stage, 'author_self_challenge', `${record.id} claims a stage it did not reach`);
    assert.notEqual(record.stage, 'independent_challenge');
    assert.equal(record.independent, false);
    assert.equal(record.satisfiesIndependentChallenge, false, `${record.id} claims to satisfy the independent challenge`);
    assert.equal(record.reviewerRole, 'claude_self_challenge');
    assert.ok(record.limitation.length > 200, `${record.id} does not carry the limitation`);
  }
});

// A blanket per-item "pass" written by the author of those items would be a record of nothing. The
// absence has to be deliberate and explained, not an oversight.
test('the self-challenge claims only what it actually checked', () => {
  for (const record of challenge.reviews) {
    assert.equal(record.perItemResults, null, `${record.id} asserts a verdict on every item it wrote`);
    assert.ok(record.whyNoPerItemResults.length > 100, `${record.id} does not say why there are no per-item results`);
    // The automated rules are named with the test file that enforces each, so the claim is checkable.
    assert.ok(record.automatedChecks.length >= 5);
    for (const check of record.automatedChecks) {
      assert.ok(check.rule.length > 20, 'a named check has no rule');
      assert.match(check.test, /test\//, `"${check.rule}" names no test file`);
    }
  }
  // The findings are specific and each says what was done, not just what was wrong.
  const findings = challenge.reviews.flatMap((record) => record.findings);
  assert.ok(findings.length > 0, 'a self-challenge that found nothing found nothing worth recording');
  for (const finding of findings) {
    assert.ok(finding.found.length > 40, `${finding.id} does not say what was wrong`);
    assert.ok(finding.action.length > 20, `${finding.id} does not say what was done`);
    assert.ok(finding.foundBy.length > 10, `${finding.id} does not say how it was found`);
  }
});

// Integration is the one Claude may assert, because every line is re-checkable.
test('every integration claim names the content it covers and how to check it', () => {
  for (const record of integration.records) {
    assert.equal(record.status, 'drafted_awaiting_parent_countersignature');
    assert.equal(record.countersignedBy, null, `${record.id} countersigned itself`);
    assert.equal(record.draftedBy, 'claude');
    for (const packId of record.packIds) assert.ok(packIds.has(packId), `${record.id} names unknown pack ${packId}`);
    assert.ok(record.evidence.length >= 4, `${record.id} asserts integration with little evidence`);
    for (const line of record.evidence) assert.ok(line.length > 40);
    // And it says what it is NOT, because "integrated" sounds like "good".
    assert.match(record.whatThisDoesNotSay, /wiring|whether the questions/i);
  }
  const covered = integration.records.flatMap((record) => record.packIds);
  assert.equal(new Set(covered).size, allPacks.length, 'a pack has no integration record');
  assert.equal(
    integration.records.reduce((sum, record) => sum + record.expectedObjectCount, 0),
    allPacks.reduce((sum, pack) => sum + pack.items.length, 0),
  );
});

// The forms have to cover everything waiting, or the parent signs off on less than they think.
test('every drafted pack and episode has a review form waiting', () => {
  const formPacks = educational.reviews.flatMap((form) => form.packs.map((pack) => pack.packId));
  assert.deepEqual(formPacks.slice().sort(), [...packIds].sort());
  for (const form of educational.reviews) {
    for (const pack of form.packs) {
      assert.ok(pack.rule && pack.title && pack.questionCount, `${pack.packId} is listed with nothing to read`);
    }
  }
  assert.deepEqual(
    educational.episodesAwaitingReview.map((episode) => episode.episodeId).sort(),
    c1StoryEpisodes.map((episode) => episode.id).sort(),
  );
});

// The records must not be able to release anything by existing. They are documents; the status
// fields on each item are what the approval mapper reads, and Claude does not set those.
test('writing these records releases nothing', () => {
  for (const pack of allPacks) {
    for (const item of pack.items) {
      assert.equal(item.releaseStatus, 'not_released', `${item.id} was released by a record Claude wrote`);
      assert.notEqual(item.reviewStatus, 'reviewed', `${item.id} is marked reviewed`);
      assert.notEqual(item.integrationStatus, 'integrated', `${item.id} is marked integrated`);
    }
  }
  for (const episode of c1StoryEpisodes) {
    assert.equal(episode.releaseStatus, 'not_released', `${episode.id} was released by a record Claude wrote`);
  }
});
