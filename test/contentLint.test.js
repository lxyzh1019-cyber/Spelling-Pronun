// Content lint: the authoring rules the 2026-09-17 audit found nothing was checking.
//
// These run against the REAL packs, forms and episodes, not fixtures. Rules the current content does
// not yet satisfy are marked `todo` and name their defect: a todo test reports without failing the
// suite, so the gap stays visible in code instead of living only in a document. Correcting the content
// means deleting the `todo` marker, not editing the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import storyData from '../src/data/story.c0.draft.json' with { type: 'json' };
import { validateContent } from '../src/learning/contentValidator.js';
import skillData from '../src/data/skills.json' with { type: 'json' };
import { readingGrade } from '../src/learning/readability.js';

const packItems = c0PilotPacks.flatMap((pack) => pack.items);
const formItems = c0AssessmentForms.flatMap((form) => form.items);
const choiceItems = [...packItems, ...formItems].filter((item) => item.choices && item.evaluator === 'choice');
const textOf = (item, id) => item.choices.find((choice) => choice.id === id)?.text ?? '';

// --- rules the content already satisfies -------------------------------------------------------

test('the validator rejects a key that names an option the item does not offer', () => {
  const base = { id: 'x.1', version: 1, primarySkill: 'SP.patterns', secondarySkills: [], role: 'independent', difficulty: 1, prerequisites: [], prompt: 'p', responseType: 'choice', evaluator: 'choice', explanation: 'e', helpSteps: ['h'], commonErrors: [], evidenceEligibility: 'independent_choice', transferGroup: 't', authorStatus: 'draft', reviewStatus: 'draft', integrationStatus: 'not_integrated', releaseStatus: 'not_released', sourceIds: [] };
  const run = (overrides) => validateContent({ skills: skillData.skills, items: [{ ...base, ...overrides }] }).errors.join(' | ');
  assert.match(run({ choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], acceptedAnswers: ['c'] }), /not one of its choices/);
  assert.match(run({ choices: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }], acceptedAnswers: ['a'] }), /repeats a choice id/);
  assert.match(run({ choices: [{ id: 'a', text: 'Same' }, { id: 'b', text: ' Same ' }], acceptedAnswers: ['a'] }), /same choice text twice/);
  assert.match(run({ choices: [{ id: 'a', text: 'A' }, { id: 'b', text: '' }], acceptedAnswers: ['a'] }), /choice with no text/);
  assert.match(run({ choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], acceptedAnswers: ['a', 'b'] }), /more than one choice correct/);
  // Case is content in a capitals item, so two options that differ only in case are not duplicates.
  assert.doesNotMatch(run({ choices: [{ id: 'a', text: 'I asked Mateo.' }, { id: 'b', text: 'I asked mateo.' }], acceptedAnswers: ['a'] }), /same choice text twice/);
});

test('every real choice item is answerable from its own options', () => {
  for (const item of choiceItems) {
    const ids = item.choices.map((choice) => choice.id);
    assert.equal(item.acceptedAnswers.length, 1, `${item.id} does not have exactly one key`);
    assert.ok(ids.includes(item.acceptedAnswers[0]), `${item.id} keys an option it does not offer`);
  }
});

test('every item explains itself', () => {
  for (const item of [...packItems, ...formItems]) {
    if (item.role === 'worked_example') continue;
    assert.ok(String(item.explanation || '').trim().length >= 35, `${item.id} has no real explanation`);
  }
});

// Options are shuffled per sitting, so an explanation that names the answer by where it sat — "the
// second choice", "choice b" — tells the child something false. Twelve explanations did exactly that
// and were rewritten to name the answer by its words. A worked example is exempt: it compares two
// things quoted in its own prompt and offers no choices at all.
test('no explanation points at an answer by its position', () => {
  const positional = /\b(first|second|third|fourth)\s+(choice|option|line|group|version|sentence)\b|\bchoice [abc]\b/i;
  const offenders = [...packItems, ...formItems]
    .filter((item) => item.role !== 'worked_example' && positional.test(item.explanation || ''))
    .map((item) => `${item.id}: ${item.explanation}`);
  assert.deepEqual(offenders, [], 'options are shuffled, so a position is not a stable way to name the answer');
});

