// The one pack builder.
//
// This was written three times — once in each of `packs.c0.draft.js`, `packs.c1.draft.js` and
// `packs.foundation.draft.js` — and the three copies had already drifted: only C0 honoured a row's
// `responseType`, `evaluator`, `allowReview`, `commonErrors` and per-row `version`, which are exactly
// the fields a content correction writes back. A fourth copy was about to be written for the
// punctuation, sentence and editing packs, so it is one function now.
//
// The four axes the three copies actually varied on:
//
//   prefix          `c0` / `c1` / `f1`, which sets both the pack id and every item id
//   batch           absent for C0 (it is the default), 'C1', 'F1'
//   curriculum      C1 rows name Alberta outcome ids; F1 packs deliberately name none and carry an
//                   `albertaPlacement` instead; C0 carries neither
//   statuses        C0 lets a caller override them, because its packs are pilot-approved and their
//                   recorded statuses are real; C1 and F1 are always draft
//
// Everything else was identical, including the bug surface: `difficulty` from the row index, the
// `evidenceEligibility` mapping, and the rule that a worked example is display-only and can never be
// answered.
//
// ITEM IDS ARE STABLE AND MUST STAY SO. A pilot approval, a correction record, a durable session and
// a learner's attempt history are all keyed by item id. The C0 ids this produces are byte-identical
// to the ones the old copy produced, and a test holds every one of them against a snapshot.

// Twenty-four objects per pack: two to read, six to work through together, ten to answer alone, two
// that transfer the rule to something new, and four held back for delayed review.
export const ROLE_SEQUENCE = [
  'worked_example', 'worked_example',
  ...Array(6).fill('guided'),
  ...Array(10).fill('independent'),
  ...Array(2).fill('transfer'),
  ...Array(4).fill('delayed_review'),
];

export const DEFAULT_SOURCE_IDS = ['ab-elal-2022-overview'];

export function makePack({
  prefix,
  skillId,
  title,
  rule,
  helpSteps,
  rows,
  batch,
  albertaPlacement,
  sourceIds = DEFAULT_SOURCE_IDS,
  status = 'draft_needs_independent_challenge',
  authorStatus = 'draft',
  reviewStatus = 'needs_independent_challenge',
  integrationStatus = 'not_integrated',
  ...rest
}) {
  if (rows.length !== ROLE_SEQUENCE.length) {
    throw new Error(`${skillId} must contain ${ROLE_SEQUENCE.length} rows, not ${rows.length}`);
  }
  const slug = skillId.toLowerCase();
  const packId = `${prefix}.pack.${slug}`;
  // A pack that carries an `albertaPlacement` is saying Alberta puts this below Grade 5/6; one that
  // carries outcome ids is saying it measures a Grade 5/6 outcome. Claiming both would be claiming
  // the skill is in two places at once.
  const outcomeIds = [...new Set(rows.flatMap((row) => row.outcomeIds || []))];
  if (albertaPlacement && outcomeIds.length) {
    throw new Error(`${skillId} states an Alberta placement below Grade 5 and also names Grade 5/6 outcomes`);
  }
  return {
    id: packId,
    version: 1,
    status,
    ...(batch ? { batch } : {}),
    skillId,
    title,
    rule,
    ...(albertaPlacement ? { albertaPlacement, curriculumOutcomeIds: [] } : {}),
    ...(outcomeIds.length ? { curriculumOutcomeIds: outcomeIds } : {}),
    sourceIds,
    ...rest,
    items: rows.map((row, index) => {
      const role = ROLE_SEQUENCE[index];
      // A worked example is read, never answered. It has no accepted answer at all, so there is
      // nothing for an attempt to be marked against.
      const displayOnly = role === 'worked_example';
      return {
        packId,
        id: `${prefix}.${slug}.${String(index + 1).padStart(2, '0')}`,
        // A corrected item is installed as a new version in place. The correction record stays in
        // the repository so the defect and its replacement are both auditable.
        version: row.version || 1,
        primarySkill: skillId,
        secondarySkills: [],
        role,
        difficulty: index < 8 ? 1 : index < 18 ? 2 : 3,
        prerequisites: [],
        prompt: row.prompt,
        responseType: displayOnly ? 'display' : row.responseType || 'choice',
        evaluator: displayOnly ? 'human_rubric' : row.evaluator || 'choice',
        ...(displayOnly ? { rubric: { displayOnly: true } } : { acceptedAnswers: row.acceptedAnswers }),
        ...(row.choices ? { choices: row.choices.map(([id, text]) => ({ id, text })) } : {}),
        ...(row.allowReview ? { allowReview: true } : {}),
        explanation: row.explanation,
        helpSteps,
        commonErrors: row.commonErrors || [],
        evidenceEligibility: ['independent', 'transfer', 'delayed_review'].includes(role) ? `independent_${role}` : 'instruction_only',
        transferGroup: `${slug}-${row.transferGroup || index + 1}`,
        ...(albertaPlacement ? { curriculumOutcomeIds: [], albertaPlacement } : {}),
        ...(outcomeIds.length ? { curriculumOutcomeIds: row.outcomeIds || [] } : {}),
        authorStatus,
        reviewStatus,
        integrationStatus,
        releaseStatus: 'not_released',
        sourceIds,
      };
    }),
  };
}
