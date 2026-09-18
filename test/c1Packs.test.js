// The C1 packs: the first content written from the Alberta curriculum mapping.
//
// C0 reached its current state by having an audit find eight things wrong with it. This file holds C1
// to those findings from the first commit, so the same faults cannot be authored in again: patterned
// keys, two-option questions, distractors nobody would pick, explanations that name the answer by its
// position, prose above the grade it teaches, and items no learner can reach.
//
// It also holds the lifecycle. These packs are `draft`. Nothing here may claim to be reviewed,
// integrated or approved, and a test is the only thing that makes that stick when a later session
// wants the content to count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { c1Items, c1Packs } from '../src/data/packs.c1.draft.js';
import { validateContent } from '../src/learning/contentValidator.js';
import skillData from '../src/data/skills.json' with { type: 'json' };
import mapping from '../src/data/curriculum.alberta.elal.json' with { type: 'json' };
import { readingGrade } from '../src/learning/readability.js';

const choiceItems = c1Items.filter((item) => item.evaluator === 'choice');
const outcomeIds = new Set(mapping.organizingIdeas.flatMap((idea) =>
  Object.values(idea.grades).flatMap((grade) => grade.skillsAndProcedures.map((outcome) => outcome.id))));

test('the packs are structurally valid and every role is filled', () => {
  const validation = validateContent({ skills: skillData.skills, items: c1Items });
  assert.deepEqual(validation.errors, []);
  assert.ok(c1Packs.length > 0);
  for (const pack of c1Packs) {
    assert.equal(pack.items.length, 24, `${pack.id} does not hold 24 objects`);
    const roles = {};
    for (const item of pack.items) roles[item.role] = (roles[item.role] || 0) + 1;
    assert.deepEqual(roles, { worked_example: 2, guided: 6, independent: 10, transfer: 2, delayed_review: 4 }, `${pack.id} has the wrong role mix`);
    assert.ok(skillData.skills.some((skill) => skill.id === pack.skillId), `${pack.id} names unknown skill ${pack.skillId}`);
    assert.ok(pack.rule.length > 60, `${pack.id} does not state its rule`);
    assert.equal(pack.helpSteps?.length ?? pack.items[0].helpSteps.length, 3, `${pack.id} does not offer three help steps`);
  }
  assert.equal(new Set(c1Items.map((item) => item.id)).size, c1Items.length, 'an item id is used twice');
});

// The lifecycle. Draft content has not been challenged, reviewed, integrated or approved, and saying
// otherwise is how unreviewed content reaches a child.
test('nothing in C1 claims a status it has not earned', () => {
  for (const pack of c1Packs) {
    assert.equal(pack.status, 'draft_needs_independent_challenge', `${pack.id} claims a status it has not earned`);
    for (const item of pack.items) {
      assert.equal(item.authorStatus, 'draft', `${item.id} claims to be authored and reviewed`);
      assert.equal(item.reviewStatus, 'needs_independent_challenge', `${item.id} claims a review that has not happened`);
      assert.equal(item.integrationStatus, 'not_integrated', `${item.id} claims to be integrated`);
      assert.equal(item.releaseStatus, 'not_released', `${item.id} claims to be released`);
      assert.equal(item.pilotStatus, undefined, `${item.id} claims a pilot approval nobody recorded`);
    }
  }
});

// Every item says which Alberta outcome it was written for, and the id has to resolve. Without this a
// pack drifts from the statement it was built for and the coverage report quietly starts lying.
test('every item names a real Alberta outcome', () => {
  for (const pack of c1Packs) {
    assert.ok(pack.curriculumOutcomeIds.length > 0, `${pack.id} names no outcome`);
    for (const id of pack.curriculumOutcomeIds) assert.ok(outcomeIds.has(id), `${pack.id} names unknown outcome ${id}`);
  }
  for (const item of c1Items) {
    assert.ok(item.curriculumOutcomeIds.length > 0, `${item.id} names no outcome`);
    for (const id of item.curriculumOutcomeIds) assert.ok(outcomeIds.has(id), `${item.id} names unknown outcome ${id}`);
  }
});

