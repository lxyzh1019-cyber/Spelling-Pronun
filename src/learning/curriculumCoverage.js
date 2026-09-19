// Curriculum coverage: what Alberta asks for, set against what this app can actually tell you.
//
// The parent's question was never "what is the score" — it was "does this check what the curriculum
// includes". That question has four honest answers per outcome, and this module returns them per
// organizing idea rather than rolling them into one number. There is deliberately no percentage and
// no single "coverage" figure: 9 outcomes measured out of 214 would read as 4%, which sounds like a
// small shortfall rather than what it is.
//
// The four states, in the order a reader should think about them:
//
//   checked              an app skill measures this outcome, content exists, and the child's own
//                        evidence has reached `secure` on it
//   needs_more_evidence  measured and built, but the evidence is not there yet — unassessed,
//                        learning, developing, or flagged for review
//   not_built            Alberta asks for it, a question with an answer key could measure it, and
//                        this app has not built one
//   needs_parent         you mark this one. Speaking, discussion, presentation, composition, reading
//                        for enjoyment. No answer key applies, so the app's job is to put the work in
//                        front of you with a rubric, not to score it.
//
// `needs_parent` is not a failing and must never be reported as one: the parent decided on
// 2026-09-18 that these are simply theirs to mark. `not_built` is the gap the app can close itself.

export const COVERAGE_STATES = ['checked', 'needs_more_evidence', 'not_built', 'needs_parent'];

// Mastery statuses that mean the outcome is genuinely demonstrated. Everything else — including
// `secure` with `needsReview` set — is evidence that has not settled.
const SECURE = 'secure';

export function outcomeState(outcome, masteryBySkill = new Map()) {
  if (outcome.coverage === 'not_measurable') return 'needs_parent';
  if (outcome.coverage === 'not_built') return 'not_built';
  // `covered` and `partial` are measured, so the child's own evidence decides. A partial outcome can
  // never read as `checked`: part of it is not built, so the evidence cannot speak for the whole.
  if (outcome.coverage === 'partial') return 'needs_more_evidence';
  const secure = outcome.skillIds.some((skillId) => {
    const mastery = masteryBySkill.get(skillId);
    return mastery?.status === SECURE && !mastery.needsReview;
  });
  return secure ? 'checked' : 'needs_more_evidence';
}

function emptyTally() {
  return COVERAGE_STATES.reduce((tally, state) => ({ ...tally, [state]: 0 }), {});
}

// Which outcomes have draft content written against them, worked out from the packs themselves.
//
// This used to be a hand-written `draftedIn` field on each outcome in the mapping, and it drifted
// within a day: the punctuation and sentence packs cited five outcomes that the mapping still showed
// as unwritten, so /parent reported 9 outcomes as drafted when 14 had content. A hand-maintained
// cross-reference between two files is a cross-reference that goes stale, so this derives it.
//
// The outcome's own `draftedIn` is still honoured, because an outcome can be drafted against by
// something that is not a pack.
export function draftedByPack(packs = []) {
  const drafted = new Map();
  for (const pack of packs) {
    for (const id of pack.curriculumOutcomeIds || []) {
      if (!drafted.has(id)) drafted.set(id, []);
      if (!drafted.get(id).includes(pack.id)) drafted.get(id).push(pack.id);
    }
  }
  return drafted;
}

// Which app skills measure an outcome. Same problem, same fix, and it had drifted further than
// `draftedIn`: the mapping listed `PU.capitals-endmarks` alone against "Apply punctuation to support
// effective written communication", because that was the only punctuation pack on the day the
// mapping was written. Five more exist now.
//
// The union, never a replacement. An outcome keeps every skill the mapping declares and gains any
// pack that cites it, so a hand-made judgement is added to rather than overwritten — which matters
// for the nine `covered` outcomes, where these ids decide whose mastery counts.
export function skillsForOutcome(outcome, packsByOutcome = new Map()) {
  const declared = outcome.skillIds || [];
  const fromPacks = (packsByOutcome.get(outcome.id) || []).map((pack) => pack.skillId);
  return [...new Set([...declared, ...fromPacks])];
}

