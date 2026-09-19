// Where a skill sits relative to the child doing it.
//
// The point of this module is one sentence the app could not say before: "this is Grade 3 work, and
// you are in Grade 5." A tile used to be either present or absent, so a child meeting complete
// sentences had no way to know whether they were catching up, working at grade, or running ahead —
// and neither did the parent. Position, never a verdict: the app reports which grade Alberta places
// the skill at, and never says a child is behind.
//
// Two rules hold this honest, and both are tested:
//
//  1. A placement is shown to a LEARNER only when a person has verified the mapping. The ladder is a
//     reading of a PDF; until the parent has read it back, `mappingReviewedBy` is null and
//     `learnerPlacement` returns nothing. The parent's own review surface shows it regardless, which
//     is how it gets verified in the first place.
//  2. A skill Alberta does not place is not given a grade. It returns `unplaced` with the reason,
//     because inventing a grade for the pronunciation tiles — which came from the ESL benchmarks, not
//     from this curriculum — is exactly the false confidence this module exists to prevent.

const ORDER = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

// `unplaced` and `no_learner_grade` are different facts and must not share a bucket. The first says
// Alberta places this skill at no grade; the second says we do not know which grade the child is in.
// Reported together, a parent who had not yet set a grade was told that all fifty skills were absent
// from the curriculum, which is false about the curriculum rather than merely unhelpful.
export const PLACEMENTS = ['revisiting', 'at_grade', 'ahead', 'unplaced', 'no_learner_grade'];

export function gradeIndex(grade) {
  return ORDER.indexOf(grade);
}

export function skillRung(ladder, skillId) {
  return ladder?.skills?.find((skill) => skill.skillId === skillId) || null;
}

// The relation between a rung and a learner's grade. `consolidatedAt` is what decides "revisiting":
// a skill Alberta introduces at Grade 1 and still states at Grade 6 is not revision for a Grade 5
// child, but one it finishes with at Grade 3 is.
export function placementFor(ladder, skillId, learnerGrade) {
  const rung = skillRung(ladder, skillId);
  if (!rung) {
    const reason = ladder?.noCurriculumBasis?.[skillId];
    return { skillId, placement: 'unplaced', ...(reason ? { reason } : {}) };
  }
  const learner = gradeIndex(learnerGrade);
  const base = {
    skillId,
    introducedAt: rung.introducedAt,
    consolidatedAt: rung.consolidatedAt,
    ...(rung.note ? { note: rung.note } : {}),
  };
  // Without a learner grade there is no relation to report, only the facts of the rung.
  if (learner < 0) return { ...base, placement: 'no_learner_grade' };
  if (gradeIndex(rung.introducedAt) > learner) return { ...base, placement: 'ahead' };
  if (gradeIndex(rung.consolidatedAt) < learner) return { ...base, placement: 'revisiting' };
  return { ...base, placement: 'at_grade' };
}

// The words a child reads. Each names a grade and where it stands, and none of them judges: there is
// deliberately no "behind" here, and no percentage anywhere in this module.
export function placementLabel(placement) {
  if (!placement || placement.placement === 'unplaced') return null;
  // The rung without a child to compare it to. Still worth stating on the parent's page, which is
  // read before any grade has been set.
  if (placement.placement === 'no_learner_grade') {
    return placement.introducedAt === placement.consolidatedAt
      ? `Alberta states this at ${placement.introducedAt}`
      : `Alberta states this from ${placement.introducedAt} to ${placement.consolidatedAt}`;
  }
  if (placement.placement === 'revisiting') {
    return placement.introducedAt === placement.consolidatedAt
      ? `${placement.consolidatedAt} — revisiting`
      : `${placement.introducedAt} to ${placement.consolidatedAt} — revisiting`;
  }
  if (placement.placement === 'ahead') return `${placement.introducedAt} — working ahead`;
  return `${placement.consolidatedAt} — at your level`;
}

// The learner-facing gate. Null until a person has verified the ladder, whatever the ladder says.
export function learnerPlacement(ladder, skillId, learnerGrade) {
  if (!ladder?.mappingReviewedBy) return null;
  const placement = placementFor(ladder, skillId, learnerGrade);
  const label = placementLabel(placement);
  return label ? { ...placement, label } : null;
}

// The parent's view: every skill, placed or not, with the verification state stated plainly. This is
// what makes verification possible, so it is never gated on verification.
export function ladderReview(ladder, learnerGrade) {
  const placed = (ladder?.skills || []).map((rung) => {
    const placement = placementFor(ladder, rung.skillId, learnerGrade);
    return { ...placement, label: placementLabel(placement), evidence: rung.evidence };
  });
  const unplaced = Object.entries(ladder?.noCurriculumBasis || {}).map(([skillId, reason]) => ({
    skillId,
    placement: 'unplaced',
    reason,
  }));
  const counts = PLACEMENTS.reduce((out, name) => ({ ...out, [name]: 0 }), {});
  for (const entry of [...placed, ...unplaced]) counts[entry.placement] += 1;
  return {
    verified: Boolean(ladder?.mappingReviewedBy),
    shownToLearner: Boolean(ladder?.mappingReviewedBy),
    learnerGrade: learnerGrade || null,
    counts,
    skills: [...placed, ...unplaced].sort((a, b) => a.skillId.localeCompare(b.skillId)),
    disputed: ladder?.disputedByLadder || [],
    // Counts, never a proportion. "34% at grade" would read as a score of the child rather than a
    // description of the content, which is the one thing this must not become.
    unplacedSkills: unplaced.length,
    summary: ladder?.mappingReviewedBy
      ? `Verified by ${ladder.mappingReviewedBy}. Learners see the grade on each lesson.`
      : 'Nobody has checked this mapping yet, so learners are shown no grade at all. Read the rungs below; each one quotes the Alberta outcome it rests on.',
  };
}
