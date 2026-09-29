// The structural guard on batch review state.
//
// A batch item's `reviewStatus` / `integrationStatus` are derived at build time by
// `applyReviewEvidence` (src/learning/independentReview.js), called from `finaliseDraftPacks`. These
// tests hold three things:
//
//   1. every reviewed or integrated batch item really is covered: a pass in BOTH separate-agent
//      records at its exact version and content, and the parent's verdict and countersignature at
//      its pack's version — checked here directly against the records, not through the derivation;
//   2. the records say what they are: agents, not people, and the source gap is open;
//   3. the guard bites: editing an item, bumping its version, changing a rule, or removing a parent
//      decision each returns the content to draft and off the learner route.
import test from 'node:test';
import assert from 'node:assert/strict';
import agentRecords from '../src/data/reviews.independent.batches.json' with { type: 'json' };
import approvalData from '../src/data/pilotApproval.batches.json' with { type: 'json' };
import { applyReviewEvidence, itemFingerprint, packFingerprint } from '../src/learning/independentReview.js';
import { batchReviewEvidence } from '../src/data/batchReviewEvidence.js';
import { finaliseDraftPacks } from '../src/data/draftBatch.js';
import { packIsLearnerVisible } from '../src/data/lessonCatalog.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { foundation2Packs } from '../src/data/packs.foundation2.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { grammarPacks } from '../src/data/packs.grammar.draft.js';

const batchPacks = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks, ...foundation2Packs];
const EIGHT = [
  'g1.pack.gr.possessives', 'p1.pack.pu.apostrophes', 'p1.pack.pu.dialogue', 'f1.pack.ph.syllables',
  'f2.pack.ph.digraphs-clusters', 'f2.pack.ph.blend-segment', 'f2.pack.sp.inflections', 'f2.pack.ph.multisyllable',
];
const resultsFor = (stage) => agentRecords.reviews.filter((review) => review.stage === stage).flatMap((review) => review.packs);

// 1. Checked against the records directly, so a bug in the derivation cannot hide behind itself.
test('every reviewed or integrated batch item has a pass in both records at its exact version and content', () => {
  let covered = 0;
  for (const pack of batchPacks) {
    for (const item of pack.items) {
      if (item.reviewStatus !== 'reviewed' && item.integrationStatus !== 'integrated') continue;
      covered += 1;
      assert.ok(EIGHT.includes(pack.id), `${item.id} is reviewed but its pack is not one the parent decided`);
      for (const stage of ['independent_challenge', 'educational_source_review']) {
        const entry = resultsFor(stage).find((candidate) => candidate.packId === pack.id);
        assert.ok(entry, `${stage} has no record of ${pack.id}`);
        assert.equal(entry.packVersion, pack.version, `${stage} saw ${pack.id} at another version`);
        assert.equal(entry.packFingerprint, packFingerprint(pack), `${stage} saw a different rule, help or sources for ${pack.id}`);
        const result = entry.results.find((candidate) => candidate.itemId === item.id);
        assert.ok(result, `${stage} has no result for ${item.id}`);
        assert.equal(result.outcome, 'pass', `${stage} did not pass ${item.id}`);
        assert.equal(result.itemVersion, item.version, `${item.id} is at v${item.version}; ${stage} passed v${result.itemVersion}`);
        assert.equal(result.contentFingerprint, itemFingerprint(item), `${item.id} was edited after ${stage} passed it`);
      }
      const verdict = batchReviewEvidence.parentVerdicts.find((entry) => entry.packId === pack.id);
      assert.equal(verdict?.reviewedBy, 'parent');
      assert.equal(verdict?.packVersion, pack.version);
      const countersigned = batchReviewEvidence.parentCountersignatures.find((entry) => entry.packId === pack.id);
      assert.equal(countersigned?.countersignedBy, 'parent');
      assert.equal(countersigned?.packVersion, pack.version);
    }
  }
  assert.equal(covered, 8 * 24, 'not exactly the eight decided packs are reviewed');
  for (const pack of batchPacks) assert.equal(pack.items.every((item) => item.reviewStatus === 'reviewed'), EIGHT.includes(pack.id), `${pack.id} review state does not match the decisions`);
});

