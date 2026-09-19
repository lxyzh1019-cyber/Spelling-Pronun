// The grammar packs, and what separates a useful agreement question from a useless one.
//
// Ten of the eleven declared grammar skills had no content at all. These are the first three, chosen
// because Alberta states agreement and tense at every grade from 2 to 6 — so a Grade 5 or 6 child is
// squarely at grade on both — and noun-pronoun agreement first appears at Grade 5.
//
// The thing worth testing here is not that the questions exist. It is that they ask the cases where
// a child who "knows" the rule still gets it wrong: a phrase between the subject and the verb, a
// subject after the verb, `each`/`neither`, a singular noun that ends in s. "The dog ___ loudly"
// tests nothing, because the ear answers it.
import test from 'node:test';
import assert from 'node:assert/strict';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import k6 from '../src/data/curriculum.k6.json' with { type: 'json' };
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { allLessonCatalog, lessonBySessionId, sessionIdForPack } from '../src/data/lessonCatalog.js';

const items = grammarPacks.flatMap((pack) => pack.items);
const answered = items.filter((item) => item.role !== 'worked_example');

test('the six grammar skills built so far all have full packs', () => {
  assert.deepEqual(
    grammarPacks.map((pack) => pack.skillId).sort(),
    ['GR.agreement', 'GR.antecedents', 'GR.articles-plurals', 'GR.possessives', 'GR.pronoun-types', 'GR.tense'],
  );
  for (const pack of grammarPacks) {
    assert.equal(pack.items.length, 24, `${pack.id} is not a full pack`);
    assert.equal(pack.batch, 'G1');
    assert.ok(pack.rule.length > 60, `${pack.id} has no rule worth teaching`);
    assert.ok(pack.items[0].helpSteps.length >= 4, `${pack.id} has too little help to give`);
  }
  assert.equal(items.length, grammarPacks.length * 24);
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
    assert.ok(item.explanation.length > 30, `${item.id} has no real explanation`);
    assert.doesNotMatch(item.explanation, /\b(first|second|third|fourth|last)\s+(option|choice|answer)\b/i, `${item.id} names an answer by position`);
    assert.doesNotMatch(item.explanation, /\boption [abcd]\b/i, `${item.id} names an answer by letter`);
  }
});

// The whole point of the agreement pack. If every question were "The dog ___ loudly", it would
// measure nothing a Grade 5 child does not already do by ear.
test('the agreement pack asks the cases where the ear gets it wrong', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.agreement');
  const prompts = pack.items.map((item) => item.prompt).join(' ');
  // A plural noun sitting between the subject and the verb.
  assert.match(prompts, /bag of apples|list of names|box of tools|pile of books|sound of the waves|bunch of grapes/i);
  // Each / neither / both / everyone — words whose number is not what it looks like.
  assert.match(prompts, /Each of the/i);
  assert.match(prompts, /Neither of the/i);
  // The subject after the verb.
  assert.match(prompts, /There ___|Here ___/);
  // A singular noun that ends in s.
  assert.match(prompts, /Mathematics/i);
  // And the pack explains WHY the trap works, not only that it does. A child reads the choices and
  // the explanation, so both count as where it can say so.
  const readable = (item) => `${item.prompt} ${(item.choices || []).map((choice) => choice.text).join(' ')} ${item.explanation}`;
  assert.ok(
    pack.items.some((item) => /the ear matches the verb to whatever it heard last/i.test(readable(item))),
    'the pack never explains why the nearest noun misleads',
  );
  assert.ok(pack.items.some((item) => /the eye check what the ear skipped/i.test(readable(item))));
});

