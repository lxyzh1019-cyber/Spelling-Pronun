// The grade ladder, and the two rules that keep it honest.
//
// The ladder exists so a child can be told "this is Grade 3 work and you are in Grade 5" instead of
// being left to assume that everything on the home screen is at their grade. That sentence is only
// worth saying if it is true, so: every rung must quote a real Alberta outcome, and no grade reaches
// a learner until a person has checked the reading.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import k6 from '../src/data/curriculum.k6.json' with { type: 'json' };
import skillsFile from '../src/data/skills.json' with { type: 'json' };
import {
  gradeIndex,
  ladderReview,
  learnerPlacement,
  placementFor,
  placementLabel,
  skillRung,
} from '../src/learning/gradeLadder.js';

const skillIds = (Array.isArray(skillsFile) ? skillsFile : skillsFile.skills).map((skill) => skill.id);
const outcomes = new Map();
for (const idea of k6.organizingIdeas) {
  for (const grade of Object.values(idea.grades)) {
    for (const outcome of grade.skillsAndProcedures) outcomes.set(outcome.id, { ...outcome, grade: grade.grade });
  }
}

test('every skill in the app is either placed on the ladder or given a reason for having no place', () => {
  const placed = new Set(ladder.skills.map((rung) => rung.skillId));
  const unplaced = new Set(Object.keys(ladder.noCurriculumBasis));
  for (const id of skillIds) {
    assert.ok(placed.has(id) || unplaced.has(id), `${id} is on neither list`);
    assert.ok(!(placed.has(id) && unplaced.has(id)), `${id} is on both lists`);
  }
  assert.equal(placed.size + unplaced.size, skillIds.length);
});

// The guarantee the whole ladder rests on. A rung that named a grade in prose could say anything; a
// rung that cites outcome ids can only say what the curriculum says, because the grade is read back
// off the outcome rather than written beside it.
test('every rung quotes real Alberta outcomes, and its grades are those outcomes’ own', () => {
  const ORDER = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  for (const rung of ladder.skills) {
    const all = [...rung.evidence.introducedBy, ...rung.evidence.consolidatedBy, ...rung.evidence.alsoAt];
    assert.ok(rung.evidence.introducedBy.length, `${rung.skillId} introduces nothing`);
    assert.ok(rung.evidence.consolidatedBy.length, `${rung.skillId} consolidates nothing`);
    for (const cited of all) {
      const real = outcomes.get(cited.id);
      assert.ok(real, `${rung.skillId} cites ${cited.id}, which is not an Alberta outcome`);
      assert.equal(cited.text, real.text, `${rung.skillId} misquotes ${cited.id}`);
      assert.equal(cited.grade, real.grade, `${rung.skillId} puts ${cited.id} in the wrong grade`);
    }
    // Note on what this can and cannot catch: no rung's `introducedBy` currently spans two grades,
    // so the "earliest" half of the derivation is not exercised by real data. The "latest" half is
    // (SP.patterns cites Grade 5 and Grade 6), and reversing it fails this test.
    const introGrades = rung.evidence.introducedBy.map((cited) => ORDER.indexOf(cited.grade));
    assert.equal(rung.introducedAt, ORDER[Math.min(...introGrades)], `${rung.skillId} is not introduced at its earliest cited grade`);
    const endGrades = rung.evidence.consolidatedBy.map((cited) => ORDER.indexOf(cited.grade));
    assert.equal(rung.consolidatedAt, ORDER[Math.max(...endGrades)], `${rung.skillId} does not end at its latest cited grade`);
    assert.ok(ORDER.indexOf(rung.consolidatedAt) >= ORDER.indexOf(rung.introducedAt));
    assert.equal(rung.endsBeforeGrade5, ORDER.indexOf(rung.consolidatedAt) < ORDER.indexOf('Grade 5'));
  }
});