// Finding A3, carried forward. Four options, and no closed answer set here to excuse three.
test('every question offers four options and exactly one key', () => {
  for (const item of choiceItems) {
    assert.equal(item.choices.length, 4, `${item.id} offers ${item.choices.length} options`);
    const ids = item.choices.map((choice) => choice.id);
    assert.equal(new Set(ids).size, 4, `${item.id} repeats a choice id`);
    const texts = item.choices.map((choice) => choice.text.trim());
    assert.equal(new Set(texts).size, 4, `${item.id} offers the same option twice`);
    assert.ok(texts.every(Boolean), `${item.id} has an empty option`);
    assert.equal(item.acceptedAnswers.length, 1, `${item.id} does not have exactly one key`);
    assert.ok(ids.includes(item.acceptedAnswers[0]), `${item.id} keys an option it does not offer`);
    // Nonsense on sight turns four options back into two.
    for (const choice of item.choices) {
      if (choice.id === item.acceptedAnswers[0]) continue;
      assert.ok(!/([a-z])\1\1/i.test(choice.text), `${item.id} offers ${choice.text}, which a triple letter rules out on sight`);
    }
  }
});

// DEF-38, carried forward. The authored keys must not be patterned. Options are shuffled at runtime,
// so this is belt and braces — but the C0 spelling pack cycled b, a, c for twenty-four items, and
// nobody noticed until someone counted.
test('the authored answer keys are not patterned', () => {
  for (const pack of c1Packs) {
    const keys = pack.items.filter((item) => item.acceptedAnswers).map((item) => item.acceptedAnswers[0]);
    const tally = {};
    for (const key of keys) tally[key] = (tally[key] || 0) + 1;
    // No single position may hold more than half the answers in a pack.
    for (const [position, count] of Object.entries(tally)) {
      assert.ok(count <= keys.length / 2, `${pack.id} puts ${count} of ${keys.length} answers at ${position}`);
    }
    // And no run of four identical positions, which is what a cycle looks like from the inside.
    for (let i = 3; i < keys.length; i += 1) {
      const run = keys.slice(i - 3, i + 1);
      assert.ok(new Set(run).size > 1, `${pack.id} answers ${run.join(', ')} in a row`);
    }
  }
});

// DEF-43, carried forward. Options shuffle, so an explanation that points at a position tells the
// child something false. A worked example is exempt: it quotes two things in its own prompt and
// offers no choices at all, so "the first sentence" refers to the prompt rather than to an option.
test('no explanation points at an answer by its position', () => {
  const positional = /\b(first|second|third|fourth)\s+(choice|option|version|group)\b|\bchoice [abcd]\b/i;
  const offenders = c1Items
    .filter((item) => item.role !== 'worked_example' && positional.test(item.explanation || ''))
    .map((item) => `${item.id}: ${item.explanation}`);
  assert.deepEqual(offenders, [], 'options are shuffled, so a position is not a stable way to name the answer');
});

// Finding B1, carried forward. The learner reads every prompt and explanation unaided, so they sit at
// or below the level the lesson teaches. A vocabulary item quotes a hard word on purpose — that is the
// question — so the ceiling is applied to the explanations, which are the teaching.
test('the explanations sit at or below the grade they teach', () => {
  for (const pack of c1Packs) {
    const { grade } = readingGrade(pack.items.map((item) => item.explanation).filter(Boolean).join(' '));
    assert.ok(grade <= 7, `${pack.id} explanations read at grade ${grade.toFixed(1)}`);
    for (const item of c1Items) {
      if (item.role === 'worked_example') continue;
      assert.ok(String(item.explanation || '').trim().length >= 35, `${item.id} has no real explanation`);
    }
  }
});

// DEF-40, carried forward. Ten of every C0 pack's twenty-four objects were unreachable because the
// lesson sliced six and nothing consumed the guided items at all. Every item here has a role that a
// lesson actually serves, and the transfer items must be genuinely different from the practice.
test('every authored item has a role a lesson can serve', () => {
  const served = new Set(['worked_example', 'guided', 'independent', 'transfer', 'delayed_review']);
  for (const item of c1Items) assert.ok(served.has(item.role), `${item.id} has role ${item.role}, which no lesson serves`);
  for (const pack of c1Packs) {
    const transfer = pack.items.filter((item) => item.role === 'transfer');
    const practice = pack.items.filter((item) => item.role === 'independent');
    for (const item of transfer) {
      assert.ok(
        !practice.some((entry) => entry.transferGroup === item.transferGroup),
        `${item.id} repeats a practice transfer group, so it is not a transfer`,
      );
    }
  }
});