test('the tense pack is about consistency and irregular forms, not lone verbs', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.tense');
  const shifts = pack.items.filter((item) => /shift|steady|tense/i.test(item.prompt) || /shift/i.test(item.explanation));
  assert.ok(shifts.length >= 5, `only ${shifts.length} questions are about tense consistency`);
  const irregular = pack.items.filter((item) => /brought|caught|taught|blew|read|seen/i.test(item.prompt + item.explanation));
  assert.ok(irregular.length >= 5, `only ${irregular.length} questions involve an irregular form`);
  // A shift is not always an error, and the pack says so rather than teaching a false absolute.
  assert.ok(pack.items.some((item) => /when the meaning genuinely moves in time/i.test((item.choices || []).map((choice) => choice.text).join(' '))));
});

// Ambiguity is the hard half of pronoun reference, and it cannot be fixed by choosing a different
// pronoun — the noun has to go back in. A pack that only tested number would miss the whole point.
test('the pronoun pack teaches ambiguity, not only number', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.antecedents');
  const ambiguous = pack.items.filter((item) => /unclear|either|ambiguity|clearest|which person|stand for/i.test(item.prompt + JSON.stringify(item.choices || '')));
  assert.ok(ambiguous.length >= 5, `only ${ambiguous.length} questions are about unclear reference`);
  // The fix is rewording, and at least one question says so outright.
  assert.ok(pack.items.some((item) => /name whichever|the noun goes back in|naming|quoting/i.test(item.explanation)));
  // Singular they is handled as the live question it is, not asserted as a rule either way.
  const singularThey = pack.items.find((item) => /Somebody left/i.test(item.prompt));
  assert.ok(singularThey, 'the unspecified-person case is missing');
  assert.equal(singularThey.acceptedAnswers[0], singularThey.choices.find((choice) => choice.text === 'their').id);
});

// Same rules as every other batch: real outcomes, none of them not_measurable, and a ladder rung so
// a tile can state the grade.
test('each pack cites real Grade 5/6 outcomes and sits on the ladder', () => {
  const outcomes = new Map();
  for (const idea of k6.organizingIdeas) {
    for (const grade of Object.values(idea.grades)) {
      for (const outcome of grade.skillsAndProcedures) outcomes.set(outcome.id, outcome);
    }
  }
  for (const pack of grammarPacks) {
    assert.ok(pack.curriculumOutcomeIds.length, `${pack.id} names no outcome`);
    for (const id of pack.curriculumOutcomeIds) {
      assert.ok(outcomes.has(id), `${pack.id} cites ${id}, which is not an Alberta outcome`);
      assert.match(id, /grade[56]/, `${pack.id} cites ${id}, which is not a Grade 5/6 outcome`);
    }
    const rung = ladder.skills.find((skill) => skill.skillId === pack.skillId);
    assert.ok(rung, `${pack.skillId} is not on the ladder`);
  }
  // Three of the five are at grade and two are below it, and that difference is the reason the
  // ladder exists: a child meeting possessives or plural forms in Grade 5 is revisiting Grade 4
  // work, and the tile will say so once the mapping is verified.
  const atGrade = grammarPacks.filter((pack) => !ladder.skills.find((skill) => skill.skillId === pack.skillId).endsBeforeGrade5);
  const revisiting = grammarPacks.filter((pack) => ladder.skills.find((skill) => skill.skillId === pack.skillId).endsBeforeGrade5);
  assert.deepEqual(atGrade.map((pack) => pack.skillId).sort(), ['GR.agreement', 'GR.antecedents', 'GR.pronoun-types', 'GR.tense']);
  assert.deepEqual(revisiting.map((pack) => pack.skillId).sort(), ['GR.articles-plurals', 'GR.possessives']);
});

// The plural pack's real lesson, and the one a rule-only pack would get wrong: the f-to-v pattern is
// not reliable. A rule that is right most of the time is more dangerous than no rule, because it is
// applied confidently to the exceptions.
test('the plural pack teaches that its own pattern has exceptions', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.articles-plurals');
  const prompts = pack.items.map((item) => item.prompt).join(' ');
  assert.match(prompts, /leaf|knife|shelf|half/i, 'no f-to-v word is asked');
  assert.match(prompts, /roof/i, 'the f word that does NOT change is never asked, so the pattern reads as reliable');
  // Both halves of the y rule, not just the one people remember.
  assert.match(prompts, /baby|story/i);
  assert.match(prompts, /\bday\b|\bkey\b/i, 'the vowel-before-y case is missing');
  assert.ok(pack.items.some((item) => /right most of the time is more dangerous/i.test(item.explanation)));
});

