// The F2 packs: the four below-grade gaps the diagnostic located with no pack behind them.
//
// They follow the F1 phonics packs: below-grade practice that claims no Grade 5/6 outcome, answered
// by looking rather than listening, and draft until the parent's lifecycle says otherwise. What is
// new here is the placement: each one QUOTES the Alberta statements it was judged against and the
// pages they were read from, and states the grade range the ladder derives, rather than asserting a
// grade in prose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { foundation2Items, foundation2Packs } from '../src/data/packs.foundation2.draft.js';
import { validateContent } from '../src/learning/contentValidator.js';
import { draftPacksFor } from '../src/learning/draftInventory.js';
import { allLessonCatalog, lessonBySessionId, sessionIdForPack } from '../src/data/lessonCatalog.js';
import skillData from '../src/data/skills.json' with { type: 'json' };
import k6 from '../src/data/curriculum.k6.json' with { type: 'json' };
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import { diagnosticItems } from '../src/data/diagnostic.k4.draft.js';
import { readingGrade } from '../src/learning/readability.js';

const choiceItems = foundation2Items.filter((item) => item.evaluator === 'choice');
const textOf = (item, id) => item.choices.find((choice) => choice.id === id)?.text;

test('the four skills the diagnostic flagged with no pack now have one, each a full valid pack', () => {
  assert.deepEqual(
    foundation2Packs.map((pack) => pack.skillId).sort(),
    ['PH.blend-segment', 'PH.digraphs-clusters', 'PH.multisyllable', 'SP.inflections'],
  );
  assert.deepEqual(validateContent({ skills: skillData.skills, items: foundation2Items }).errors, []);
  for (const pack of foundation2Packs) {
    assert.equal(pack.batch, 'F2');
    assert.equal(pack.items.length, 24, `${pack.id} does not hold 24 objects`);
    // Ids are derived from the pack id and the row index, so an approval or attempt keyed by id
    // always names the same question. The integration record cites this line.
    const slug = pack.skillId.toLowerCase();
    assert.equal(pack.id, `f2.pack.${slug}`);
    assert.deepEqual(pack.items.map((item) => item.id), pack.items.map((_, i) => `f2.${slug}.${String(i + 1).padStart(2, '0')}`));
    const roles = {};
    for (const item of pack.items) roles[item.role] = (roles[item.role] || 0) + 1;
    assert.deepEqual(roles, { worked_example: 2, guided: 6, independent: 10, transfer: 2, delayed_review: 4 });
    // A lesson, not a diagnostic: it teaches a rule, gives steps, and says what goes wrong.
    assert.ok(pack.rule.length > 100, `${pack.id} has no rule worth teaching`);
    assert.ok(pack.items[0].helpSteps.length >= 4, `${pack.id} has too few help steps`);
    for (const item of pack.items) {
      assert.ok(item.commonErrors.length > 0, `${item.id} names no common error`);
      for (const error of item.commonErrors) assert.ok(error.length > 15, `${item.id} has an empty common error`);
    }
  }
});