// 2. What the records are, in their own fields.
test('the review records are two separate-agent passes, not a person, and keep the source gap open', () => {
  assert.equal(agentRecords.reviews.length, 2);
  for (const review of agentRecords.reviews) {
    assert.equal(review.humanReviewer, false, `${review.id} claims a person reviewed it`);
    assert.equal(review.wroteTheContent, false);
    assert.equal(review.reviewerKind, 'separate_agent');
    assert.equal(review.reviewedAt, '2026-09-29');
    assert.equal(review.reviewedCommit, 'e673996');
    assert.equal(review.reviewedBy, undefined, `${review.id} names a reviewer`);
    assert.deepEqual(review.packs.map((pack) => pack.packId).sort(), [...EIGHT].sort());
    for (const pack of review.packs) {
      assert.equal(pack.results.length, 24);
      for (const result of pack.results) assert.equal(result.outcome, 'pass', `${result.itemId} did not pass ${review.stage}`);
    }
  }
  assert.deepEqual(agentRecords.reviews.map((review) => review.reviewerRole).sort(), ['educational_and_source_resolution_pass', 'separate_content_challenge_pass']);
  const educational = agentRecords.reviews.find((review) => review.stage === 'educational_source_review');
  for (const pack of educational.packs) {
    assert.equal(pack.contentOutcome, 'pass');
    assert.equal(pack.sourceOutcome, 'fail', `${pack.packId} no longer records the source failure`);
    assert.deepEqual(pack.sourceGap, { status: 'open', sourceOutcome: 'fail' });
    assert.match(pack.findings, /SOURCE fail/, `${pack.packId} lost the verbatim source finding`);
  }
  assert.match(agentRecords.sourceGap, /^OPEN\./);
  // The pilot approvals are exactly the eight.
  assert.deepEqual(approvalData.approvals.map((approval) => approval.scopeId).sort(), [...EIGHT].sort());
});

// 3. The guard bites. Each case starts from a real approved pack returned to draft, so what is
// proved is that the real records cover exactly the real content and nothing near it.
const asDrafted = (pack) => ({
  ...pack,
  status: 'draft_needs_independent_challenge',
  items: pack.items.map((item) => ({ ...item, authorStatus: 'draft', reviewStatus: 'needs_independent_challenge', integrationStatus: 'not_integrated', releaseStatus: 'not_released' })),
});
const reachable = (pack, evidence = batchReviewEvidence) => {
  const [finalised] = finaliseDraftPacks([pack], { approvals: approvalData.approvals, reviews: evidence });
  return finalised;
};

test('the real records cover the real content: a drafted copy is reviewed and reaches the pilot again', () => {
  for (const pack of batchPacks.filter((candidate) => EIGHT.includes(candidate.id))) {
    const finalised = reachable(asDrafted(pack));
    assert.equal(finalised.status, 'integrated', `${pack.id} is not covered by its own records`);
    assert.ok(packIsLearnerVisible(finalised), `${pack.id} does not reach the pilot from its records`);
    assert.ok(finalised.items.every((item) => item.releaseStatus === 'pilot_approved'));
  }
});

test('editing a reviewed question without a re-review returns it to draft and closes the lesson', () => {
  const pack = asDrafted(grammarPacks.find((candidate) => candidate.id === 'g1.pack.gr.possessives'));
  // A guided item as well as an independent one: a lesson serves both, and only the independent
  // ones decide whether it opens, so an edited guided item must close it too.
  for (const role of ['independent', 'guided', 'worked_example']) editAndCheck(pack, pack.items.findIndex((item) => item.role === role), role);
});

