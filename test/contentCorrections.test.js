import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCorrections, isQuarantined, openCorrections, quarantinedItemIds, usableItems, validateCorrections } from '../src/learning/contentCorrections.js';
import correctionData from '../src/data/corrections.c0.json' with { type: 'json' };
import { c0PilotItems, c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';

test('every recorded correction targets a real item and is still awaiting its reviewer', () => {
  const validation = validateCorrections({ corrections: correctionData.corrections, items: [...c0PilotItems, ...c0AssessmentItems] });
  assert.deepEqual(validation.errors, []);
  assert.equal(openCorrections(correctionData.corrections).length, correctionData.corrections.length, 'no correction has been resolved yet');
  assert.ok(correctionData.corrections.every((correction) => correction.proposedBy === 'claude' && correction.reviewer === 'codex'));
  // The two audit findings about teaching content and the two about the assessment are all covered.
  assert.deepEqual([...new Set(correctionData.corrections.map((correction) => correction.auditFinding))].sort(), ['1a', '1b', '2a', '2b']);
});

test('a correction can never be marked reviewed by the role that proposed it', () => {
  const base = { id: 'c1', itemIds: ['x'], reason: 'r', proposedBy: 'claude', reviewer: 'codex', raisedAt: '2026-09-08' };
  const selfReviewed = validateCorrections({ corrections: [{ ...base, reviewStatus: 'reviewed', reviewedBy: 'claude' }] });
  assert.ok(selfReviewed.errors.some((error) => error.includes('cannot be reviewed by the role that proposed it')));
  const anonymous = validateCorrections({ corrections: [{ ...base, reviewStatus: 'reviewed' }] });
  assert.ok(anonymous.errors.some((error) => error.includes('without recording who reviewed it')));
  const accepted = validateCorrections({ corrections: [{ ...base, reviewStatus: 'reviewed', reviewedBy: 'codex' }] });
  assert.deepEqual(accepted.errors, []);
  const unknown = validateCorrections({ corrections: [{ ...base, reviewStatus: 'changes_required' }], items: [{ id: 'other' }] });
  assert.ok(unknown.errors.some((error) => error.includes('unknown item x')));
});

test('quarantined items stay in the authored content but are never served', () => {
  const quarantined = quarantinedItemIds(correctionData.corrections);
  assert.ok(quarantined.has('c0.pu.capitals-endmarks.19'), 'the sign item with the wrong explanation is withheld');
  assert.ok(quarantined.has('c0.sp.patterns.06'), 'the watch item with the wrong vowel description is withheld');
  assert.ok(quarantined.has('c0.assessment.a.11') && quarantined.has('c0.assessment.a.12'), 'both invented-word prompts are withheld');
  assert.ok(quarantined.has('c0.assessment.a.33') && quarantined.has('c0.assessment.b.33'), 'both editing prompts are withheld');

  // Authored inventory is unchanged: quarantine withholds, it does not delete.
  for (const pack of c0PilotPacks) assert.equal(pack.items.length, 24);
  assert.equal(c0AssessmentItems.length, 68);
  const servedLessonItems = Object.values(c0LessonCatalog).flatMap((lesson) => [...lesson.examples, ...lesson.practice, ...lesson.transfer]);
  assert.ok(servedLessonItems.every((item) => !isQuarantined(item)));
  assert.ok(servedLessonItems.every((item) => !quarantined.has(item.id)));
});

test('the decoding redesign is proposed in full and reports that decoding is not measured', () => {
  const decoding = correctionData.corrections.filter((correction) => correction.redesign === 'print_only_segmentation_plus_self_comparison');
  assert.equal(decoding.length, 2, 'both forms are covered');
  for (const correction of decoding) {
    const parts = correction.proposedItems.map((entry) => entry.part);
    assert.ok(parts.includes('print_only_segmentation'), 'a machine-scored item read from the spelling alone');
    assert.ok(parts.includes('read_aloud_self_comparison'), 'a recorded reading the learner compares with the model');
    for (const proposed of correction.proposedItems) {
      assert.doesNotMatch(proposed.prompt, /pronounced [A-Z]/, 'the prompt no longer supplies the pronunciation');
      if (proposed.part === 'read_aloud_self_comparison') {
        assert.match(proposed.scoring, /never scored/, 'no rater is available, so the recording is never scored');
        assert.equal(proposed.modelAudio.audioStatus, 'synthetic_preview');
      } else {
        assert.match(proposed.reportedAs, /Independent decoding is not measured/);
      }
    }
    assert.match(correction.coverageNote, /remains unmeasured/);
  }
});

test('each editing prompt gains an explicit intended meaning and a four-target key', () => {
  const editing = correctionData.corrections.filter((correction) => correction.answerKey);
  assert.equal(editing.length, 2);
  for (const correction of editing) {
    assert.equal(correction.answerKey.length, 4, 'exactly the four targets the prompt asks for');
    assert.ok(correction.intendedMeaning.length > 0);
    assert.ok(correction.notAccepted.length > 0, 'the ambiguous alternative is named and explained');
  }
  const formA = editing.find((correction) => correction.itemIds.includes('c0.assessment.a.33'));
  assert.match(formA.notAccepted, /are to were/, 'the tense ambiguity the audit raised is resolved explicitly');
});

test('helpers withhold quarantined items and leave everything else untouched', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const corrections = [{ id: 'c', itemIds: ['b'], reviewStatus: 'changes_required' }];
  const stamped = applyCorrections(items, corrections);
  assert.equal(stamped[0].correctionStatus, undefined);
  assert.equal(stamped[1].correctionStatus, 'changes_required');
  assert.deepEqual(usableItems(stamped).map(({ id }) => id), ['a']);
  const resolved = applyCorrections(items, [{ ...corrections[0], reviewStatus: 'reviewed', reviewedBy: 'codex' }]);
  assert.ok(resolved.every((item) => !isQuarantined(item)), 'a resolved correction releases the item again');
});
