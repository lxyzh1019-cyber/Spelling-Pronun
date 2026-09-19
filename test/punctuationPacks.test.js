// The punctuation packs, and what they were built to unblock.
//
// `story.ledger.json` recorded chapter 2's second episode and both of chapter 4's as blocked on
// punctuation content that did not exist: the skills were declared in `skills.json` with nothing
// behind them. These four packs are that content. The tests hold the things that would make them
// wrong rather than merely unfinished.
import test from 'node:test';
import assert from 'node:assert/strict';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import k6 from '../src/data/curriculum.k6.json' with { type: 'json' };
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { allLessonCatalog, lessonBySessionId, sessionIdForPack } from '../src/data/lessonCatalog.js';

const items = punctuationPacks.flatMap((pack) => pack.items);

test('the four skills chapter 2 and chapter 4 were blocked on now have content', () => {
  assert.deepEqual(
    punctuationPacks.map((pack) => pack.skillId).sort(),
    ['PU.apostrophes', 'PU.clause-commas', 'PU.dialogue', 'PU.list-commas'],
  );
  for (const pack of punctuationPacks) {
    assert.equal(pack.items.length, 24, `${pack.id} is not a full pack`);
    assert.equal(pack.batch, 'P1');
    assert.ok(pack.rule.length > 40, `${pack.id} has no rule worth teaching`);
    assert.ok(pack.items[0].helpSteps.length >= 3, `${pack.id} has no help to give`);
  }
  assert.equal(items.length, 96);
});

// A question with a repeated choice cannot be got wrong; one whose answer is not among its choices
// cannot be got right. Both have shipped in this repository before.
test('every question is answerable, with one answer among four distinct choices', () => {
  const ids = new Set();
  for (const item of items) {
    assert.ok(!ids.has(item.id), `${item.id} appears twice`);
    ids.add(item.id);
    if (item.role === 'worked_example') {
      assert.equal(item.acceptedAnswers, undefined, `${item.id} is a worked example that can be answered`);
      continue;
    }
    assert.equal(item.choices.length, 4, `${item.id} does not offer four choices`);
    assert.equal(new Set(item.choices.map((choice) => choice.text)).size, 4, `${item.id} repeats a choice`);
    assert.ok(item.choices.some((choice) => choice.id === item.acceptedAnswers[0]), `${item.id}'s answer is not one of its choices`);
  }
});

// An explanation that says "the first option is wrong" teaches nothing and breaks the moment the
// choices are shuffled. This has been a real finding in this repository twice.
test('no explanation names an answer by its position', () => {
  for (const item of items) {
    assert.ok(item.explanation.length > 30, `${item.id} has no real explanation`);
    assert.doesNotMatch(item.explanation, /\b(first|second|third|fourth|last)\s+(option|choice|answer)\b/i, `${item.id} names an answer by position`);
    assert.doesNotMatch(item.explanation, /\boption [abcd]\b/i, `${item.id} names an answer by letter`);
  }
});

// A pack says where its content sits ONE way. These name the general Grade 5/6 outcome — applying
// punctuation in writing — and leave the specific grade to the ladder, which places all four below
// Grade 5. Claiming both would put the skill in two places at once.
test('each pack names a real Alberta outcome and leaves the grade to the ladder', () => {
  const outcomes = new Set();
  for (const idea of k6.organizingIdeas) {
    for (const grade of Object.values(idea.grades)) {
      for (const outcome of grade.skillsAndProcedures) outcomes.add(outcome.id);
    }
  }
  for (const pack of punctuationPacks) {
    assert.ok(pack.curriculumOutcomeIds.length, `${pack.id} names no outcome`);
    for (const id of pack.curriculumOutcomeIds) {
      assert.ok(outcomes.has(id), `${pack.id} cites ${id}, which is not an Alberta outcome`);
      assert.match(id, /grade[56]/, `${pack.id} cites ${id}, which is not a Grade 5/6 outcome`);
    }
    assert.equal(pack.albertaPlacement, undefined, `${pack.id} states a grade the ladder already holds`);
    // And the ladder does hold it, below Grade 5, which is the whole reason these are worth building.
    const rung = ladder.skills.find((skill) => skill.skillId === pack.skillId);
    assert.ok(rung, `${pack.skillId} is not on the ladder`);
    assert.equal(rung.endsBeforeGrade5, true, `${pack.skillId} is not below-grade after all`);
  }
});

// Nothing here may reach a child. These are draft, nobody has read them, and the approval gate is
// what keeps them at /parent only.
test('no punctuation pack is reachable by a learner', () => {
  for (const pack of punctuationPacks) {
    const sessionId = sessionIdForPack(pack);
    assert.ok(allLessonCatalog[sessionId], `${pack.id} is not in the catalog at all`);
    assert.equal(lessonBySessionId(sessionId), null, `${pack.id} is draft but a learner can open it`);
    for (const item of pack.items) assert.equal(item.releaseStatus, 'not_released');
  }
});

// The point of the comma packs, and the thing that separates a child who can punctuate from one who
// has memorised a placement. Several questions ask what the sentence MEANS with the mark and without.
test('the packs ask about meaning, not only about placement', () => {
  const meaning = items.filter((item) => (item.curriculumOutcomeIds || []).some((id) => /grade[56]\.03$/.test(id)));
  assert.ok(meaning.length >= 6, `only ${meaning.length} questions ask what the punctuation does to the meaning`);
  // "Let us eat, Grandma" is the case that makes it unarguable: the comma decides who is the meal.
  assert.ok(items.some((item) => /Grandma/.test(item.prompt)), 'the clearest example of a comma changing meaning is missing');
});
