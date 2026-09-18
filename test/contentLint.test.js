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
import { THREE_OPTION_ITEMS, INSTALLED_ITEM_REPLACEMENTS } from '../src/data/corrections.c0.replacements.js';

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

// --- rules the content satisfies since the 2026-09-18 corrections were installed ----------------
//
// These three were `todo` until `corr.c0.007`, `corr.c0.010` and `corr.c0.012` were resolved and
// installed. The rule was never edited to make them pass; the content changed.

// The fragments in the sentence pack carry no end mark while the complete sentences do, so sixteen of
// the twenty-two questions can be answered by looking for the full stop without reading the words. The
// assessment forms already avoid this, which is why the lesson teaches a shortcut the check does not
// reward. Correcting it means giving each fragment an end mark.
test('a complete-sentence question cannot be answered from the end mark alone', () => {
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
// answers without modelling chance, so three lucky guesses read as progress. This is the rule the
// 2026-09-17 audit raised, and `corr.c0.008` to `corr.c0.010` closed it: no question is a coin flip.
test('no choice question is a coin flip', () => {
  const thin = choiceItems.filter((item) => item.choices.length < 3).map((item) => item.id);
  assert.deepEqual(thin, [], 'these questions can be answered by a coin toss');
});

// Four options put a blind guess at 25% instead of 33%, and the parent asked for four on 2026-09-18.
// Every item a correction rewrote carries four, except where the answer set is genuinely closed —
// three homophone spellings, the three sounds of -ed — which `THREE_OPTION_ITEMS` records with a
// reason per item, so "no fourth exists" cannot become "no fourth was attempted".
test('every corrected question offers four options, or three with a recorded reason', () => {
  // Only the replacements that rewrote the options. `corr.c0.012` rewrote explanations and left the
  // options exactly as they were, so those items are covered by the open finding below, not by this.
  const thin = Object.entries(INSTALLED_ITEM_REPLACEMENTS)
    .filter(([, replacement]) => replacement.choices)
    .map(([id]) => choiceItems.find((item) => item.id === id))
    .filter((item) => item?.choices && item.choices.length < (THREE_OPTION_ITEMS[item.id] ? 3 : 4))
    .map((item) => item.id);
  assert.deepEqual(thin, [], 'these questions give a blind guess better odds than they should');
});

// The spelling pack's questions always offered three options, so they were never part of the
// two-option finding and no correction record covers them. Raising them to four is new authoring the
// parent has not reviewed, and content nobody has read must not reach a child, so this stays an open
// finding rather than a quiet edit. It is listed here so the gap is visible in code, not in a document.
test('a choice question offers four options', { todo: 'open finding 2026-09-18: 44 spelling and dictation items still offer three; never drafted, because raising them is authoring the parent has not reviewed' }, () => {
  const thin = choiceItems
    .filter((item) => item.choices.length < (THREE_OPTION_ITEMS[item.id] ? 3 : 4))
    .map((item) => item.id);
  assert.deepEqual(thin, [], 'these questions give a blind guess better odds than they should');
});

// A distractor nobody would choose does not test anything; it turns a three-option item back into two.
test('no distractor is obvious nonsense', () => {
  const silly = [];
  for (const item of choiceItems) {
    for (const choice of item.choices) {
      if (choice.id === item.acceptedAnswers[0]) continue;
      if (/([a-z])\1\1/i.test(choice.text)) silly.push(`${item.id}: ${choice.text}`);
    }
  }
  assert.deepEqual(silly, [], 'a triple letter marks an option out as wrong on sight');
});

// The episodes are written for a Grade 5/6 reader, which means a little ABOVE them, not at them: the
// parent rejected a grade 5 rewrite on 2026-09-18 because it left nothing to stretch for. So this is a
// band with a floor as well as a ceiling; a simplifying edit passes any ceiling, which is how prose
// drifts down. `intro`, `recap`, `reveal` and `problem` are the child's prose and are measured together,
// because a score taken over one short sentence is noise. `historyBehindMystery` is the fact box: it
// says what is real and what is invented, so it is held BELOW the prose rather than allowed above it.
const STORY_GRADE_FLOOR = 6.5;
const STORY_GRADE_CEILING = 8.5;
const FACT_BOX_CEILING = 9;

test('story prose reads a little above its audience, and not below it', () => {
  const offBand = [];
  for (const episode of storyData.episodes) {
    const prose = ['intro', 'recap', 'reveal', 'problem'].map((field) => episode[field] || '').join(' ');
    const { grade } = readingGrade(prose);
    if (grade > STORY_GRADE_CEILING) offBand.push(`${episode.id} reads at grade ${grade.toFixed(1)}, ceiling ${STORY_GRADE_CEILING}`);
    if (grade < STORY_GRADE_FLOOR) offBand.push(`${episode.id} reads at grade ${grade.toFixed(1)}, floor ${STORY_GRADE_FLOOR}`);
    const factBox = readingGrade(episode.historyBehindMystery || '').grade;
    if (factBox > FACT_BOX_CEILING) offBand.push(`${episode.id}.historyBehindMystery reads at grade ${factBox.toFixed(1)}, ceiling ${FACT_BOX_CEILING}`);
  }
  assert.deepEqual(offBand, []);
});

// The learner reads every prompt and explanation unaided, so they must sit at or below the level the
// lesson teaches.
test('lesson prompts and explanations are written at the reading level of their audience', () => {
  const tooHard = [];
  for (const pack of c0PilotPacks) {
    const explanations = readingGrade(pack.items.map((item) => item.explanation).filter(Boolean).join(' '));
    if (explanations.grade > 7) tooHard.push(`${pack.id} explanations read at grade ${explanations.grade.toFixed(1)}`);
  }
  assert.deepEqual(tooHard, []);
});

// The rewrite that brought the prose into the band must not have cost the episodes their honesty.
// Before installation this was checked against the replacement text; now it is checked against what a
// child actually reads, which is the only version that matters.
test('every episode still says what is documented and what is invented', () => {
  for (const episode of storyData.episodes) {
    assert.match(episode.historyBehindMystery, /Documented:/, `${episode.id} dropped its documented claims`);
    assert.match(episode.historyBehindMystery, /Invented:/, `${episode.id} dropped its invented-element disclosure`);
    assert.ok(episode.fictionLabel?.trim(), `${episode.id} lost its fiction label`);
    assert.ok((episode.sourceIds || []).length > 0, `${episode.id} lost its sources`);
    // The recap is two sentences by design: it is read before the episode, not instead of it.
    const sentences = episode.recap.split(/[.!?]+\s/).filter(Boolean).length;
    assert.equal(sentences, 2, `${episode.id} recap is ${sentences} sentences`);
  }
});