function editAndCheck(pack, editedIndex, role) {
  const edits = {
    'the prompt changed': (item) => ({ ...item, prompt: `${item.prompt} ` }),
    'the explanation changed': (item) => ({ ...item, explanation: `${item.explanation} Also.` }),
    'the key changed': (item) => ({ ...item, acceptedAnswers: [item.acceptedAnswers[0] === 'a' ? 'b' : 'a'] }),
    'the version was bumped without a re-review': (item) => ({ ...item, version: item.version + 1 }),
  };
  for (const [why, edit] of Object.entries(edits)) {
    // A worked example has no key to change.
    if (role === 'worked_example' && why === 'the key changed') continue;
    const edited = { ...pack, items: pack.items.map((item, index) => (index === editedIndex ? edit(item) : item)) };
    const finalised = reachable(edited);
    assert.ok(finalised.items.every((item) => item.reviewStatus === 'needs_independent_challenge'), `${role}, ${why}: items kept their review`);
    assert.ok(finalised.items.every((item) => item.releaseStatus === 'not_released'), `${role}, ${why}: items stayed in the pilot`);
    assert.equal(packIsLearnerVisible(finalised), false, `${role}, ${why}: a learner can still open the lesson`);
    assert.notEqual(finalised.status, 'integrated', `${role}, ${why}: the pack still says integrated`);
  }
}

test('changing the rule, the version, or a parent decision returns the whole pack to draft', () => {
  const pack = asDrafted(foundation2Packs.find((candidate) => candidate.id === 'f2.pack.sp.inflections'));
  const withoutPack = (list, key = 'packId') => list.filter((entry) => entry[key] !== pack.id);
  const cases = {
    'the rule changed': [{ ...pack, rule: `${pack.rule} ` }, batchReviewEvidence],
    'the sources changed': [{ ...pack, sourceIds: ['ab-elal-2022-overview'] }, batchReviewEvidence],
    'the pack version was bumped': [{ ...pack, version: pack.version + 1 }, batchReviewEvidence],
    'no parent verdict': [pack, { ...batchReviewEvidence, parentVerdicts: withoutPack(batchReviewEvidence.parentVerdicts) }],
    'no parent countersignature': [pack, { ...batchReviewEvidence, parentCountersignatures: withoutPack(batchReviewEvidence.parentCountersignatures) }],
    'a verdict not given by the parent': [pack, { ...batchReviewEvidence, parentVerdicts: batchReviewEvidence.parentVerdicts.map((entry) => (entry.packId === pack.id ? { ...entry, reviewedBy: 'claude' } : entry)) }],
    'only one of the two agent passes': [pack, { ...batchReviewEvidence, agentReviews: batchReviewEvidence.agentReviews.filter((review) => review.stage === 'independent_challenge') }],
    'a record that says a person reviewed it': [pack, { ...batchReviewEvidence, agentReviews: batchReviewEvidence.agentReviews.map((review) => ({ ...review, humanReviewer: true })) }],
  };
  for (const [why, [candidate, evidence]] of Object.entries(cases)) {
    const finalised = reachable(candidate, evidence);
    assert.ok(finalised.items.every((item) => item.reviewStatus === 'needs_independent_challenge'), `${why}: items kept their review`);
    assert.equal(packIsLearnerVisible(finalised), false, `${why}: a learner can still open the lesson`);
  }
});

// The derivation only raises. A pack it does not cover is left exactly as built, which is what keeps
// C0 (reviewed by hand in its own file) and every test fixture untouched.
test('the derivation never lowers anything and ignores packs it has no record of', () => {
  const fixture = { id: 'x1.pack.fixture', version: 1, items: [{ id: 'x1.01', version: 1, role: 'independent', reviewStatus: 'reviewed', integrationStatus: 'integrated', releaseStatus: 'not_released' }] };
  assert.deepEqual(applyReviewEvidence(fixture, batchReviewEvidence), fixture);
  const drafted = c1Packs[0];
  assert.deepEqual(applyReviewEvidence(drafted, batchReviewEvidence), drafted);
});
