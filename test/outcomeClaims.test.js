// What a pack is allowed to claim it measures.
//
// On 2026-09-19 two pack files cited four outcomes the mapping marks `not_measurable`:
//
//   conventions.grade5.03 / grade6.03  "Experiment with capitalization and punctuation to achieve a
//                                       desired effect."
//   writing.grade5.07 / grade6.09      "Revise drafts to improve the fluency, coherence, sequence,
//                                       and logical support of ideas."
//
// Both describe composition — experimenting, revising your own draft over time — and no four-option
// question can evidence either, however good the question is. `outcomeState()` routes
// `not_measurable` to `needs_parent`, which the mapping says must never be reported as a gap the app
// closes. So the claim was not merely generous, it pointed the coverage report at the wrong thing.
//
// The questions were fine. The citation was wrong, and nothing was checking citations.
import test from 'node:test';
import assert from 'node:assert/strict';
import mapping from '../src/data/curriculum.alberta.elal.json' with { type: 'json' };
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { buildCoverageReport, draftedGaps } from '../src/learning/curriculumCoverage.js';

const allPacks = [...c0PilotPacks, ...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks];

const outcomes = new Map();
for (const idea of mapping.organizingIdeas) {
  for (const grade of Object.values(idea.grades)) {
    for (const outcome of grade.skillsAndProcedures) outcomes.set(outcome.id, outcome);
  }
}

test('every outcome a pack cites exists in the mapping', () => {
  for (const pack of allPacks) {
    for (const id of pack.curriculumOutcomeIds || []) {
      assert.ok(outcomes.has(id), `${pack.id} cites ${id}, which is not an Alberta Grade 5/6 outcome`);
    }
  }
});

// The rule that was missing. A pack may not claim to measure something the mapping says no answer
// key can judge.
test('no pack claims an outcome the mapping calls not_measurable', () => {
  const overclaimed = [];
  for (const pack of allPacks) {
    for (const id of pack.curriculumOutcomeIds || []) {
      if (outcomes.get(id)?.coverage === 'not_measurable') overclaimed.push(`${pack.id} → ${id}`);
    }
  }
  assert.deepEqual(overclaimed, [], 'a pack claims to measure an outcome no answer key can judge');
});

// The same rule per item, since an item carries its own citation and a pack's list is their union.
test('no individual question claims a not_measurable outcome either', () => {
  const overclaimed = [];
  for (const pack of allPacks) {
    for (const item of pack.items) {
      for (const id of item.curriculumOutcomeIds || []) {
        if (outcomes.get(id)?.coverage === 'not_measurable') overclaimed.push(`${item.id} → ${id}`);
      }
    }
  }
  assert.deepEqual(overclaimed, []);
});

// The four that were wrong, named individually so a regression says which one came back.
test('the four over-claimed outcomes are no longer cited by anything', () => {
  const wereOverclaimed = ['conventions.grade5.03', 'conventions.grade6.03', 'writing.grade5.07', 'writing.grade6.09'];
  for (const id of wereOverclaimed) {
    assert.equal(outcomes.get(id).coverage, 'not_measurable', `${id} is no longer not_measurable — re-check whether the packs may cite it`);
    for (const pack of allPacks) {
      assert.ok(!(pack.curriculumOutcomeIds || []).includes(id), `${pack.id} cites ${id} again`);
    }
  }
});

// The questions themselves were never the problem and must not have been thrown away in the fix.
// Asking what a mark does to the MEANING — "Let us eat, Grandma" — is the difference between a child
// who can punctuate and one who has memorised a placement.
test('the punctuation packs still ask what the mark does to the meaning', () => {
  const items = punctuationPacks.flatMap((pack) => pack.items);
  const meaning = items.filter((item) => /mean|change|differ|matter/i.test(item.prompt));
  assert.ok(meaning.length >= 12, `only ${meaning.length} questions probe meaning rather than placement`);
  assert.ok(items.some((item) => /Grandma/.test(item.prompt)), 'the clearest example of a comma changing meaning was lost');
  // And they cite the outcome they actually measure.
  for (const item of meaning) {
    for (const id of item.curriculumOutcomeIds || []) {
      assert.notEqual(outcomes.get(id)?.coverage, 'not_measurable');
    }
  }
});

// The cross-reference that went stale in a day.
//
// `draftedIn` and `skillIds` were both hand-written on each outcome in the mapping, pointing at the
// packs that cover it. The moment nine packs were written, both were wrong: /parent reported 9
// outcomes as drafted when 16 had content, and "Apply punctuation to support effective written
// communication" still listed `PU.capitals-endmarks` alone, because that was the only punctuation
// pack on the day the mapping was written.
//
// A hand-maintained cross-reference between two files is a cross-reference that goes stale. Both are
// derived now, and these tests hold the two properties that make the derivation safe.
test('a pack that cites an outcome is reported against it, without anyone maintaining a list', () => {
  const packs = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks];
  const report = buildCoverageReport(mapping, { packs });
  const rows = new Map();
  for (const idea of report.ideas) for (const grade of idea.grades) for (const outcome of grade.outcomes) rows.set(outcome.id, outcome);

  for (const pack of packs) {
    for (const id of pack.curriculumOutcomeIds || []) {
      const row = rows.get(id);
      assert.ok(row.draftedIn?.includes(pack.id), `${id} does not report ${pack.id}, which cites it`);
      assert.ok(row.skillIds.includes(pack.skillId), `${id} does not list ${pack.skillId}, whose pack cites it`);
    }
  }
  // It found more than the hand-written list did, which is the whole point.
  assert.ok(draftedGaps(report).length > draftedGaps(buildCoverageReport(mapping)).length);
});

// The derivation must only ADD. The nine `covered` outcomes carry a hand-made judgement about whose
// mastery counts, and a derivation that replaced it would quietly overwrite that judgement.
test('deriving skills adds to the mapping and never overwrites it', () => {
  const packs = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks];
  const before = buildCoverageReport(mapping);
  const after = buildCoverageReport(mapping, { packs });
  // No outcome loses a declared skill.
  const declared = new Map();
  for (const idea of before.ideas) for (const grade of idea.grades) for (const outcome of grade.outcomes) declared.set(outcome.id, outcome.skillIds);
  for (const idea of after.ideas) for (const grade of idea.grades) for (const outcome of grade.outcomes) {
    for (const skillId of declared.get(outcome.id)) {
      assert.ok(outcome.skillIds.includes(skillId), `${outcome.id} lost the declared skill ${skillId}`);
    }
  }
  // And no outcome changes state, because draft content is not measurement.
  assert.deepEqual(after.tally, before.tally, 'drafted content changed an outcome’s coverage state');
});
