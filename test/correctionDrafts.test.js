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
import { validateContent } from '../src/learning/contentValidator.js';
import skillData from '../src/data/skills.json' with { type: 'json' };

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

// Finding A3. This is the rule the live content fails; the drafts must pass it. The parent asked on
// 2026-09-18 for four options rather than three wherever the content supports it, so four is the
// contract and three is the documented exception: an item may offer three only if THREE_OPTION_ITEMS
// says why, which keeps "we could not find a fourth" from quietly becoming "we did not try".
test('every drafted question offers four usable options, or says why it cannot', () => {
  for (const [id, draft] of Object.entries(choiceDrafts)) {
    const excused = drafts.THREE_OPTION_ITEMS[id];
    if (excused) {
      assert.equal(draft.choices.length, 3, `${id} is excused from four options but offers ${draft.choices.length}`);
      assert.ok(excused.trim().length >= 40, `${id} is excused from four options without a real reason`);
    } else {
      assert.equal(draft.choices.length, 4, `${id} offers ${draft.choices.length} options and is not in THREE_OPTION_ITEMS`);
    }
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

// Finding B1, story. A first rewrite took the episodes to grade 5 and the parent rejected it on
// 2026-09-18: a Grade 5/6 reader given grade 5 prose has nothing to stretch for. So this is a band,
// not a ceiling. The floor is the half of the contract that is easy to lose, because every later
// edit that simplifies a sentence passes a ceiling. Whole-episode prose is measured together: a
// readability score over one nine-word sentence is noise, and `problem` is one sentence.
const STORY_GRADE_FLOOR = 6.5;
const STORY_GRADE_CEILING = 8.5;
const FACT_BOX_CEILING = 9;
const STORY_PROSE_FIELDS = ['intro', 'recap', 'reveal', 'problem'];

test('the drafted story reads a little above its audience, and not below it', () => {
  for (const [id, draft] of Object.entries(drafts.storyReplacements)) {
    const prose = STORY_PROSE_FIELDS.map((field) => draft[field]).join(' ');
    const { grade } = readingGrade(prose);
    assert.ok(
      grade >= STORY_GRADE_FLOOR,
      `${id} reads at grade ${grade.toFixed(1)}, below the floor of ${STORY_GRADE_FLOOR}: too easy to be worth reading`,
    );
    assert.ok(
      grade <= STORY_GRADE_CEILING,
      `${id} reads at grade ${grade.toFixed(1)}, above the ceiling of ${STORY_GRADE_CEILING}`,
    );
    // The fact box says what is real and what is invented, so it has to be understood rather than
    // admired. It is held below the prose on purpose.
    const factBox = readingGrade(draft.historyBehindMystery).grade;
    assert.ok(
      factBox <= FACT_BOX_CEILING,
      `${id}.historyBehindMystery reads at grade ${factBox.toFixed(1)}, ceiling ${FACT_BOX_CEILING}`,
    );
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

// Installing a correction is never only an edit: every review record and the pilot approval pin a
// version, so a change can invalidate them. The story correction is the sharp case, because an episode
// carries its own version rather than an item version. A draft has to say what installing it costs, so
// the parent is agreeing to the whole consequence rather than to the words alone.
test('every drafted correction says what installing it requires', async () => {
  const { default: correctionData } = await import('../src/data/corrections.c0.json', { with: { type: 'json' } });
  const drafted = correctionData.corrections.filter((correction) => correction.reviewStatus === 'changes_required');
  assert.ok(drafted.length > 0);
  for (const correction of drafted) {
    assert.ok(correction.requiresOnInstall?.trim(), `${correction.id} does not say what installing it requires`);
  }
  const story = drafted.find((correction) => correction.id === 'corr.c0.013');
  assert.match(story.requiresOnInstall, /pilot approval/i, 'the story draft does not mention that its approval goes stale');
});

// A correction that changes what an item speaks, or what its spoken options are, can break the parent's
// listening check even when the item itself is fine. The homophone replacements are exactly that case:
// the Test Lab pairs a listening item with one distractor so the parent can hear the difference, and
// `their` against `there` has no difference to hear. Such a correction has to say so out loud.
test('a correction that changes spoken content declares what it needs from the Test Lab', async () => {
  const { default: correctionData } = await import('../src/data/corrections.c0.json', { with: { type: 'json' } });
  const spokenIds = new Set(Object.keys(drafts.assessmentListeningReplacements));
  const touching = correctionData.corrections.filter((correction) => (correction.itemIds || []).some((id) => spokenIds.has(id)));
  assert.ok(touching.length > 0, 'no correction covers the retargeted listening items');
  for (const correction of touching) {
    assert.ok(correction.requiresTestLabChange?.trim(), `${correction.id} changes spoken content without saying what the Test Lab needs`);
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

// Installing a draft is a content edit, and a content edit that does not validate breaks the app for a
// child rather than for a test. This builds the items as they would exist after every draft is
// installed and runs the real validator over them, so a fourth option that repeats an id, an answer key
// that names an option nobody offers, or an empty choice is caught while the draft is still a proposal.
test('installing every draft would leave the content structurally valid', () => {
  const corrected = [...liveItems.values()].map((item) => {
    const draft = choiceDrafts[item.id];
    if (!draft) return item;
    return {
      ...item,
      choices: draft.choices.map(([id, text]) => ({ id, text })),
      acceptedAnswers: [draft.answer],
      ...(draft.prompt ? { prompt: draft.prompt } : {}),
    };
  });
  const { valid, errors } = validateContent({ skills: skillData.skills, items: corrected });
  assert.deepEqual(errors, [], 'installing the drafts would produce invalid content');
  assert.equal(valid, true);
});