// --- rules the content does not yet satisfy ----------------------------------------------------

// The fragments in the sentence pack carry no end mark while the complete sentences do, so sixteen of
// the twenty-two questions can be answered by looking for the full stop without reading the words. The
// assessment forms already avoid this, which is why the lesson teaches a shortcut the check does not
// reward. Correcting it means giving each fragment an end mark.
test('a complete-sentence question cannot be answered from the end mark alone', { todo: 'audit 2026-09-17 finding A2: 16 of 22 items in c0.pack.se.complete; drafted in corr.c0.007' }, () => {
  const ends = (text) => /[.!?]$/.test(String(text).trim());
  const cued = [];
  for (const item of choiceItems.filter((entry) => entry.primarySkill === 'SE.complete')) {
    const correct = textOf(item, item.acceptedAnswers[0]);
    const wrong = item.choices.filter((choice) => choice.id !== item.acceptedAnswers[0]).map((choice) => choice.text);
    if (ends(correct) && wrong.every((text) => !ends(text))) cued.push(item.id);
  }
  assert.deepEqual(cued, [], 'the answer is the only option with an end mark');
});

// A two-option question is a coin flip, and `deriveMastery` reaches `developing` after three correct
// answers without modelling chance, so three lucky guesses read as progress.
test('a choice question offers at least three options', { todo: 'audit 2026-09-17 finding A3: 46 of 82 pack items and 36 of 40 form items; drafted in corr.c0.008 and corr.c0.009' }, () => {
  const thin = choiceItems.filter((item) => item.choices.length < 3).map((item) => item.id);
  assert.deepEqual(thin, [], 'these questions can be answered by a coin toss');
});

// A distractor nobody would choose does not test anything; it turns a three-option item back into two.
test('no distractor is obvious nonsense', { todo: 'audit 2026-09-17 finding A3: c0.sp.patterns.03 offers runnning; drafted in corr.c0.010' }, () => {
  const silly = [];
  for (const item of choiceItems) {
    for (const choice of item.choices) {
      if (choice.id === item.acceptedAnswers[0]) continue;
      if (/([a-z])\1\1/i.test(choice.text)) silly.push(`${item.id}: ${choice.text}`);
    }
  }
  assert.deepEqual(silly, [], 'a triple letter marks an option out as wrong on sight');
});

// The episodes are written for a Grade 5/6 reader. `intro`, `recap` and `reveal` are read by the child;
// `historyBehindMystery` is the fact box and may be denser, but not by this much.
test('story prose is written at the reading level of its audience', { todo: 'audit 2026-09-17 finding B1: intros and reveals score 8.7-10.0, history notes 12.4-14.1; drafted in corr.c0.013' }, () => {
  const tooHard = [];
  for (const episode of storyData.episodes) {
    for (const [field, ceiling] of [['intro', 7.5], ['recap', 7.5], ['reveal', 7.5], ['problem', 7.5], ['historyBehindMystery', 9]]) {
      const { grade } = readingGrade(episode[field] || '');
      if (grade > ceiling) tooHard.push(`${episode.id}.${field} reads at grade ${grade.toFixed(1)}, ceiling ${ceiling}`);
    }
  }
  assert.deepEqual(tooHard, []);
});

// The learner reads every prompt and explanation unaided, so they must sit at or below the level the
// lesson teaches.
test('lesson prompts and explanations are written at the reading level of their audience', { todo: 'audit 2026-09-17 finding B1: spelling pack reads at grade 8.2, punctuation at 7.2; drafted in corr.c0.012' }, () => {
  const tooHard = [];
  for (const pack of c0PilotPacks) {
    const explanations = readingGrade(pack.items.map((item) => item.explanation).filter(Boolean).join(' '));
    if (explanations.grade > 7) tooHard.push(`${pack.id} explanations read at grade ${explanations.grade.toFixed(1)}`);
  }
  assert.deepEqual(tooHard, []);
});