// Grades 7–12 use different curriculum architectures — 7–9 is built from General Outcomes 1–5 and
// 10–12 is streamed by course, not grade. An empty `extendedAt` is the honest answer; the note has to
// say why, or a later reader will fill it in by guessing.
test('no rung claims a grade past 6 without saying the scale changes', () => {
  for (const rung of ladder.skills) {
    assert.deepEqual(rung.extendedAt, [], `${rung.skillId} claims a rung above Grade 6`);
    assert.match(rung.scaleNote, /7–9|10-1|course/, `${rung.skillId} has no note about the change of scale`);
  }
});

test('placement reports position, and names the grade it comes from', () => {
  // SE.complete: Alberta introduces it in Kindergarten and finishes with it at Grade 3.
  const revisit = placementFor(ladder, 'SE.complete', 'Grade 5');
  assert.equal(revisit.placement, 'revisiting');
  assert.match(placementLabel(revisit), /Grade 3/);
  assert.match(placementLabel(revisit), /revisiting/);
  // SE.clauses: first stated at Grade 6.
  const ahead = placementFor(ladder, 'SE.clauses', 'Grade 5');
  assert.equal(ahead.placement, 'ahead');
  assert.equal(placementLabel(ahead), 'Grade 6 — working ahead');
  // GR.antecedents: first stated at Grade 5.
  assert.equal(placementFor(ladder, 'GR.antecedents', 'Grade 5').placement, 'at_grade');
  // The same skill for a Grade 6 child is no longer ahead, and for a Grade 4 child it is.
  assert.equal(placementFor(ladder, 'SE.clauses', 'Grade 6').placement, 'at_grade');
  assert.equal(placementFor(ladder, 'GR.antecedents', 'Grade 4').placement, 'ahead');
  assert.equal(placementFor(ladder, 'GR.antecedents', 'Grade 6').placement, 'revisiting');
});

// The pronunciation tiles are the case this is for. The parent asked for them to stay, and they do —
// but Alberta has no pronunciation strand at any grade, so they get no grade rather than a made-up one.
test('a skill Alberta does not place is given no grade, only a reason', () => {
  for (const skillId of Object.keys(ladder.noCurriculumBasis)) {
    const placement = placementFor(ladder, skillId, 'Grade 5');
    assert.equal(placement.placement, 'unplaced');
    assert.ok(placement.reason.length > 20, `${skillId} has no reason`);
    assert.equal(placementLabel(placement), null, `${skillId} produced a label from nothing`);
    assert.equal(learnerPlacement(ladder, skillId, 'Grade 5'), null);
  }
  assert.equal(skillRung(ladder, 'PR.word-stress'), null);
  assert.equal(gradeIndex('Grade 9'), -1);
  // No learner grade means no relation to report, not a guessed one — and not the same answer as a
  // skill Alberta places nowhere. Sharing one bucket told a parent who had set no grade that all
  // fifty skills were absent from the curriculum.
  const noGrade = placementFor(ladder, 'SE.complete', null);
  assert.equal(noGrade.placement, 'no_learner_grade');
  assert.equal(placementLabel(noGrade), 'Alberta states this from Kindergarten to Grade 3');
  assert.notEqual(noGrade.placement, placementFor(ladder, 'PR.endings', 'Grade 5').placement);
  const review = ladderReview(ladder, null);
  assert.equal(review.counts.unplaced, Object.keys(ladder.noCurriculumBasis).length);
  assert.equal(review.counts.no_learner_grade, ladder.skills.length);
});

