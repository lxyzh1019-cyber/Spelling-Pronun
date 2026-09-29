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

// Three questions, and the reading of them. All right is solid (3 of 3). Exactly one wrong among the
// answers given is partly solid (2 of 3): something is there, with a thin patch. Anything worse — none
// right, or two or more wrong (0 or 1 of 3) — needs building. Fewer than two answered is not enough
// evidence to say.
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
    //
    // `chose` is the text of the answer that was picked, resolved from the item's own choices. It
    // says where the idea went wrong rather than only that it did — and it is never invented: an
    // answer recorded without a `choiceId` carries no `chose` at all.
    else {
      const chose = item.choices?.find((choice) => choice.id === attempt.choiceId)?.text;
      entry.locates.push({
        itemId: item.id,
        locates: item.locates,
        probesGrade: item.probesGrade,
        ...(chose ? { chose } : {}),
      });
    }
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
  // `needing` is both groups together and keeps its old shape; the two groups are also kept apart
  // because the text has to name them apart to agree with `counts`.
  const needing = skills.filter((skill) => skill.state === 'needs_building' || skill.state === 'partly_solid');

  return {
    formId: form?.id || null,
    // Stated in the output, not only in a comment, so anything reading this cannot mistake it.
    producesMasteryEvidence: false,
    masteryNote: 'This locates gaps; it is not mastery evidence. Every question in it is draft content, and draft content can never count as independent evidence however it is answered.',
    // How much of the form this reading is built on. A child can stop anywhere, and without these
    // two numbers nine questions and forty-eight questions produce reports that read the same.
    itemCount: items.length,
    answeredCount: answers.length,
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
  const ids = (list) => list.map((skill) => skill.skillId);
  const needsBuilding = needing.filter((skill) => skill.state === 'needs_building');
  const partlySolid = needing.filter((skill) => skill.state === 'partly_solid');
  const groups = { needing: ids(needing), needsBuilding: ids(needsBuilding), partlySolid: ids(partlySolid) };
  // The two groups, worded apart, so no number in the text disagrees with the counts line.
  const parts = [];
  if (needsBuilding.length) parts.push(`${needsBuilding.length} ${needsBuilding.length === 1 ? 'needs' : 'need'} building (${groups.needsBuilding.join(', ')})`);
  if (partlySolid.length) parts.push(`${partlySolid.length} ${partlySolid.length === 1 ? 'is' : 'are'} partly solid (one wrong answer: ${groups.partlySolid.join(', ')})`);
  const described = parts.join(' and ');
  if (measured.length < Math.ceil(skillCount / 2)) {
    return {
      answer: 'not_enough_evidence',
      detail: `Only ${measured.length} of ${skillCount} skills have been answered. The question of whether a separate catch-up app is needed is a question about the shape of the gap, and there is not enough of the form done yet to see a shape.`,
      ...groups,
    };
  }
  const share = needing.length / measured.length;
  if (needing.length === 0) {
    return { answer: 'no_gap_found', detail: 'Nothing in this form came back needing to be built. Whatever else is worth doing, catching up on these sixteen skills is not it.', ...groups };
  }
  if (share <= 0.5) {
    return {
      answer: 'build_packs_here',
      detail: `Of the ${measured.length} skills answered, ${described}. That is a scattered gap, not a wholesale one, so it is a few packs inside this app rather than a separate one — and keeping it here means one record of what the child can do instead of two.`,
      ...groups,
    };
  }
  return {
    answer: 'reconsider_scope',
    detail: `Of the ${measured.length} skills answered, ${described}. That is most of the form, which is a different situation from a few specific gaps and worth talking about before building anything: a run of packs at this size is a curriculum, not a patch.`,
    ...groups,
  };
}

// The report as text the parent can paste into the next conversation. The answers live only in the
// browser that recorded them, so without this the result never leaves the iPad. Same wording rules as
// the report itself: it names what to build, never grades the child, and it says which learner it is
// for, because the parent page shows whichever child is selected there.
const STATE_LABELS = {
  solid: 'solid',
  partly_solid: 'partly solid',
  needs_building: 'needs building',
  not_enough_evidence: 'not enough evidence yet',
};

