// Can the parent actually approve anything?
//
// Until 2026-09-19 the answer was no, for 264 of the 360 drafted questions. `applyPilotApproval` is
// what promotes an item from `not_released` to `pilot_approved`, and three of the five pack files
// never ran through it. So the parent could have read every question, decided every one was good,
// written the approval record, and nothing would have changed — no code would have read it.
//
// That is a worse failure than an unreviewed pack reaching a child, because it is invisible. The
// lifecycle appears to be working: content is withheld, the review surface lists it, the gate holds.
// It just has no open end.
//
// These tests hold both halves: the gate still refuses everything it should, AND an approval that
// meets every precondition actually takes effect.
import test from 'node:test';
import assert from 'node:assert/strict';
import approvalData from '../src/data/pilotApproval.batches.json' with { type: 'json' };
import c0ApprovalData from '../src/data/pilotApproval.c0.json' with { type: 'json' };
import correctionData from '../src/data/corrections.c0.json' with { type: 'json' };
import { finaliseDraftEpisodes, finaliseDraftPacks } from '../src/data/draftBatch.js';
import { validatePilotApprovals } from '../src/learning/pilotApproval.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { allStoryEpisodes } from '../src/data/storyEpisodes.js';

const draftPacks = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks];

// A pack that has cleared every gate except the parent's decision. Built here as a fixture and never
// written to the repository, because Claude may not set `reviewStatus` or `integrationStatus`.
const readyPack = (id = 'x1.pack.fixture') => ({
  id,
  skillId: 'XX.fixture',
  items: [1, 2].map((n) => ({
    id: `${id}.0${n}`,
    packId: id,
    role: 'independent',
    reviewStatus: 'reviewed',
    integrationStatus: 'integrated',
    releaseStatus: 'not_released',
  })),
});

const approvalFor = (scopeId) => ({
  scopeId,
  scopeType: 'pack',
  scopeVersion: 1,
  decision: 'approved',
  decidedBy: 'parent',
  decidedAt: '2026-09-19',
});

// The half that was missing. If this fails, the parent has no way to release anything.
test('an approval that meets every precondition actually promotes the content', () => {
  const pack = readyPack();
  const [finalised] = finaliseDraftPacks([pack], { approvals: [approvalFor(pack.id)] });
  for (const item of finalised.items) {
    assert.equal(item.releaseStatus, 'pilot_approved', `${item.id} was not promoted by a valid approval`);
  }
});

// The half that already worked, and must keep working.
test('an approval takes effect only when the lifecycle behind it is complete', () => {
  const pack = readyPack();
  const approvals = [approvalFor(pack.id)];
  const unchanged = (mutate, why) => {
    const [finalised] = finaliseDraftPacks([{ ...pack, items: pack.items.map(mutate) }], { approvals });
    for (const item of finalised.items) assert.equal(item.releaseStatus, 'not_released', why);
  };
  unchanged((item) => ({ ...item, reviewStatus: 'needs_independent_challenge' }), 'unreviewed content was approved');
  unchanged((item) => ({ ...item, integrationStatus: 'not_integrated' }), 'unintegrated content was approved');
  unchanged((item) => ({ ...item, correctionStatus: 'changes_required' }), 'content with an open correction was approved');
  // And no approval at all leaves it alone.
  const [none] = finaliseDraftPacks([pack], { approvals: [] });
  for (const item of none.items) assert.equal(item.releaseStatus, 'not_released');
});

// Corrections must resolve before the approval runs. The other order stamps every corrected item
// `correction_not_installed` on the way past, which is DEF-48 in a new place.
test('corrections resolve before the approval, not after', () => {
  const pack = readyPack();
  const corrections = [{
    id: 'corr.fixture.01',
    itemIds: [pack.items[0].id],
    reviewStatus: 'changes_required',
    severity: 'defect',
    reason: 'fixture',
    change: 'fixture',
  }];
  const [finalised] = finaliseDraftPacks([pack], { corrections, approvals: [approvalFor(pack.id)] });
  const [withDefect, clean] = finalised.items;
  assert.notEqual(withDefect.releaseStatus, 'pilot_approved', 'an item with an open defect was approved');
  assert.equal(clean.releaseStatus, 'pilot_approved', 'the unaffected item was withheld too');
});

