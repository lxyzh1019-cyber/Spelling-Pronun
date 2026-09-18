// The foundation packs: phonics (自然拼读) and word stress.
//
// These exist because the parent asked for them on 2026-09-18 after being told Alberta ends Phonics
// after Grade 4 and has no pronunciation strand at any grade. A parent's judgement about their own
// children outranks a grade label as a reason to teach something. What it does not do is change what
// the content may CLAIM, and that is what these tests hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationItems, foundationPacks } from '../src/data/packs.foundation.draft.js';
import { validateContent } from '../src/learning/contentValidator.js';
import skillData from '../src/data/skills.json' with { type: 'json' };
import mapping from '../src/data/curriculum.alberta.elal.json' with { type: 'json' };
import { readingGrade } from '../src/learning/readability.js';

test('the foundation packs are structurally valid with every role filled', () => {
  assert.deepEqual(validateContent({ skills: skillData.skills, items: foundationItems }).errors, []);
  for (const pack of foundationPacks) {
    assert.equal(pack.items.length, 24, `${pack.id} does not hold 24 objects`);
    const roles = {};
    for (const item of pack.items) roles[item.role] = (roles[item.role] || 0) + 1;
    assert.deepEqual(roles, { worked_example: 2, guided: 6, independent: 10, transfer: 2, delayed_review: 4 });
    assert.ok(skillData.skills.some((skill) => skill.id === pack.skillId), `${pack.id} names unknown skill ${pack.skillId}`);
  }
});

// The claim rule. These packs measure no Grade 5/6 outcome, and the data says so rather than a comment.
test('no foundation pack claims a Grade 5 or Grade 6 outcome', () => {
  const outcomeIds = new Set(mapping.organizingIdeas.flatMap((idea) =>
    Object.values(idea.grades).flatMap((grade) => grade.skillsAndProcedures.map((outcome) => outcome.id))));
  for (const pack of foundationPacks) {
    assert.deepEqual(pack.curriculumOutcomeIds, [], `${pack.id} claims a Grade 5/6 outcome`);
    assert.ok(pack.albertaPlacement?.albertaGrades, `${pack.id} does not say where Alberta puts it`);
    assert.match(pack.albertaPlacement.albertaGrades, /Grade 4|Grade 3|Kindergarten/, `${pack.id} places itself at Grade 5/6`);
    assert.ok(pack.albertaPlacement.note.length > 60, `${pack.id} does not say why it exists anyway`);
    for (const item of pack.items) {
      assert.deepEqual(item.curriculumOutcomeIds, [], `${item.id} claims a Grade 5/6 outcome`);
      assert.ok(!outcomeIds.has(item.id));
    }
  }
  // And the mapping still says these organizing ideas stop before Grade 5, which is the fact the
  // packs are honest about rather than the fact they contradict.
  const stopped = mapping.organizingIdeasNotInGrade56.map((entry) => entry.name);
  assert.ok(stopped.includes('Phonics'));
});

// Print-based on purpose: a question answered by listening needs reviewed human audio, which is the
// gate the assessment's Part A prompts have been stuck behind since 2026-09-08. A phonics pack that
// needed recordings would join them instead of being usable.
test('every foundation question can be answered by looking, not listening', () => {
  for (const item of foundationItems) {
    assert.notEqual(item.responseType, 'audio_choice', `${item.id} needs audio`);
    assert.equal(item.spokenText, undefined, `${item.id} depends on spoken text`);
    assert.equal(item.audioRef, undefined, `${item.id} depends on an audio asset`);
    assert.equal(item.audioStatus, undefined, `${item.id} carries an audio status`);
    for (const choice of item.choices || []) {
      assert.equal(choice.spokenText, undefined, `${item.id} has a spoken option`);
    }
  }
});

test('nothing in the foundation batch claims a status it has not earned', () => {
  for (const pack of foundationPacks) {
    assert.equal(pack.status, 'draft_needs_independent_challenge');
    for (const item of pack.items) {
      assert.equal(item.authorStatus, 'draft');
      assert.equal(item.reviewStatus, 'needs_independent_challenge');
      assert.equal(item.integrationStatus, 'not_integrated');
      assert.equal(item.releaseStatus, 'not_released');
      assert.equal(item.pilotStatus, undefined);
    }
  }
});

// The C0 audit's findings, carried forward here exactly as they were to C1.
test('the foundation questions follow the authoring rules the audit produced', () => {
  const positional = /\b(first|second|third|fourth)\s+(choice|option|version|group)\b|\bchoice [abcd]\b/i;
  for (const item of foundationItems.filter((entry) => entry.evaluator === 'choice')) {
    assert.equal(item.choices.length, 4, `${item.id} offers ${item.choices.length} options`);
    assert.equal(new Set(item.choices.map((choice) => choice.id)).size, 4, `${item.id} repeats a choice id`);
    assert.equal(new Set(item.choices.map((choice) => choice.text.trim())).size, 4, `${item.id} repeats an option`);
    assert.equal(item.acceptedAnswers.length, 1, `${item.id} does not have exactly one key`);
    assert.ok(item.choices.some((choice) => choice.id === item.acceptedAnswers[0]), `${item.id} keys an option it does not offer`);
    assert.ok(!positional.test(item.explanation || ''), `${item.id} names the answer by its position`);
    assert.ok(String(item.explanation || '').trim().length >= 35, `${item.id} has no real explanation`);
  }
  for (const pack of foundationPacks) {
    const keys = pack.items.filter((item) => item.acceptedAnswers).map((item) => item.acceptedAnswers[0]);
    const tally = {};
    for (const key of keys) tally[key] = (tally[key] || 0) + 1;
    for (const [position, count] of Object.entries(tally)) {
      assert.ok(count <= keys.length / 2, `${pack.id} puts ${count} of ${keys.length} answers at ${position}`);
    }
    for (let i = 3; i < keys.length; i += 1) {
      assert.ok(new Set(keys.slice(i - 3, i + 1)).size > 1, `${pack.id} answers the same position four times in a row`);
    }
    const { grade } = readingGrade(pack.items.map((item) => item.explanation).filter(Boolean).join(' '));
    assert.ok(grade <= 7, `${pack.id} explanations read at grade ${grade.toFixed(1)}`);
  }
});