// The two or three lines that go first, so a report sent as a message says what it found before the
// reader has scrolled anywhere. It carries the completion count because that is the one thing a
// reader cannot infer: a part-way run and a finished one look identical without it.
export function diagnosticSummaryLine(report) {
  if (!report) return '';
  const needsBuilding = report.separateAppQuestion?.needsBuilding || [];
  const partlySolid = report.separateAppQuestion?.partlySolid || [];
  const lines = [`${report.answeredCount ?? 0} of ${report.itemCount ?? 0} answered.`];
  if (needsBuilding.length) lines.push(`Needs building: ${needsBuilding.join(', ')}.`);
  if (partlySolid.length) lines.push(`Partly solid (one wrong answer): ${partlySolid.join(', ')}.`);
  if (!needsBuilding.length && !partlySolid.length) lines.push('Nothing answered so far came back needing to be built.');
  lines.push((report.answeredCount ?? 0) < (report.itemCount ?? 0)
    ? 'This is a part-way run. The questions nobody answered say nothing either way.'
    : 'The whole form is answered.');
  return lines.join('\n');
}

export function diagnosticReportMarkdown(report, { learnerName = '', today = '' } = {}) {
  if (!report) return '';
  const who = learnerName || 'the selected learner';
  const lines = [
    `# Below-grade diagnostic — what it found for ${who}`,
    '',
    `Exported ${today || 'today'}. Form ${report.formId || 'unknown'}.`,
    `This section is for ${who} only.`,
    '',
    diagnosticSummaryLine(report),
    '',
    report.masteryNote,
    '',
    '## The separate-app question',
    '',
    report.separateAppQuestion?.detail || '',
    '',
    `${report.counts?.solid ?? 0} solid · ${report.counts?.partly_solid ?? 0} partly solid · ${report.counts?.needs_building ?? 0} need building · ${report.counts?.not_enough_evidence ?? 0} not answered yet`,
    '',
    '## Skill by skill',
    '',
  ];
  for (const skill of report.skills || []) {
    lines.push(`### ${skill.skillId} — ${STATE_LABELS[skill.state] || skill.state}`);
    const finishes = skill.albertaFinishesAt ? ` Alberta finishes with this at ${skill.albertaFinishesAt}.` : '';
    lines.push(`${skill.correct} of ${skill.answered} right.${finishes}`);
    if (skill.locates?.length) {
      for (const located of skill.locates) {
        lines.push(`- (${located.probesGrade}) ${located.locates}${located.chose ? ` — chose "${located.chose}"` : ''}`);
      }
    } else {
      lines.push('Nothing located.');
    }
    lines.push('');
  }
  lines.push('Paste this into the next conversation. It locates gaps in content; it is not a judgement of the child and it is not mastery evidence.');
  return lines.join('\n');
}

// Every child who has answered, in one document — because the alternative was exporting one child,
// switching profiles, and exporting again, which is how a second child's result gets forgotten.
//
// Putting children in one document is also the place a ranking would appear, so this deliberately
// does none of the things that would make one: no count across children, no sum, no ordering by
// result. `entries` are emitted in the order they are given, which is the order the profiles are in
// on the device, and each child's section is the unchanged output of `diagnosticReportMarkdown` —
// the same words they would get on their own.
export function combinedDiagnosticReportMarkdown(entries = [], { today = '' } = {}) {
  const rows = (entries || []).filter((entry) => entry?.report);
  if (!rows.length) return '';
  const lines = [
    '# Below-grade diagnostic — what it found',
    '',
    `Exported ${today || 'today'}. Every child who has answered has their own section below, in the order they appear on this device.`,
    'Each section reads on its own. What one child needs built says nothing about another.',
    '',
  ];
  for (const row of rows) {
    lines.push('---', '', diagnosticReportMarkdown(row.report, { learnerName: row.learnerName, today }), '');
  }
  return lines.join('\n');
}