// Rule two, and the one worth breaking on purpose. The ladder is a reading of a PDF that nobody has
// checked; a child must not be told their grade on the strength of it.
test('no grade reaches a learner until a person has verified the mapping', () => {
  assert.equal(ladder.mappingReviewedBy, null, 'the ladder claims a reviewer');
  assert.equal(learnerPlacement(ladder, 'SE.complete', 'Grade 5'), null, 'an unverified grade reached a learner');
  // Mutation: with a reviewer recorded, the same call must produce the label. If this half fails, the
  // gate above is passing for the wrong reason — because nothing is wired, not because it is withheld.
  const verified = { ...ladder, mappingReviewedBy: 'parent (fixture)' };
  const shown = learnerPlacement(verified, 'SE.complete', 'Grade 5');
  assert.ok(shown, 'a verified ladder still showed nothing');
  assert.match(shown.label, /Grade 3 — revisiting/);
  // The parent's own surface is never gated, or the mapping could never be verified at all.
  assert.equal(ladderReview(ladder, 'Grade 5').verified, false);
  assert.ok(ladderReview(ladder, 'Grade 5').skills.length > 40);
  assert.equal(ladderReview(verified, 'Grade 5').verified, true);
});

test('the parent review counts every skill and never states a proportion', () => {
  const review = ladderReview(ladder, 'Grade 5');
  const total = Object.values(review.counts).reduce((sum, count) => sum + count, 0);
  assert.equal(total, skillIds.length);
  assert.ok(review.counts.revisiting > 0 && review.counts.at_grade > 0 && review.counts.ahead > 0);
  assert.doesNotMatch(JSON.stringify(review), /%|percent|behind/i, 'the review judges rather than places');
  assert.ok(review.disputed.length, 'the ladder disagrees with the earlier mapping and does not say so');
  for (const entry of review.disputed) assert.ok(entry.claimIn && entry.claim && entry.ladderFinds && entry.effect);
});

// The extraction the whole ladder rests on. Generalising the Grade 5/6 reader to all seven grades
// could have quietly changed the 214 statements that were read and mapped by hand — the only part of
// this anyone has checked. They must still be there, word for word.
test('the K–6 extraction still reproduces the 214 verified Grade 5/6 outcomes exactly', () => {
  const verified = JSON.parse(fs.readFileSync(new URL('../src/data/curriculum.alberta.elal.json', import.meta.url), 'utf8'));
  const byIdea = new Map(k6.organizingIdeas.map((idea) => [idea.id, idea]));
  let compared = 0;
  for (const idea of verified.organizingIdeas) {
    const other = byIdea.get(idea.id);
    assert.ok(other, `${idea.id} is missing from the K–6 extraction`);
    for (const key of ['grade5', 'grade6']) {
      assert.equal(other.grades[key].guidingQuestion, idea.grades[key].guidingQuestion);
      assert.equal(other.grades[key].learningOutcome, idea.grades[key].learningOutcome);
      assert.deepEqual(other.grades[key].knowledge, idea.grades[key].knowledge);
      assert.deepEqual(other.grades[key].understanding, idea.grades[key].understanding);
      idea.grades[key].skillsAndProcedures.forEach((outcome, index) => {
        // Id and text only. The verified file also carries the coverage judgement made against it
        // (`coverage`, `skillIds`, `note`), which is a reading of the statement rather than part of it.
        const same = other.grades[key].skillsAndProcedures[index];
        assert.equal(same.id, outcome.id);
        assert.equal(same.text, outcome.text);
        compared += 1;
      });
    }
  }
  assert.equal(compared, 214);
});

// Three of the nine organizing ideas stop before Grade 6. That is the fact the phonics tiles rest on,
// and the earlier mapping stated it one grade out.
test('the extraction states where each organizing idea ends', () => {
  const ends = Object.fromEntries(k6.organizingIdeas.map((idea) => [idea.name, idea.lastGrade]));
  assert.equal(ends['Phonological Awareness'], 'Grade 2');
  assert.equal(ends.Phonics, 'Grade 3');
  assert.equal(ends.Fluency, 'Grade 4');
  for (const name of ['Vocabulary', 'Comprehension', 'Writing', 'Conventions', 'Oral Language', 'Text Forms and Structures']) {
    assert.equal(ends[name], 'Grade 6', `${name} should run to Grade 6`);
  }
  assert.equal(ladder.organizingIdeaRange.Phonics, 'Kindergarten to Grade 3');
});
