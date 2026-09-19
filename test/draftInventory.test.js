// What is written and waiting for the parent to read.
//
// The lifecycle already stops unreviewed content reaching a child. What it did not do was let the
// parent see what is waiting, which quietly turns "waiting for review" into "waiting forever". These
// tests hold the inventory to being derived from the data rather than hand-written, and to saying
// plainly that none of it is live.
import test from 'node:test';
import assert from 'node:assert/strict';
import { draftPacksFor, openCorrectionsFor, summariseDraftInventory } from '../src/learning/draftInventory.js';
import correctionData from '../src/data/corrections.c0.json' with { type: 'json' };
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';

const groups = [{ batch: 'C1', packs: c1Packs }, { batch: 'F1', packs: foundationPacks }];

test('the open corrections are exactly the unresolved ones, with what they cost', () => {
  const open = openCorrectionsFor(correctionData.corrections);
  const expected = correctionData.corrections.filter((correction) => correction.reviewStatus === 'changes_required');
  assert.equal(open.length, expected.length);
  for (const correction of open) {
    assert.ok(correction.reason.length > 30, `${correction.id} does not say why it was raised`);
    assert.ok(correction.change.length > 30, `${correction.id} does not say what would change`);
    assert.ok(correction.draftedIn, `${correction.id} does not say where to read the replacement`);
    assert.ok(correction.requiresOnInstall, `${correction.id} does not say what installing it costs`);
    assert.ok(correction.itemCount > 0, `${correction.id} covers nothing`);
  }
  // A resolved correction must never appear as still waiting.
  const resolved = new Set(correctionData.corrections.filter((entry) => entry.reviewStatus === 'reviewed').map((entry) => entry.id));
  for (const correction of open) assert.ok(!resolved.has(correction.id), `${correction.id} is resolved but listed as waiting`);
});

// Derived from the packs themselves. A pack cannot be added without appearing here, which is the
// difference between an inventory and a list someone remembers to update.
test('every draft pack appears, and says what it is for', () => {
  const packs = draftPacksFor(groups);
  assert.equal(packs.length, c1Packs.length + foundationPacks.length);
  for (const pack of packs) {
    assert.ok(pack.title.length > 5, `${pack.id} has no title`);
    assert.ok(pack.rule.length > 60, `${pack.id} does not state its rule`);
    assert.equal(pack.itemCount, 24);
    assert.ok(pack.questionCount > 0 && pack.questionCount < 24, `${pack.id} reports ${pack.questionCount} questions`);
    assert.match(pack.status, /^draft/, `${pack.id} is listed as waiting but is not a draft`);
    // Exactly one honest answer to "what is this for": named Alberta outcomes, or a grade placement
    // that says it deliberately measures none.
    const claimsOutcomes = pack.curriculumOutcomeIds.length > 0;
    const claimsPlacement = Boolean(pack.albertaPlacement);
    assert.ok(claimsOutcomes !== claimsPlacement, `${pack.id} must name its outcomes or say it has none, not both or neither`);
    if (claimsPlacement) assert.deepEqual(pack.curriculumOutcomeIds, [], `${pack.id} claims an outcome and a placement`);
  }
});

test('the summary counts honestly and says nothing is live', () => {
  const corrections = openCorrectionsFor(correctionData.corrections);
  const packs = draftPacksFor(groups);
  const summary = summariseDraftInventory({ corrections, packs });
  assert.equal(summary.correctionCount, corrections.length);
  assert.equal(summary.packCount, packs.length);
  assert.equal(summary.packItems, packs.reduce((sum, pack) => sum + pack.itemCount, 0));
  // The first thing a reader needs to know.
  assert.equal(summary.inFrontOfAChild, 0);
  assert.match(summary.summary, /None of it is in front of a child/);
  assert.doesNotMatch(summary.summary, /%|percent/i, 'the summary reports a percentage');
  // An empty queue says so rather than reporting zeroes as if they were work.
  assert.equal(summariseDraftInventory({}).summary, 'Nothing is waiting for you.');
});
