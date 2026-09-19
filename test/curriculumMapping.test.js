// The Alberta ELAL (K–6) mapping: what this app measures against what the curriculum actually asks for.
//
// `MASTER_PLAN.md` forbids calling anything curriculum-aligned without the source in hand. The source
// could not be fetched — this container cannot reach curriculum.learnalberta.ca, alberta.ca or
// open.alberta.ca — so the parent supplied the PDF on 2026-09-18, and every statement in the mapping is
// lifted from its text layer rather than typed from memory.
//
// These tests hold the mapping to three promises: it accounts for every skill the app declares, it
// attributes every statement to the right grade, and it does not let the app describe itself as
// covering the curriculum before a person has checked the mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import mapping from '../src/data/curriculum.alberta.elal.json' with { type: 'json' };
import skillData from '../src/data/skills.json' with { type: 'json' };
import { c0PilotItems } from '../src/data/packs.c0.draft.js';
import { c0AssessmentItems } from '../src/data/assessment.c0.draft.js';

const COVERAGE_STATES = ['covered', 'partial', 'not_built', 'not_measurable'];
const allOutcomes = mapping.organizingIdeas.flatMap((idea) =>
  Object.values(idea.grades).flatMap((grade) => grade.skillsAndProcedures.map((outcome) => ({ ...outcome, grade: grade.grade, idea: idea.name }))));
const mappedSkillIds = new Set(allOutcomes.flatMap((outcome) => outcome.skillIds));
const skillIds = skillData.skills.map((skill) => skill.id);

test('the mapping says where it came from and who has checked it', () => {
  assert.equal(mapping.source.jurisdiction, 'Alberta');
  assert.ok(mapping.source.providedBy, 'the mapping does not say who supplied the curriculum');
  assert.ok(mapping.source.extraction.length > 80, 'the mapping does not say how the statements were taken from the source');
  // The statements are the curriculum's words; the coverage decisions beside them are not. Until a
  // person has checked those decisions, the file must say so in both its status and its note, and
  // nothing may describe this app as covering the Alberta curriculum.
  if (!mapping.mappingReviewedBy) {
    assert.equal(mapping.status, 'mapping_awaiting_parent_verification');
    assert.match(mapping.mappingReviewNote, /has not been checked|not be described/i);
  }
});

test('every outcome carries one of the four states and says why', () => {
  assert.ok(allOutcomes.length > 200, `only ${allOutcomes.length} outcomes were mapped`);
  assert.deepEqual(Object.keys(mapping.coverageStates).sort(), [...COVERAGE_STATES].sort());
  for (const outcome of allOutcomes) {
    assert.ok(COVERAGE_STATES.includes(outcome.coverage), `${outcome.id} has an unsupported coverage state`);
    assert.ok(outcome.text.trim().length > 15, `${outcome.id} has no statement text`);
    assert.ok(outcome.note.trim().length > 20, `${outcome.id} does not say why it is ${outcome.coverage}`);
    // A state that claims measurement has to name what measures it; one that claims none must name none.
    if (outcome.coverage === 'covered' || outcome.coverage === 'partial') {
      assert.ok(outcome.skillIds.length > 0, `${outcome.id} claims ${outcome.coverage} without naming a skill`);
    }
    if (outcome.coverage === 'not_measurable') {
      assert.equal(outcome.skillIds.length, 0, `${outcome.id} is not measurable but names a skill`);
    }
    for (const id of outcome.skillIds) assert.ok(skillIds.includes(id), `${outcome.id} names unknown skill ${id}`);
  }
});

// The point of the whole file: a skill cannot quietly exist without anyone saying whether Alberta asks
// for it at this grade. Either an outcome names it, or the file states why no outcome does.
test('every app skill either maps to an outcome or says why it does not', () => {
  for (const id of skillIds) {
    const mapped = mappedSkillIds.has(id);
    const excused = mapping.skillsWithNoGrade56Outcome[id];
    assert.ok(mapped || excused, `${id} is neither mapped to a Grade 5/6 outcome nor explained`);
    assert.ok(!(mapped && excused), `${id} is both mapped and excused, so one of the two is wrong`);
    if (excused) assert.ok(excused.trim().length > 25, `${id} is excused without a real reason`);
  }
  for (const id of Object.keys(mapping.skillsWithNoGrade56Outcome)) {
    assert.ok(skillIds.includes(id), `${id} is excused but is not a skill`);
  }
});