// A placement that asserts a grade could say anything. These quote the curriculum and name where it
// was read, and the grade range is the ladder's own derivation from the outcomes.
test('each placement quotes real Alberta statements, cites their pages, and matches the ladder', () => {
  const ideas = new Map(k6.organizingIdeas.map((idea) => [idea.name, idea]));
  for (const pack of foundation2Packs) {
    const placement = pack.albertaPlacement;
    assert.ok(placement, `${pack.id} does not say where Alberta puts it`);
    assert.deepEqual(pack.curriculumOutcomeIds, [], `${pack.id} claims a Grade 5/6 outcome`);
    for (const item of pack.items) assert.deepEqual(item.curriculumOutcomeIds, [], `${item.id} claims a Grade 5/6 outcome`);

    const rung = ladder.skills.find((skill) => skill.skillId === pack.skillId);
    assert.ok(rung, `${pack.skillId} is not on the ladder`);
    assert.equal(rung.endsBeforeGrade5, true, `${pack.skillId} is not below-grade after all`);
    assert.equal(placement.albertaGrades, `${rung.introducedAt} to ${rung.consolidatedAt}`, `${pack.id} states a grade range the ladder does not derive`);
    assert.ok(placement.note.length > 60, `${pack.id} does not say why it exists anyway`);

    assert.ok(placement.matchingStatements.length >= 2, `${pack.id} quotes too little to rest a placement on`);
    for (const statement of placement.matchingStatements) {
      const idea = ideas.get(statement.organizingIdea);
      assert.ok(idea, `${pack.id} cites an organizing idea the extraction does not have`);
      const grade = Object.values(idea.grades).find((entry) => entry.grade === statement.grade);
      assert.ok(grade, `${pack.id} cites ${statement.organizingIdea} at ${statement.grade}, which Alberta does not state`);
      if (statement.part === 'Skills & Procedures') {
        const outcome = grade.skillsAndProcedures.find((entry) => entry.id === statement.id);
        assert.ok(outcome, `${pack.id} cites ${statement.id}, which is not an outcome at that grade`);
        assert.equal(statement.text, outcome.text, `${pack.id} misquotes ${statement.id}`);
      } else {
        assert.equal(statement.part, 'Knowledge');
        assert.ok(grade.knowledge.includes(statement.text), `${pack.id} quotes knowledge that is not in the extraction: ${statement.text}`);
      }
      assert.ok(statement.sourcePages.length > 0, `${pack.id} does not say which page it read "${statement.text}" from`);
      for (const page of statement.sourcePages) {
        assert.ok(Number.isInteger(page) && idea.sourcePages.includes(page), `${pack.id} cites page ${page}, which the extraction does not give ${idea.name}`);
      }
    }
  }
});

// Print only, like F1. A question that needed a recording would wait behind the same human-listening
// gate the assessment's Part A prompts have been behind since 2026-09-08.
test('every question can be answered by looking, not listening', () => {
  for (const item of foundation2Items) {
    assert.notEqual(item.responseType, 'audio_choice', `${item.id} needs audio`);
    assert.equal(item.spokenText, undefined, `${item.id} depends on spoken text`);
    assert.equal(item.audioRef, undefined, `${item.id} depends on an audio asset`);
    assert.equal(item.audioStatus, undefined, `${item.id} carries an audio status`);
    for (const choice of item.choices || []) assert.equal(choice.spokenText, undefined, `${item.id} has a spoken option`);
  }
});

test('the questions follow the authoring rules the audit produced', () => {
  const positional = /\b(first|second|third|fourth|last)\s+(choice|option|answer|version|group)\b|\b(choice|option) [abcd]\b/i;
  for (const item of choiceItems) {
    assert.equal(item.choices.length, 4, `${item.id} offers ${item.choices.length} options`);
    assert.equal(new Set(item.choices.map((choice) => choice.text.trim())).size, 4, `${item.id} repeats an option`);
    assert.equal(item.acceptedAnswers.length, 1, `${item.id} does not have exactly one key`);
    assert.ok(textOf(item, item.acceptedAnswers[0]), `${item.id} keys an option it does not offer`);
    assert.doesNotMatch(item.explanation, positional, `${item.id} names the answer by its position`);
    assert.ok(item.explanation.trim().length >= 35, `${item.id} has no real explanation`);
    for (const choice of item.choices) {
      if (choice.id !== item.acceptedAnswers[0]) assert.doesNotMatch(choice.text, /([a-z])\1\1/i, `${item.id} has a distractor wrong on sight`);
    }
  }
  for (const pack of foundation2Packs) {
    const keys = pack.items.filter((item) => item.acceptedAnswers).map((item) => item.acceptedAnswers[0]);
    const tally = {};
    for (const key of keys) tally[key] = (tally[key] || 0) + 1;
    for (const [position, count] of Object.entries(tally)) assert.ok(count <= keys.length / 2, `${pack.id} puts ${count} answers at ${position}`);
    for (let i = 3; i < keys.length; i += 1) assert.ok(new Set(keys.slice(i - 3, i + 1)).size > 1, `${pack.id} answers the same position four times in a row`);
    // A key that cycles is as guessable as one that repeats, and the balance rule above cannot see
    // it: a, c, b, d over and over is perfectly balanced.
    for (let period = 2; period <= 4; period += 1) {
      const cycles = keys.every((key, i) => i < period || key === keys[i - period]);
      assert.ok(!cycles, `${pack.id} answer key repeats every ${period} questions`);
    }
    const { grade } = readingGrade(pack.items.map((item) => item.explanation).filter(Boolean).join(' '));
    assert.ok(grade <= 7, `${pack.id} explanations read at grade ${grade.toFixed(1)}`);
  }
});

