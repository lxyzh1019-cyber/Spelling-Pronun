// What the below-grade diagnostic found, and the one question it was built to answer.
//
// The parent asked whether the children need a separate app to catch up. That is a question about
// the SHAPE of the gap, not its size: a child who is short on two skills needs two packs, and a
// child who is short on most of them needs something else. A percentage cannot tell those apart —
// 40% could be either — so this module reports the shape and never computes a score.
//
// Three rules, all tested:
//
//  1. A diagnostic result is never mastery evidence. Every item is draft, so `evidenceEligible`
//     already excludes it; this module refuses to expose anything that could be read as mastery, and
//     says so in the data rather than only in a comment.
//  2. No proportions and no verdicts about the child. The states are about the SKILL — solid, needs
//     building, not enough evidence — and the word "behind" appears nowhere.
//  3. Three questions is three questions. A skill with one answer is `not_enough_evidence`, not a
//     50% or a guess, and a single wrong answer out of three is not a gap.

export const SKILL_STATES = ['solid', 'needs_building', 'partly_solid', 'not_enough_evidence'];

// Three questions, and the reading of them. Two or three right is solid: the questions probe
// different sub-rules of one skill, so getting two of three is a working grasp with a thin patch.
// One right is partly solid — something is there. None right needs building.
export function stateFor({ answered, correct }) {
  if (answered < 2) return 'not_enough_evidence';
  if (correct === answered) return 'solid';
  if (correct === 0) return 'needs_building';
  return answered - correct === 1 ? 'partly_solid' : 'needs_building';
}

// Attempts are the app's immutable record. Only the FIRST attempt at an item counts here: a second
// look at a question whose answer has just been seen measures memory of that sitting.
export function firstAttempts(attempts = [], itemIds) {
  const seen = new Map();
  for (const attempt of attempts) {
    if (!itemIds.has(attempt.itemId)) continue;
    if (seen.has(attempt.itemId)) continue;
    seen.set(attempt.itemId, attempt);
  }
  return [...seen.values()];
}

export function buildDiagnosticReport(form, attempts = [], { ladder = null } = {}) {
  const items = form?.items || [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const answers = firstAttempts(attempts, new Set(byId.keys()));
  const answerFor = new Map(answers.map((attempt) => [attempt.itemId, attempt]));

  const bySkill = new Map();
  for (const item of items) {
    if (!bySkill.has(item.skillId)) {
      bySkill.set(item.skillId, { skillId: item.skillId, total: 0, answered: 0, correct: 0, probesGrades: new Set(), locates: [] });
    }
    const entry = bySkill.get(item.skillId);
    entry.total += 1;
    entry.probesGrades.add(item.probesGrade);
    const attempt = answerFor.get(item.id);
    if (!attempt) continue;
    entry.answered += 1;
    if (attempt.correct) entry.correct += 1;
    // What a wrong answer points at. This is the output the parent can act on: not "weak on
    // punctuation" but "the apostrophe on a plural that already ends in s".
    else entry.locates.push({ itemId: item.id, locates: item.locates, probesGrade: item.probesGrade });
  }

  const skills = [...bySkill.values()]
    .map((entry) => {
      const rung = ladder?.skills?.find((skill) => skill.skillId === entry.skillId) || null;
      return {
        skillId: entry.skillId,
        total: entry.total,
        answered: entry.answered,
        correct: entry.correct,
        state: stateFor(entry),
        probesGrades: [...entry.probesGrades].sort(),
        // The grade Alberta finishes with this skill, straight off the ladder. It is what makes a gap
        // here matter: nothing later in the curriculum comes back to it.
        ...(rung ? { albertaFinishesAt: rung.consolidatedAt } : {}),
        locates: entry.locates,
      };
    })
    .sort((a, b) => a.skillId.localeCompare(b.skillId));

  const counts = SKILL_STATES.reduce((out, state) => ({ ...out, [state]: 0 }), {});
  for (const skill of skills) counts[skill.state] += 1;
  const measured = skills.filter((skill) => skill.state !== 'not_enough_evidence');
  const needing = skills.filter((skill) => skill.state === 'needs_building' || skill.state === 'partly_solid');

  return {
    formId: form?.id || null,
    // Stated in the output, not only in a comment, so anything reading this cannot mistake it.
    producesMasteryEvidence: false,
    masteryNote: 'This locates gaps; it is not mastery evidence. Every question in it is draft content, and draft content can never count as independent evidence however it is answered.',
    skillCount: skills.length,
    counts,
    skills,
    // What the parent actually asked. The answer is the shape of the gap, and it refuses to guess
    // until most of the form has been done.
    separateAppQuestion: separateAppReading(measured, skills.length, needing),
  };
}

// Whether a separate catch-up app is the right shape of answer.
//
// A scattered gap says no: the child is at grade on most of this and short on a few specific things,
// which is a few packs inside the app they already use, tagged with the grade Alberta puts them at. A
// wholesale gap would say something else, and this is deliberately the only place that judgement is
// made — from evidence, not from an opinion formed in advance.
export function separateAppReading(measured, skillCount, needing) {
  if (measured.length < Math.ceil(skillCount / 2)) {
    return {
      answer: 'not_enough_evidence',
      detail: `Only ${measured.length} of ${skillCount} skills have been answered. The question of whether a separate catch-up app is needed is a question about the shape of the gap, and there is not enough of the form done yet to see a shape.`,
      needing: needing.map((skill) => skill.skillId),
    };
  }
  const share = needing.length / measured.length;
  if (needing.length === 0) {
    return { answer: 'no_gap_found', detail: 'Nothing in this form came back needing to be built. Whatever else is worth doing, catching up on these sixteen skills is not it.', needing: [] };
  }
  if (share <= 0.5) {
    return {
      answer: 'build_packs_here',
      detail: `${needing.length} of the ${measured.length} skills answered need building: ${needing.map((skill) => skill.skillId).join(', ')}. That is a scattered gap, not a wholesale one, so it is a few packs inside this app rather than a separate one — and keeping it here means one record of what the child can do instead of two.`,
      needing: needing.map((skill) => skill.skillId),
    };
  }
  return {
    answer: 'reconsider_scope',
    detail: `${needing.length} of the ${measured.length} skills answered need building. That is most of the form, which is a different situation from a few specific gaps and worth talking about before building anything: a run of packs at this size is a curriculum, not a patch.`,
    needing: needing.map((skill) => skill.skillId),
  };
}