// The possessive pack's hard case is the one where the apostrophe does not mean ownership.
test('the possessive pack separates the apostrophe from the possessive pronoun', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.possessives');
  const readable = pack.items.map((item) => `${item.prompt} ${(item.choices || []).map((choice) => choice.text).join(' ')} ${item.explanation}`).join(' ');
  assert.match(readable, /it\u2019s|it is/i);
  assert.match(readable, /who\u2019s|whose/i);
  assert.ok(pack.items.some((item) => /read it back as "it is"/i.test(item.explanation)), 'the test that works every time is never given');
  // And it says WHY possessive pronouns take no apostrophe, rather than asserting it.
  assert.ok(pack.items.some((item) => /already possessive on its own/i.test((item.choices || []).map((choice) => choice.text).join(' '))));
});

test('no grammar pack is reachable by a learner', () => {
  for (const pack of grammarPacks) {
    const sessionId = sessionIdForPack(pack);
    assert.ok(allLessonCatalog[sessionId], `${pack.id} is not in the catalog at all`);
    assert.equal(lessonBySessionId(sessionId), null, `${pack.id} is draft but a learner can open it`);
    for (const item of pack.items) assert.equal(item.releaseStatus, 'not_released');
  }
  assert.ok(answered.length > 0);
});

// One pack for the five pronoun types, and the reason it is one rather than five.
//
// Alberta states a single outcome for all of them — "Distinguish between different types of pronouns
// used in a sentence" — which names the class and lists no types. Five packs would have shared one
// citation, which is the disagreement already recorded in `disputedByLadder`. Parent decision on
// 2026-09-19: build one now, split later if the children's own answers ask for it. The five
// type-specific skills stay declared and empty rather than being deleted, so the split stays open.
test('the pronoun-types pack covers all five kinds, and the five skills stay open', () => {
  const pack = grammarPacks.find((entry) => entry.skillId === 'GR.pronoun-types');
  assert.ok(pack, 'the pronoun-types pack is missing');
  const readable = pack.items.map((item) => `${item.prompt} ${(item.choices || []).map((choice) => choice.text).join(' ')} ${item.explanation}`).join(' ');
  // All five kinds are actually taught, not just named in the rule.
  assert.match(readable, /myself|herself|himself|itself|themselves/i, 'reflexive pronouns are not asked');
  assert.match(readable, /\bwhich\b|\bthat\b/i, 'relative pronouns are not asked');
  assert.match(readable, /\bwho\b|\bwhom\b|\bwhat\b/i, 'interrogative pronouns are not asked');
  assert.match(readable, /\bthis\b|\bthose\b|\bthese\b/i, 'demonstrative pronouns are not asked');
  assert.match(readable, /anyone|everything|several|nothing/i, 'indefinite pronouns are not asked');
  // The hard part: the same word does different jobs, so the sentence decides, not the spelling.
  assert.ok(pack.items.some((item) => /the same word can do different jobs/i.test(readable)));
  assert.ok(pack.items.some((item) => /asks in one sentence and joins in another/i.test((item.choices || []).map((choice) => choice.text).join(' '))));
  // The five stay declared with no pack of their own, which is what keeps the split available.
  const built = new Set(grammarPacks.map((entry) => entry.skillId));
  for (const skillId of ['GR.reflexives', 'GR.relative', 'GR.interrogative', 'GR.demonstrative', 'GR.indefinite']) {
    assert.ok(ladder.skills.some((skill) => skill.skillId === skillId), `${skillId} left the ladder`);
    assert.ok(!built.has(skillId), `${skillId} was given its own pack without the split being decided`);
  }
});
