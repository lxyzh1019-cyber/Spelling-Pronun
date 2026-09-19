// What a learner can open, and what they cannot.
//
// Until 2026-09-19 the lesson catalog imported only the four C0 packs and mapped them to routes
// through a hardcoded four-entry literal, and `Home.jsx` held a hardcoded four-tile array. So the 192
// questions and 6 packs built the day before could not have reached a child even once approved — and
// an unmapped skill produced `undefined` as a catalog key, so two such packs would have collided on
// one entry rather than failing loudly.
//
// The catalog now knows every pack and gates on approval. These tests hold both halves of that: draft
// content is unreachable, and approved content becomes reachable without anyone editing code.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allLessonCatalog,
  c0LessonCatalog,
  learnerLessonTiles,
  lessonBySessionId,
  packIsLearnerVisible,
  sessionIdForPack,
} from '../src/data/lessonCatalog.js';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';

const allPacks = [...c0PilotPacks, ...c1Packs, ...foundationPacks, ...punctuationPacks];

test('the catalog knows every authored pack, and each has its own route', () => {
  assert.equal(Object.keys(allLessonCatalog).length, allPacks.length, 'a pack is missing from the catalog');
  const ids = allPacks.map(sessionIdForPack);
  assert.equal(new Set(ids).size, ids.length, 'two packs share a session id');
  for (const id of ids) assert.ok(id && !id.includes('undefined'), `a pack produced the session id ${id}`);
});

// The C0 route ids are pinned, not derived. A durable session, a bookmark and the learner's completion
// count are all keyed by session id, so deriving them would orphan every session in progress.
test('the four C0 lessons keep the route ids they have always had', () => {
  assert.deepEqual(
    c0PilotPacks.map(sessionIdForPack).sort(),
    ['pilot-gr-pronouns', 'pilot-pu-capitals', 'pilot-se-complete', 'pilot-sp-patterns'],
  );
});

// The gate itself. This is the test that would have caught draft content reaching a child.
test('only approved content is reachable by a learner', () => {
  for (const pack of allPacks) {
    const independent = pack.items.filter((item) => item.role === 'independent');
    const approved = independent.every((item) => ['pilot_approved', 'released'].includes(item.releaseStatus));
    assert.equal(packIsLearnerVisible(pack), approved, `${pack.id} visibility does not match its approval`);
    const sessionId = sessionIdForPack(pack);
    if (approved) {
      assert.ok(lessonBySessionId(sessionId), `${pack.id} is approved but has no learner route`);
    } else {
      assert.equal(lessonBySessionId(sessionId), null, `${pack.id} is draft but a learner can open it`);
      assert.ok(allLessonCatalog[sessionId], `${pack.id} vanished instead of being withheld`);
    }
  }
  // Today: the four C0 packs are approved and the six drafted ones are not.
  assert.equal(Object.keys(c0LessonCatalog).length, 4);
  assert.equal(Object.keys(allLessonCatalog).length - Object.keys(c0LessonCatalog).length, allPacks.length - 4);
});

// A pack with no approval must not become visible by having no independent items to check, which is
// how an "every" over an empty list quietly returns true.
test('a pack with nothing to practise is not visible', () => {
  assert.equal(packIsLearnerVisible({ id: 'x', items: [] }), false);
  assert.equal(packIsLearnerVisible({ id: 'x' }), false);
  // And one approved item does not carry an unapproved one into a lesson.
  const mixed = {
    id: 'x',
    items: [
      { role: 'independent', releaseStatus: 'pilot_approved' },
      { role: 'independent', releaseStatus: 'not_released' },
    ],
  };
  assert.equal(packIsLearnerVisible(mixed), false, 'a half-approved pack reached a learner');
});

