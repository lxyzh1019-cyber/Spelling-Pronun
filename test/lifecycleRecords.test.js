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
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { foundation2Packs } from '../src/data/packs.foundation2.draft.js';
import { c1StoryEpisodes } from '../src/data/storyEpisodes.js';

const allPacks = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks, ...foundation2Packs];
const packIds = new Set(allPacks.map((pack) => pack.id));

// THE ONE EXCEPTION, and exactly as wide as the parent's words. On 2026-09-29 (R7) the parent, in
// chat, approved the four existing packs the diagnostic flagged and directed that all eight be opened
// after the independent check (choice B: record it in the parent's name). A record may carry a
// verdict or a countersignature only if it names the parent, is dated 2026-09-29, is about one of
// these eight packs, and carries that pack's basis word for word. Anything else is still Claude
// signing on someone's behalf.
const PARENT_DATE = '2026-09-29';
const BASIS_EXISTING = "Given in chat 2026-09-29 (R7): approved; opened after the independent check at the parent's direction; questions not read item by item.";
const BASIS_F2 = 'Given in chat 2026-09-29 (R7): open after the independent check; questions not read item by item.';
const PARENT_DECIDED = new Map([
  ['g1.pack.gr.possessives', BASIS_EXISTING],
  ['p1.pack.pu.apostrophes', BASIS_EXISTING],
  ['p1.pack.pu.dialogue', BASIS_EXISTING],
  ['f1.pack.ph.syllables', BASIS_EXISTING],
  ['f2.pack.ph.digraphs-clusters', BASIS_F2],
  ['f2.pack.ph.blend-segment', BASIS_F2],
  ['f2.pack.sp.inflections', BASIS_F2],
  ['f2.pack.ph.multisyllable', BASIS_F2],
]);

// THE RULE. Nothing Claude writes may carry a judgement attributed to anyone, except the parent's
// recorded decisions above.
test('no record Claude drafted carries a review verdict', () => {
  const verdictPacks = [];
  for (const form of educational.reviews) {
    assert.equal(form.verdict, null, `${form.id} has a verdict Claude must not set`);
    assert.equal(form.reviewedBy, null, `${form.id} names a reviewer`);
    assert.equal(form.reviewedAt, null, `${form.id} is dated as reviewed`);
    const allDecided = form.packs.every((pack) => PARENT_DECIDED.has(pack.packId));
    assert.equal(form.status, allDecided ? 'decided_by_parent' : 'awaiting_parent');
    for (const pack of form.packs) {
      if (!PARENT_DECIDED.has(pack.packId)) {
        assert.equal(pack.verdict, null, `${pack.packId} has a verdict Claude must not set`);
        for (const field of ['reviewedBy', 'reviewedAt', 'basis', 'decidedAtPackVersion']) assert.equal(pack[field], undefined, `${pack.packId} carries ${field}`);
        continue;
      }
      verdictPacks.push(pack.packId);
      assert.equal(pack.verdict, 'approved');
      assert.equal(pack.reviewedBy, 'parent');
      assert.equal(pack.reviewedAt, PARENT_DATE);
      assert.equal(pack.basis, PARENT_DECIDED.get(pack.packId), `${pack.packId} carries a basis the parent did not give`);
      assert.equal(pack.decidedAtPackVersion, pack.packVersion, `${pack.packId}'s verdict is about another version`);
      assert.match(pack.openGap, /^Sources are an open gap/, `${pack.packId} does not say its sources are an open gap`);
    }
  }
  assert.deepEqual(verdictPacks.sort(), [...PARENT_DECIDED.keys()].sort(), 'the parent\u2019s verdicts are not exactly the eight packs');
  for (const episode of educational.episodesAwaitingReview) {
    assert.equal(episode.verdict, null, `${episode.episodeId} has a verdict Claude must not set`);
  }
  // The countersignatures follow the same rule.
  const countersigned = integration.records.flatMap((record) => record.countersignatures || []);
  assert.deepEqual(countersigned.map((entry) => entry.packId).sort(), [...PARENT_DECIDED.keys()].sort());
  for (const entry of countersigned) {
    assert.equal(entry.countersignedBy, 'parent');
    assert.equal(entry.countersignedAt, PARENT_DATE);
    assert.equal(entry.basis, PARENT_DECIDED.get(entry.packId), `${entry.packId} is countersigned on a basis the parent did not give`);
  }
  // And nothing else anywhere in these three files claims a person decided something. The parent's
  // entries, having passed the checks above, are the only thing taken out before looking.
  const withoutParent = JSON.parse(JSON.stringify([integration, challenge, educational]), (key, value) => {
    if (value && typeof value === 'object' && PARENT_DECIDED.get(value.packId) === value.basis && (value.reviewedBy === 'parent' || value.countersignedBy === 'parent')) return undefined;
    return value;
  });
  const text = JSON.stringify(withoutParent);
  assert.doesNotMatch(text, /"reviewedBy"\s*:\s*"(?!null)/, 'a record names a reviewer');
  assert.doesNotMatch(text, /"countersignedBy"\s*:\s*"(?!null)/, 'a record names a countersigner');
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
// fields on each item are derived, and only the eight packs the parent decided can reach reviewed,
// integrated or the pilot (test/independentReview.test.js holds what else that takes).
test('writing these records releases nothing', () => {
  for (const pack of allPacks) {
    for (const item of pack.items) {
      assert.notEqual(item.releaseStatus, 'released', `${item.id} was released by a record Claude wrote`);
      if (PARENT_DECIDED.has(pack.id)) continue;
      assert.equal(item.releaseStatus, 'not_released', `${item.id} was released by a record Claude wrote`);
      assert.notEqual(item.reviewStatus, 'reviewed', `${item.id} is marked reviewed`);
      assert.notEqual(item.integrationStatus, 'integrated', `${item.id} is marked integrated`);
    }
  }
  for (const episode of c1StoryEpisodes) {
    assert.equal(episode.releaseStatus, 'not_released', `${episode.id} was released by a record Claude wrote`);
  }
});