// Every batch written after C0 goes through the same tail. A new pack file that forgot it would be
// silently unapprovable, which is exactly what happened to three of them.
test('every drafted pack runs through the approval mapper', () => {
  assert.ok(draftPacks.length >= 15, 'a pack file is missing from this check');
  for (const pack of draftPacks) {
    const approvals = [approvalFor(pack.id)];
    const ready = {
      ...pack,
      items: pack.items.map((item) => ({ ...item, reviewStatus: 'reviewed', integrationStatus: 'integrated' })),
    };
    const [finalised] = finaliseDraftPacks([ready], { approvals });
    const independent = finalised.items.filter((item) => item.role === 'independent');
    assert.ok(
      independent.some((item) => item.releaseStatus === 'pilot_approved'),
      `${pack.id} cannot be approved even with a complete lifecycle behind it`,
    );
  }
});

// Nothing is approved today, and Claude may never change that.
test('no batch written after C0 is approved, and the record says why it is empty', () => {
  assert.deepEqual(approvalData.approvals, [], 'Claude recorded a pilot approval');
  assert.ok(approvalData.emptyOnPurpose.length > 80, 'the empty list does not say why it is empty');
  assert.match(approvalData.howAnApprovalTakesEffect, /reviewStatus|integrationStatus/);
  for (const pack of draftPacks) {
    for (const item of pack.items) {
      assert.equal(item.releaseStatus, 'not_released', `${item.id} is released without a parent decision`);
    }
  }
});

// `validatePilotApprovals` existed but had no runtime call site at all — grep found it only in unit
// tests with fixtures. So the real approval records were never checked against the real content: a
// record naming a pack that does not exist, or reaching past what was reviewed, would pass unseen.
test('the real approval records validate against the real content', () => {
  const packs = [...c0PilotPacks, ...draftPacks];
  const approvals = [...c0ApprovalData.approvals, ...approvalData.approvals];
  const { errors } = validatePilotApprovals({
    approvals,
    packs,
    assessmentForms: c0AssessmentForms,
    episodes: allStoryEpisodes,
    corrections: correctionData.corrections,
  });
  assert.deepEqual(errors, [], 'the recorded pilot approvals do not validate against the content they name');
  // And the check is not passing by having nothing to check. The first time this ran against the
  // real data it reported the two chapter-1 episodes as "unknown content", because the episodes were
  // not being passed in — which is the kind of thing that goes unnoticed for as long as a validator
  // only ever sees fixtures.
  assert.ok(approvals.length >= 4, 'no approval records were validated');
  assert.ok(packs.length >= 19 && allStoryEpisodes.length === 12, 'the validator was given a partial view of the content');
});

// An approval naming content that does not exist must be caught, or the check above proves nothing.
test('an approval for a pack that does not exist is rejected', () => {
  const { errors } = validatePilotApprovals({
    approvals: [approvalFor('x1.pack.does-not-exist')],
    packs: [readyPack()],
  });
  assert.ok(errors.length > 0, 'an approval for unknown content validated');
});

// Episodes have their own mapper and the same rule.
test('an episode is promoted only with a complete lifecycle and a parent decision', () => {
  const episode = { id: 'c1.story.fixture', reviewStatus: 'reviewed', integrationStatus: 'integrated', releaseStatus: 'not_released' };
  const approvals = [{ ...approvalFor(episode.id), scopeType: 'episode' }];
  assert.equal(finaliseDraftEpisodes([episode], { approvals })[0].releaseStatus, 'pilot_approved');
  assert.equal(finaliseDraftEpisodes([episode], { approvals: [] })[0].releaseStatus, 'not_released');
  const unreviewed = { ...episode, reviewStatus: 'needs_independent_challenge' };
  assert.equal(finaliseDraftEpisodes([unreviewed], { approvals })[0].releaseStatus, 'not_released');
});