// Each pack aims at what the diagnostic actually found, not at the skill in general. The diagnostic's
// own wrong options are the evidence: the words the children chose must be taught here as what they are.
test('each pack teaches against the wrong answers the diagnostic located', () => {
  const bySkill = Object.fromEntries(foundation2Packs.map((pack) => [pack.skillId, pack.items]));
  const keyed = (skillId) => bySkill[skillId].filter((item) => item.acceptedAnswers).map((item) => ({ item, answer: textOf(item, item.acceptedAnswers[0]) }));
  const mentions = (skillId, word) => bySkill[skillId].some((item) => `${item.prompt} ${item.explanation}`.toLowerCase().includes(word));

  // Digraph or cluster: the diagnostic's distractors stop, green, wish and stamp, each explained here.
  const digraphItems = diagnosticItems.filter((item) => item.skillId === 'PH.digraphs-clusters');
  const distractors = digraphItems.flatMap((item) => item.choices.filter((choice) => choice.id !== item.acceptedAnswers[0]).map((choice) => choice.text));
  for (const word of ['stop', 'green', 'wish', 'stamp']) {
    assert.ok(distractors.includes(word), `the diagnostic no longer offers "${word}", so this check has lost its evidence`);
    assert.ok(mentions('PH.digraphs-clusters', word), `the digraph pack never explains "${word}"`);
  }
  // Drop the e against double the consonant, keyed both ways.
  const endings = keyed('SP.inflections').map(({ answer }) => answer);
  assert.ok(endings.includes('hoping') && endings.includes('hopping'), 'hoping and hopping are not both taught as answers');
  // Counting sounds, not letters: most counting questions have a different number of letters.
  const counts = bySkill['PH.blend-segment'].filter((item) => /how many sounds/i.test(item.prompt));
  assert.ok(counts.length >= 8, `only ${counts.length} questions ask for a sound count`);
  // The base word inside a long word, with the diagnostic's own example.
  assert.ok(keyed('PH.multisyllable').some(({ item, answer }) => /unhelpfully/.test(item.prompt) && answer === 'help'), 'unhelpfully → help is not asked');
});

// Opened on 2026-09-29 at the parent's direction, after two separate agents checked every question.
// The statuses are derived from those records (test/independentReview.test.js), and the pilot
// approval is what lets a learner in: pilot track only, never released.
test('the F2 packs are reviewed, approved by the parent, and reachable on the pilot track only', () => {
  assert.deepEqual(draftPacksFor([{ batch: 'F2', packs: foundation2Packs }]), [], 'an approved pack is still listed as waiting');
  for (const pack of foundation2Packs) {
    assert.equal(pack.status, 'integrated');
    const sessionId = sessionIdForPack(pack);
    assert.ok(allLessonCatalog[sessionId], `${pack.id} is not in the catalog at all`);
    assert.ok(lessonBySessionId(sessionId), `${pack.id} is approved but a learner cannot open it`);
    for (const item of pack.items) {
      assert.equal(item.authorStatus, 'reviewed');
      assert.equal(item.reviewStatus, 'reviewed');
      assert.equal(item.integrationStatus, 'integrated');
      assert.equal(item.releaseStatus, 'pilot_approved');
    }
  }
});