// A `covered` claim is the only one that asserts a child could be measured today, so it has to be true
// of the content that actually exists, not of a skill id that is merely declared in skills.json.
test('nothing is called covered unless content for it exists', () => {
  const withContent = new Set([...c0PilotItems, ...c0AssessmentItems].map((item) => item.primarySkill));
  for (const outcome of allOutcomes.filter((entry) => entry.coverage === 'covered')) {
    assert.ok(
      outcome.skillIds.some((id) => withContent.has(id)),
      `${outcome.id} is called covered but none of ${outcome.skillIds.join(', ')} has any content`,
    );
  }
});

// Grade 5 and Grade 6 share a page in two columns. Read as flat text the columns interleave, and the
// result is a mapping that attributes Grade 6 outcomes to Grade 5. The extraction keeps the column
// positions, and this is what proves it: the two grades ask different questions and state different
// learning outcomes on every single organizing idea, which could not survive a column mix-up.
test('Grade 5 and Grade 6 are really separated, not interleaved', () => {
  for (const idea of mapping.organizingIdeas) {
    const g5 = idea.grades.grade5;
    const g6 = idea.grades.grade6;
    assert.equal(g5.grade, 'Grade 5');
    assert.equal(g6.grade, 'Grade 6');
    for (const grade of [g5, g6]) {
      assert.ok(grade.guidingQuestion.endsWith('?'), `${idea.name} ${grade.grade} has no guiding question`);
      assert.ok(grade.learningOutcome.startsWith('Students '), `${idea.name} ${grade.grade} has no learning outcome`);
      assert.ok(grade.skillsAndProcedures.length > 0, `${idea.name} ${grade.grade} has no outcomes`);
    }
    assert.notEqual(g5.guidingQuestion, g6.guidingQuestion, `${idea.name} gives both grades the same guiding question`);
    assert.notEqual(g5.learningOutcome, g6.learningOutcome, `${idea.name} gives both grades the same learning outcome`);
    assert.ok(idea.sourcePages.length > 0, `${idea.name} does not say which pages it came from`);
  }
});

// Alberta ends Phonics after Grade 4 and Phonological Awareness after Grade 2. A phonics tile is still
// worth having if the children need it, but it is Grade 1–4 support and must never be presented as a
// Grade 5/6 Alberta outcome. The record of that is here, so a later session cannot assume otherwise.
test('the organizing ideas Alberta stops before Grade 5 are named', () => {
  const stopped = mapping.organizingIdeasNotInGrade56.map((entry) => entry.name);
  assert.deepEqual(stopped.sort(), ['Fluency', 'Phonics', 'Phonological Awareness']);
  for (const entry of mapping.organizingIdeasNotInGrade56) {
    assert.match(entry.lastGrade, /^Grade \d$/, `${entry.name} does not say where it stops`);
    assert.ok(entry.note.trim().length > 20, `${entry.name} does not say what that means for this app`);
  }
  const present = mapping.organizingIdeas.map((idea) => idea.name).sort();
  assert.deepEqual(present, ['Comprehension', 'Conventions', 'Oral Language', 'Text Forms and Structures', 'Vocabulary', 'Writing']);
});

// Two of the four packs teach outcomes Alberta places below Grade 5. That does not make them useless —
// a child who needs them needs them — but it does mean the app cannot report them as a Grade 5/6 check,
// and the placement has to name the statement it was judged against rather than asserting a grade.
test('each pack says which grade its content actually matches, and against which statement', () => {
  const packIds = new Set(c0PilotItems.map((item) => item.packId));
  assert.equal(mapping.appContentPlacement.length, packIds.size);
  for (const placement of mapping.appContentPlacement) {
    assert.ok(packIds.has(placement.packId), `${placement.packId} is placed but is not a pack`);
    assert.match(placement.albertaGrade, /^Grade \d( to Grade \d)?$/, `${placement.packId} has no Alberta grade`);
    assert.ok(placement.matchingStatements.length > 0, `${placement.packId} names no statement`);
    for (const statement of placement.matchingStatements) {
      assert.match(statement, /^Grade \d/, `${placement.packId} cites a statement without naming its grade`);
      assert.match(statement, /"/, `${placement.packId} paraphrases instead of quoting the curriculum`);
    }
    assert.ok(Number.isInteger(placement.sourcePage), `${placement.packId} does not say which page it was read from`);
  }
});
