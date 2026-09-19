// The sentence and editing packs, and the ledger mechanism they were built to move.
//
// These four were the last content blockers the story ledger named: SE.fragments and SE.runons for
// chapter 4, ED.locate and ED.repair for chapter 6. All four were declared in skills.json with
// nothing behind them.
import test from 'node:test';
import assert from 'node:assert/strict';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import k6 from '../src/data/curriculum.k6.json' with { type: 'json' };
import ledger from '../src/data/story.ledger.json' with { type: 'json' };
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { allLessonCatalog, lessonBySessionId, sessionIdForPack } from '../src/data/lessonCatalog.js';

const items = sentencePacks.flatMap((pack) => pack.items);

test('the skills chapters 4 and 6 were blocked on now have content', () => {
  assert.deepEqual(
    sentencePacks.map((pack) => pack.skillId).sort(),
    ['ED.locate', 'ED.repair', 'SE.fragments', 'SE.runons'],
  );
  for (const pack of sentencePacks) {
    assert.equal(pack.items.length, 24, `${pack.id} is not a full pack`);
    assert.equal(pack.batch, 'S1');
    assert.ok(pack.items[0].helpSteps.length >= 4, `${pack.id} has too little help to give`);
  }
  assert.equal(items.length, 96);
});

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

test('no explanation names an answer by its position', () => {
  for (const item of items) {
    assert.ok(item.explanation.length > 30, `${item.id} has no real explanation`);
    assert.doesNotMatch(item.explanation, /\b(first|second|third|fourth|last)\s+(option|choice|answer)\b/i, `${item.id} names an answer by position`);
    assert.doesNotMatch(item.explanation, /\boption [abcd]\b/i, `${item.id} names an answer by letter`);
  }
});

// Alberta never uses the words "fragment" or "run-on". What it states is the outcome that makes each
// one visible, and a pack that cited an outcome using the label would be citing one that does not
// exist. Every id here is resolved against the curriculum.
test('each pack cites a real Alberta outcome, and none invents the label Alberta avoids', () => {
  const outcomes = new Map();
  for (const idea of k6.organizingIdeas) {
    for (const grade of Object.values(idea.grades)) {
      for (const outcome of grade.skillsAndProcedures) outcomes.set(outcome.id, outcome.text);
    }
  }
  for (const pack of sentencePacks) {
    assert.ok(pack.curriculumOutcomeIds.length, `${pack.id} names no outcome`);
    for (const id of pack.curriculumOutcomeIds) {
      assert.ok(outcomes.has(id), `${pack.id} cites ${id}, which is not an Alberta outcome`);
      assert.doesNotMatch(outcomes.get(id), /fragment|run-on/i, `${pack.id} cites an outcome using a label Alberta does not use`);
    }
    assert.ok(ladder.skills.some((skill) => skill.skillId === pack.skillId), `${pack.skillId} is not on the ladder`);
  }
  // And the packs say so in their own rule text rather than teaching a label the curriculum avoids.
  const fragments = sentencePacks.find((pack) => pack.skillId === 'SE.fragments');
  assert.doesNotMatch(fragments.rule, /fragment/i, 'the rule teaches a label Alberta does not use');
});

// Editing is two skills because a child who can spot a mistake and a child who can mend it are
// different children. A pack that ran them together would never tell you which one you had.
test('locating and repairing are kept apart', () => {
  const locate = sentencePacks.find((pack) => pack.skillId === 'ED.locate');
  const repair = sentencePacks.find((pack) => pack.skillId === 'ED.repair');
  // Finding asks what and where; mending asks which change.
  assert.ok(locate.items.filter((item) => /what kind of mistake|how many mistakes|which word is misspelled/i.test(item.prompt)).length >= 6);
  assert.ok(repair.items.filter((item) => /which repair|repair this|smallest/i.test(item.prompt)).length >= 6);
  // And repair teaches the thing that makes a repair safe: it can break something else.
  assert.ok(repair.items.some((item) => /read the whole sentence again|meaning/i.test(item.explanation)));
  assert.ok(repair.rule.includes('meaning'), 'the repair rule does not mention keeping the meaning');
});

test('no sentence or editing pack is reachable by a learner', () => {
  for (const pack of sentencePacks) {
    const sessionId = sessionIdForPack(pack);
    assert.ok(allLessonCatalog[sessionId], `${pack.id} is not in the catalog at all`);
    assert.equal(lessonBySessionId(sessionId), null, `${pack.id} is draft but a learner can open it`);
    for (const item of pack.items) assert.equal(item.releaseStatus, 'not_released');
  }
});

// The ledger's blockers were prose, so a chapter stayed "blocked on PU.list-commas" after
// PU.list-commas was built. They are derived now, and this is what holds that: a blocker may name
// only skills that genuinely have no content.
test('a chapter is blocked only by skills that really have no content', () => {
  const built = new Set(Object.values(allLessonCatalog).map((lesson) => lesson.skillId));
  for (const chapter of ledger.chapters) {
    if (!chapter.blockedBy) continue;
    const named = [...chapter.blockedBy.matchAll(/\b([A-Z]{2}\.[a-z-]+)\b/g)].map((match) => match[1]);
    if (/Still without content/.test(chapter.blockedBy)) {
      for (const skillId of named) assert.ok(!built.has(skillId), `chapter ${chapter.chapter} claims ${skillId} has no content, but it does`);
    } else {
      // The other wording says the chapter is ready, so every skill it names must exist.
      assert.match(chapter.blockedBy, /Ready to write/);
      for (const skillId of named) assert.ok(built.has(skillId), `chapter ${chapter.chapter} is called ready but ${skillId} has no content`);
    }
  }
  // Today: all three unwritten chapters have their content. What is left is writing the episodes.
  assert.equal(ledger.writtenEpisodes, 7);
  assert.equal(ledger.chapters.filter((chapter) => /Ready to write/.test(chapter.blockedBy || '')).length, 3);
});
