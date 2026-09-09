import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCorrections, isQuarantined, openCorrections, quarantinedItemIds, usableItems, validateCorrections } from '../src/learning/contentCorrections.js';
import correctionData from '../src/data/corrections.c0.json' with { type: 'json' };
import { c0PilotItems, c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';

test('every recorded correction targets a real item and its replacement is installed', () => {
  const items = [...c0PilotItems, ...c0AssessmentItems];
  const validation = validateCorrections({ corrections: correctionData.corrections, items });
  assert.deepEqual(validation.errors, []);
  assert.equal(openCorrections(correctionData.corrections).length, 0, 'the parent resolved all six on 2026-09-09');
  assert.ok(correctionData.corrections.every((correction) => correction.proposedBy === 'claude' && correction.reviewedBy === 'parent'));
  // Every resolved correction actually moved its items to the recorded replacement version.
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const correction of correctionData.corrections) {
    for (const itemId of correction.itemIds) assert.equal(byId.get(itemId).version, correction.toVersion, `${itemId} carries the replacement version`);
  }
  assert.deepEqual([...new Set(correctionData.corrections.map((correction) => correction.auditFinding))].sort(), ['1a', '1b', '2a', '2b']);
});

test('resolving a correction never restores the defective version on its own', () => {
  const stale = { id: 'c1', itemIds: ['x'], reason: 'r', proposedBy: 'claude', reviewer: 'codex', raisedAt: '2026-09-08', toVersion: 2, reviewStatus: 'reviewed', reviewedBy: 'parent' };
  const notInstalled = validateCorrections({ corrections: [stale], items: [{ id: 'x', version: 1 }] });
  assert.ok(notInstalled.errors.some((error) => error.includes('replacement is not installed')));
  // The item stays withheld even though the record says reviewed.
  const stamped = applyCorrections([{ id: 'x', version: 1 }], [stale]);
  assert.equal(stamped[0].correctionStatus, 'correction_not_installed');
  assert.ok(isQuarantined(stamped[0]));
  assert.deepEqual(usableItems(stamped), []);
  // Installing the replacement is what releases it.
  const installed = applyCorrections([{ id: 'x', version: 2 }], [stale]);
  assert.ok(!isQuarantined(installed[0]));
  assert.deepEqual(validateCorrections({ corrections: [stale], items: [{ id: 'x', version: 2 }] }).errors, []);
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

test('the corrected versions are the ones served, and inventory is unchanged', () => {
  assert.equal(quarantinedItemIds(correctionData.corrections).size, 0);
  for (const pack of c0PilotPacks) assert.equal(pack.items.length, 24);
  assert.equal(c0AssessmentItems.length, 68);
  const servedLessonItems = Object.values(c0LessonCatalog).flatMap((lesson) => [...lesson.examples, ...lesson.practice, ...lesson.transfer]);
  assert.ok(servedLessonItems.every((item) => !isQuarantined(item)));
  // The two corrected teaching items are served again, at version 2, with the corrected wording.
  const sign = servedLessonItems.find((item) => item.id === 'c0.pu.capitals-endmarks.19');
  assert.ok(sign, 'the sign transfer task is restored to the lesson');
  assert.equal(sign.version, 2);
  assert.match(sign.explanation, /fragment, not a complete sentence/);
  const watch = c0PilotItems.find((item) => item.id === 'c0.sp.patterns.06');
  assert.equal(watch.version, 2);
  assert.match(watch.explanation, /sounds like the vowel in wash/);
  assert.doesNotMatch(watch.explanation, /short a sound/);
});

test('the installed decoding items ask which recording matches the spelling', () => {
  const receptive = c0AssessmentItems.filter((item) => item.category === 'receptive_decoding');
  assert.equal(receptive.length, 4, 'two per form');
  for (const item of receptive) {
    assert.equal(item.version, 2);
    assert.equal(item.responseType, 'audio_choice');
    assert.equal(item.evaluator, 'choice', 'machine-scored by recording id');
    assert.ok(item.printedWord, 'the learner sees the written word');
    assert.doesNotMatch(item.prompt, /pronounced/i, 'the prompt never supplies the pronunciation');
    assert.equal(item.acceptedAnswers.length, 1);
    assert.equal(item.choices.length, 3);
    assert.ok(item.choices.every((choice) => choice.spokenText));
    // The visible label is a bare recording number, so no choice leaks the answer on screen.
    assert.deepEqual(item.choices.map((choice) => choice.text), ['Recording 1', 'Recording 2', 'Recording 3']);
    assert.equal(item.reportedAs, 'recognizing a plausible pronunciation from spelling');
    assert.ok(item.targetPronunciation, 'the intended reading is named for the listening check');
    assert.equal(item.optionalPractice.evaluator, 'self_comparison');
    assert.match(item.optionalPractice.scoring, /Never scored/);
    // Still preview audio, so it cannot be pilot-approved yet.
    assert.equal(item.audioStatus, 'synthetic_preview');
  }
  // The correct recording is not always in the same position.
  assert.ok(new Set(receptive.map((item) => item.acceptedAnswers[0])).size > 1);
  for (const correction of correctionData.corrections.filter((entry) => entry.redesign)) {
    assert.equal(correction.redesign, 'receptive_audio_choice_plus_optional_read_aloud');
    assert.match(correction.coverageNote, /not measured/);
    assert.ok(correction.supersededProposal, 'the proposal the parent replaced is recorded');
    assert.ok(correction.pilotBlocker, 'the outstanding listening check is recorded');
  }
});

test('each editing prompt states its intended meaning and carries a four-target key', () => {
  const editing = c0AssessmentItems.filter((item) => item.category === 'editing');
  assert.equal(editing.length, 2);
  for (const item of editing) {
    assert.equal(item.version, 2);
    assert.equal(item.rubric.answerKey.length, 4, 'exactly the four targets the prompt asks for');
    assert.ok(item.rubric.intendedMeaning.length > 0);
    assert.ok(item.rubric.modelAnswer.length > 0, 'the self check can show one answer that fits');
    assert.ok(item.rubric.notAccepted.length > 0, 'the ambiguous alternative is named and explained');
    assert.match(item.prompt, /Edit this sentence so it says/, 'the intended meaning is in the prompt the learner reads');
  }
  const formA = editing.find((item) => item.id === 'c0.assessment.a.33');
  assert.match(formA.rubric.notAccepted, /are to were/, 'the tense ambiguity the audit raised is resolved explicitly');
  assert.equal(formA.rubric.modelAnswer, 'Mia checks the two labels because they are different.');
});

test('helpers withhold quarantined items and leave everything else untouched', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const corrections = [{ id: 'c', itemIds: ['b'], reviewStatus: 'changes_required' }];
  const stamped = applyCorrections(items, corrections);
  assert.equal(stamped[0].correctionStatus, undefined);
  assert.equal(stamped[1].correctionStatus, 'changes_required');
  assert.deepEqual(usableItems(stamped).map(({ id }) => id), ['a']);
  const resolved = applyCorrections(items, [{ ...corrections[0], reviewStatus: 'reviewed', reviewedBy: 'codex' }]);
  assert.ok(resolved.every((item) => !isQuarantined(item)), 'a resolved correction with no version change releases the item again');
});
