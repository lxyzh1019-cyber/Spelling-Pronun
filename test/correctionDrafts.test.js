// The drafted replacements from the 2026-09-17 audit are content the parent has not approved yet, so
// nothing here is installed. What these tests prove is that each draft actually closes the finding it
// claims to close, and changes nothing it should not: the parent is reading a proposal that has
// already been checked, not a promise.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as drafts from '../src/data/corrections.c0.draft.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import storyData from '../src/data/story.c0.draft.json' with { type: 'json' };
import { readingGrade } from '../src/learning/readability.js';

const liveItems = new Map([...c0PilotPacks.flatMap((pack) => pack.items), ...c0AssessmentForms.flatMap((form) => form.items)].map((item) => [item.id, item]));
const choiceDrafts = {
  ...drafts.sentenceReplacements,
  ...drafts.punctuationReplacements,
  ...drafts.pronounReplacements,
  ...drafts.spellingReplacements,
  ...drafts.assessmentSentenceReplacements,
  ...drafts.assessmentDecodingReplacements,
  ...drafts.assessmentListeningReplacements,
};
const textOf = (choices, id) => choices.find(([choiceId]) => choiceId === id)?.[1];

test('every draft replaces an item that really exists', () => {
  for (const id of [...Object.keys(choiceDrafts), ...Object.keys(drafts.explanationReplacements)]) {
    assert.ok(liveItems.has(id), `${id} is not an item in the packs or the forms`);
  }
  for (const id of Object.keys(drafts.storyReplacements)) {
    assert.ok(storyData.episodes.some((episode) => episode.id === id), `${id} is not an episode`);
  }
});

// Finding A3. This is the rule the live content fails; the drafts must pass it.
test('every drafted question offers at least three usable options', () => {
  for (const [id, draft] of Object.entries(choiceDrafts)) {
    assert.ok(draft.choices.length >= 3, `${id} still offers ${draft.choices.length} options`);
    const ids = draft.choices.map(([choiceId]) => choiceId);
    assert.equal(new Set(ids).size, ids.length, `${id} repeats a choice id`);
    const texts = draft.choices.map(([, text]) => text.trim());
    assert.equal(new Set(texts).size, texts.length, `${id} offers the same option twice`);
    assert.ok(texts.every(Boolean), `${id} has an empty option`);
    assert.ok(ids.includes(draft.answer), `${id} keys an option it does not offer`);
  }
});

// The key must not move. A replacement that quietly changes which answer is right would turn a
// readability or coverage fix into a different question, and any progress already recorded against
// the item would be measuring something else.
test('no draft changes which answer is correct', () => {
  for (const [id, draft] of Object.entries(choiceDrafts)) {
    const live = liveItems.get(id);
    if (!live?.choices) continue;
    const liveAnswer = live.choices.find((choice) => choice.id === live.acceptedAnswers[0])?.text;
    // The retargeted listening items are a deliberate replacement of the question itself, so their
    // answer text is new by design; every other draft must keep the same correct wording.
    if (drafts.assessmentListeningReplacements[id]) continue;
    assert.equal(textOf(draft.choices, draft.answer), liveAnswer, `${id} moved the correct answer`);
  }
});

// Finding A2. The fragments in the sentence pack carried no end mark while the sentences did, so the
// full stop marked the answer out. After the draft, every option ends the same way.
test('no drafted complete-sentence question can be answered from the end mark', () => {
  const ends = (text) => /[.!?]$/.test(text.trim());
  for (const [id, draft] of Object.entries(drafts.sentenceReplacements)) {
    const correct = textOf(draft.choices, draft.answer);
    const wrong = draft.choices.filter(([choiceId]) => choiceId !== draft.answer).map(([, text]) => text);
    assert.ok(!(ends(correct) && wrong.every((text) => !ends(text))), `${id} still marks the answer out with its end mark`);
  }
});

test('no drafted distractor is nonsense on sight', () => {
  for (const [id, draft] of Object.entries(choiceDrafts)) {
    for (const [choiceId, text] of draft.choices) {
      if (choiceId === draft.answer) continue;
      assert.ok(!/([a-z])\1\1/i.test(text), `${id} offers ${text}, which a triple letter rules out on sight`);
    }
  }
});

// Finding B1, story. The ceilings are the ones `test/contentLint.test.js` applies to the live text.
test('the drafted story reads at the level of its audience', () => {
  for (const [id, draft] of Object.entries(drafts.storyReplacements)) {
    for (const [field, ceiling] of [['intro', 7.5], ['recap', 7.5], ['reveal', 7.5], ['problem', 7.5], ['historyBehindMystery', 9]]) {
      const { grade } = readingGrade(draft[field]);
      assert.ok(grade <= ceiling, `${id}.${field} reads at grade ${grade.toFixed(1)}, ceiling ${ceiling}`);
    }
    const introWords = draft.intro.trim().split(/\s+/).length;
    assert.ok(introWords >= 60 && introWords <= 100, `${id} intro is ${introWords} words, outside the plan's 60 to 100`);
  }
});

// The rewrite must not quietly drop the honesty the episodes carry: what is documented, what was
// invented, and the fiction label. Losing those would turn a readability fix into a truthfulness one.
test('the drafted story keeps every disclosure the original made', () => {
  for (const [id, draft] of Object.entries(drafts.storyReplacements)) {
    assert.match(draft.historyBehindMystery, /Documented:/, `${id} dropped its documented claims`);
    assert.match(draft.historyBehindMystery, /Invented:/, `${id} dropped its invented-element disclosure`);
    const live = storyData.episodes.find((episode) => episode.id === id);
    for (const source of ['National Archives', 'British Library']) {
      if (live.historyBehindMystery.includes(source)) assert.ok(draft.historyBehindMystery.includes(source), `${id} dropped the ${source} attribution`);
    }
  }
});

test('the drafted story speaks to the child rather than about them', () => {
  for (const [id, draft] of Object.entries(drafts.storyReplacements)) {
    assert.ok(!/\bthe learner\b/i.test(`${draft.intro} ${draft.recap} ${draft.reveal}`), `${id} still refers to the child in the third person`);
  }
});

// Finding B1, explanations.
test('the drafted explanations bring every pack under the grade it teaches', () => {
  for (const pack of c0PilotPacks) {
    const text = pack.items.map((item) => drafts.explanationReplacements[item.id] || item.explanation).filter(Boolean).join(' ');
    const { grade } = readingGrade(text);
    assert.ok(grade <= 7, `${pack.id} explanations still read at grade ${grade.toFixed(1)}`);
  }
});

test('a rewritten explanation still explains itself', () => {
  for (const [id, text] of Object.entries(drafts.explanationReplacements)) {
    assert.ok(text.trim().length >= 35, `${id} was shortened into nothing`);
  }
});

// The retargeted listening items exist because both children are native English speakers, for whom
// ship/sheep measures nothing. Each replacement still needs audio, so it must carry the text to speak.
test('each retargeted listening item says what should be spoken', () => {
  for (const [id, draft] of Object.entries(drafts.assessmentListeningReplacements)) {
    assert.ok(draft.spokenText?.trim(), `${id} has no spoken text`);
    assert.ok(draft.prompt?.trim(), `${id} has no prompt`);
    assert.ok(liveItems.get(id).part === 'A', `${id} is not a Part A prompt, so replacing its audio is not free`);
  }
});