// The tiles come from the catalog, so approving a pack makes its tile appear with no code change.
test('every tile points at a lesson that exists, and no draft has one', () => {
  const tiles = learnerLessonTiles();
  assert.equal(tiles.length, Object.keys(c0LessonCatalog).length);
  for (const tile of tiles) {
    const sessionId = tile.to.replace('/lesson/', '');
    const lesson = lessonBySessionId(sessionId);
    assert.ok(lesson, `${tile.to} points at no lesson`);
    assert.equal(tile.label, lesson.title, 'a tile has drifted from its lesson title');
    assert.ok(tile.desc.length > 10, `${tile.to} has no description`);
    assert.ok(tile.icon && tile.color, `${tile.to} has no style`);
    // A tile states a grade placement only when its pack does. Inventing one would be exactly the
    // false confidence the placement field exists to avoid.
    if (tile.placement) assert.equal(tile.placement, lesson.albertaPlacement.albertaGrades);
    else assert.equal(lesson.albertaPlacement, undefined, `${tile.to} hides a placement its pack states`);
  }
});

// The phonics packs are the case the placement field was built for: Alberta ends that organizing idea
// after Grade 4, so a child meeting them is revisiting, and the tile has to say so rather than let
// them assume everything on the home screen is at their grade.
test('a pack that states where Alberta places it keeps that through to the tile', () => {
  for (const pack of foundationPacks) {
    const lesson = allLessonCatalog[sessionIdForPack(pack)];
    assert.ok(lesson.albertaPlacement, `${pack.id} lost its placement on the way into the catalog`);
    assert.match(lesson.albertaPlacement.albertaGrades, /Grade 4|Grade 3|Kindergarten/);
    assert.deepEqual(lesson.curriculumOutcomeIds, undefined, `${pack.id} claims a Grade 5/6 outcome`);
  }
  // The C1 packs are the other way round: they name outcomes and state no placement.
  for (const pack of c1Packs) {
    const lesson = allLessonCatalog[sessionIdForPack(pack)];
    assert.ok(lesson.curriculumOutcomeIds?.length, `${pack.id} names no outcome`);
    assert.equal(lesson.albertaPlacement, undefined);
  }
});

// The grade a tile shows is the ladder's, and it appears only when there is both a verified mapping
// and a learner grade to compare against. Two gates, and the test breaks each one separately —
// otherwise "shows nothing" passes for the wrong reason, because nothing is wired at all.
test('a tile names a grade only once the mapping is verified and the learner has one', () => {
  const verified = { ...ladder, mappingReviewedBy: 'parent (fixture)' };
  // Neither gate open: the four C0 packs have no albertaPlacement of their own, so no grade at all.
  for (const tile of learnerLessonTiles()) assert.equal(tile.relation, undefined);
  // Verified but no learner grade: still nothing, because there is nothing to be relative to.
  for (const tile of learnerLessonTiles({ gradeLadder: verified })) assert.equal(tile.relation, undefined);
  // A learner grade but an unverified mapping: still nothing.
  for (const tile of learnerLessonTiles({ learnerGrade: 'Grade 5' })) assert.equal(tile.relation, undefined);
  // Both: every tile is placed, and SE.complete is the one Alberta finishes with at Grade 3.
  const placed = learnerLessonTiles({ learnerGrade: 'Grade 5', gradeLadder: verified });
  assert.equal(placed.length, Object.keys(c0LessonCatalog).length);
  for (const tile of placed) {
    assert.ok(['revisiting', 'at_grade', 'ahead'].includes(tile.relation), `${tile.to} has no placement`);
    assert.ok(tile.placement.includes('Grade'), `${tile.to} states a relation with no grade`);
  }
  const sentences = placed.find((tile) => tile.to === '/lesson/pilot-se-complete');
  assert.equal(sentences.relation, 'revisiting');
  assert.match(sentences.placement, /Grade 3/);
  // A Grade 3 child doing the same lesson is at grade, not revisiting. The tile describes the
  // relation, not the lesson, so the same lesson reads differently for a different child.
  const younger = learnerLessonTiles({ learnerGrade: 'Grade 3', gradeLadder: verified })
    .find((tile) => tile.to === '/lesson/pilot-se-complete');
  assert.equal(younger.relation, 'at_grade');
});