// One row per organizing idea per grade, plus the outcomes themselves so a parent can read the
// curriculum's own words rather than a label Claude invented for them.
export function buildCoverageReport(mapping, { masteryBySkill = new Map(), grade = null, packs = [] } = {}) {
  const gradeKeys = grade ? [grade] : ['grade5', 'grade6'];
  const draftedPacks = draftedByPack(packs);
  const packsByOutcome = new Map();
  for (const pack of packs) {
    for (const id of pack.curriculumOutcomeIds || []) {
      if (!packsByOutcome.has(id)) packsByOutcome.set(id, []);
      packsByOutcome.get(id).push(pack);
    }
  }
  const ideas = (mapping?.organizingIdeas || []).map((idea) => {
    const grades = gradeKeys
      .filter((key) => idea.grades?.[key])
      .map((key) => {
        const entry = idea.grades[key];
        const outcomes = entry.skillsAndProcedures.map((outcome) => ({
          id: outcome.id,
          text: outcome.text,
          state: outcomeState({ ...outcome, skillIds: skillsForOutcome(outcome, packsByOutcome) }, masteryBySkill),
          skillIds: skillsForOutcome(outcome, packsByOutcome),
          note: outcome.note,
          // Content written for this outcome that is still `draft`. It does not change the state:
          // a draft pack has not been challenged, reviewed, integrated or approved, so no child can
          // meet it, and reporting the outcome as measured would claim a measurement nobody can take.
          // It changes what the row should SAY — "written, waiting for you" rather than "not built".
          // An array, as the mapping declares it — callers iterate it. The union of what the mapping
          // says and what the packs actually cite.
          ...(() => {
            const all = [...new Set([...(outcome.draftedIn || []), ...(draftedPacks.get(outcome.id) || [])])];
            return all.length ? { draftedIn: all } : {};
          })(),
        }));
        const tally = emptyTally();
        for (const outcome of outcomes) tally[outcome.state] += 1;
        return { key, grade: entry.grade, guidingQuestion: entry.guidingQuestion, learningOutcome: entry.learningOutcome, outcomes, tally, total: outcomes.length };
      });
    const tally = emptyTally();
    for (const entry of grades) for (const state of COVERAGE_STATES) tally[state] += entry.tally[state];
    return { id: idea.id, name: idea.name, statement: idea.statement, grades, tally, total: grades.reduce((sum, entry) => sum + entry.total, 0) };
  });

  const tally = emptyTally();
  for (const idea of ideas) for (const state of COVERAGE_STATES) tally[state] += idea.tally[state];

  return {
    source: mapping?.source ?? null,
    // The honesty gate. While nobody has checked the coverage decisions, the report must say so, and
    // no caller may present it as an Alberta alignment claim.
    verified: Boolean(mapping?.mappingReviewedBy),
    verificationNote: mapping?.mappingReviewedBy
      ? `Coverage decisions checked by ${mapping.mappingReviewedBy}.`
      : 'Nobody has checked these coverage decisions yet. The outcomes are the curriculum’s own words; deciding which ones this app measures was Claude’s judgement, so this is not a statement that the app covers the Alberta curriculum.',
    ideas,
    tally,
    total: ideas.reduce((sum, idea) => sum + idea.total, 0),
  };
}

// What a parent should read first. Not a score — the two numbers that actually decide what to do
// next, and the one that must not be mistaken for a gap.
export function coverageHeadline(report) {
  const { tally, total } = report;
  const measured = tally.checked + tally.needs_more_evidence;
  return {
    total,
    measured,
    checked: tally.checked,
    needsMoreEvidence: tally.needs_more_evidence,
    notBuilt: tally.not_built,
    needsParent: tally.needs_parent,
    // Said in words, because "9 of 214" invites a percentage and a percentage invites a grade.
    summary: `This app measures ${measured} of the ${total} things Alberta asks for at these grades. `
      + `${tally.not_built} more could be measured by a question with an answer key and have not been built. `
      + `${tally.needs_parent} are yours to mark — speaking, discussion, and writing that no answer key can judge.`,
  };
}

// The outcomes worth building next: machine-scorable, absent, and grouped by the organizing idea
// they belong to, so the choice is "build comprehension" rather than a list of 108 sentences.
export function buildableGaps(report) {
  return report.ideas
    .map((idea) => ({
      id: idea.id,
      name: idea.name,
      count: idea.tally.not_built,
      outcomes: idea.grades.flatMap((entry) => entry.outcomes.filter((outcome) => outcome.state === 'not_built').map((outcome) => ({ ...outcome, grade: entry.grade }))),
    }))
    .filter((idea) => idea.count > 0)
    .sort((a, b) => b.count - a.count);
}

// The gaps that already have content written for them, waiting on the parent rather than on authoring.
// Separated from `buildableGaps` so "still to write" and "written, please read" are never one number.
export function draftedGaps(report) {
  return report.ideas
    .flatMap((idea) => idea.grades.flatMap((entry) => entry.outcomes
      .filter((outcome) => outcome.draftedIn)
      .map((outcome) => ({ ...outcome, grade: entry.grade, idea: idea.name }))))
    .sort((a, b) => a.id.localeCompare(b.id));
}
