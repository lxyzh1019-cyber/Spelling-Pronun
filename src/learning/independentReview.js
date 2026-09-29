// Review state for the batches written after C0, derived from the records rather than typed.
//
// Until R7 a batch pack's `reviewStatus` and `integrationStatus` could only be what its source file
// said, and the source files said draft. The C0 packs set theirs by hand. Setting them by hand for
// the batches would mean a status nobody can check: an item could be edited after its review and
// still say "reviewed".
//
// So a batch item is `reviewed` and `integrated` only when ALL of these hold, at its CURRENT state:
//
//   1. the separate content challenge recorded a pass for it at exactly this item version, and the
//      content it saw (its fingerprint) is the content the item has now;
//   2. the separate educational and source pass recorded the same, and passed the content;
//   3. both records saw this pack at this pack version with this rule, help and sources;
//   4. the parent recorded an educational verdict of approved for this pack at this version; and
//   5. the parent countersigned the integration record for this pack at this version.
//
// Anything short of that, for ANY item in the pack, leaves the whole pack exactly as its source file
// built it. Editing a question without a re-review changes its fingerprint, so its pack drops back
// to draft on the next build and off the learner route; bumping its version without a re-review does
// the same.
//
// The fingerprint is not cryptographic. It only has to notice an accidental edit, not resist a
// forged one, and it has to run in the browser, where node:crypto does not.

// cyrb53, a small public-domain 53-bit string hash.
function cyrb53(text, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const fingerprint = (value) => {
  const text = JSON.stringify(value);
  return `cyrb53x2:${cyrb53(text, 0)}${cyrb53(text, 1)}`;
};

// Everything a reviewer judged about one question, and nothing about its lifecycle state.
export function itemFingerprint(item) {
  return fingerprint({
    id: item.id,
    version: item.version,
    role: item.role,
    prompt: item.prompt,
    responseType: item.responseType,
    evaluator: item.evaluator,
    acceptedAnswers: item.acceptedAnswers || null,
    choices: item.choices || null,
    allowReview: item.allowReview || false,
    explanation: item.explanation,
    commonErrors: item.commonErrors || [],
  });
}

// What a reviewer judged about the pack as a whole: the rule and help it teaches from, and the
// sources and placement it claims.
export function packFingerprint(pack) {
  return fingerprint({
    id: pack.id,
    version: pack.version,
    skillId: pack.skillId,
    title: pack.title,
    rule: pack.rule,
    helpSteps: pack.items?.[0]?.helpSteps || [],
    sourceIds: pack.sourceIds || [],
    albertaPlacement: pack.albertaPlacement || null,
    curriculumOutcomeIds: pack.curriculumOutcomeIds || [],
  });
}

const REQUIRED_STAGES = ['independent_challenge', 'educational_source_review'];

// Why this pack, as it stands, is or is not covered. An empty list means covered.
export function packReviewGaps(pack, evidence = {}) {
  const gaps = [];
  const fp = packFingerprint(pack);
  for (const stage of REQUIRED_STAGES) {
    const entry = (evidence.agentReviews || [])
      .filter((review) => review.stage === stage && review.humanReviewer === false)
      .flatMap((review) => review.packs || [])
      .find((candidate) => candidate.packId === pack.id);
    if (!entry) gaps.push(`${stage}: no record for ${pack.id}`);
    else {
      if (entry.packVersion !== pack.version) gaps.push(`${stage}: reviewed ${pack.id} at version ${entry.packVersion}, it is now ${pack.version}`);
      if (entry.packFingerprint !== fp) gaps.push(`${stage}: ${pack.id} rule, help or sources changed since the review`);
      if (stage === 'educational_source_review' && entry.contentOutcome !== 'pass') gaps.push(`${stage}: content did not pass for ${pack.id}`);
    }
  }
  const verdict = (evidence.parentVerdicts || []).find((entry) => entry.packId === pack.id);
  if (!verdict || verdict.verdict !== 'approved' || verdict.reviewedBy !== 'parent' || !verdict.reviewedAt || !verdict.basis) gaps.push(`no parent educational verdict for ${pack.id}`);
  else if (verdict.packVersion !== pack.version) gaps.push(`the parent's verdict covers ${pack.id} version ${verdict.packVersion}, it is now ${pack.version}`);
  const countersigned = (evidence.parentCountersignatures || []).find((entry) => entry.packId === pack.id);
  if (!countersigned || countersigned.countersignedBy !== 'parent' || !countersigned.countersignedAt || !countersigned.basis) gaps.push(`no parent countersignature on the integration of ${pack.id}`);
  else if (countersigned.packVersion !== pack.version) gaps.push(`the parent countersigned ${pack.id} version ${countersigned.packVersion}, it is now ${pack.version}`);
  return gaps;
}

// Why this item, as it stands, is or is not covered by both agent records.
export function itemReviewGaps(item, evidence = {}) {
  const gaps = [];
  const fp = itemFingerprint(item);
  for (const stage of REQUIRED_STAGES) {
    const result = (evidence.agentReviews || [])
      .filter((review) => review.stage === stage && review.humanReviewer === false)
      .flatMap((review) => review.packs || [])
      .flatMap((pack) => pack.results || [])
      .find((candidate) => candidate.itemId === item.id);
    if (!result) gaps.push(`${stage}: no result for ${item.id}`);
    else {
      if (result.outcome !== 'pass') gaps.push(`${stage}: ${item.id} did not pass`);
      if (result.itemVersion !== item.version) gaps.push(`${stage}: ${item.id} was reviewed at version ${result.itemVersion}, it is now ${item.version}`);
      if (result.contentFingerprint !== fp) gaps.push(`${stage}: ${item.id} changed since it was reviewed`);
    }
  }
  return gaps;
}

// The one place a batch item's review state moves. It only ever raises a draft pack to reviewed and
// integrated; it never lowers anything, so fixtures and C0 are untouched.
//
// All or nothing, per pack. A lesson opens when its independent questions are approved, but it also
// serves the worked examples and guided items; raising item by item would let one edited guided item
// drop to draft while the lesson stayed open and kept showing it. So one uncovered item keeps the
// whole pack at draft.
export function applyReviewEvidence(pack, evidence = {}) {
  if (packReviewGaps(pack, evidence).length) return pack;
  if (pack.items.some((item) => itemReviewGaps(item, evidence).length)) return pack;
  return {
    ...pack,
    status: 'integrated',
    items: pack.items.map((item) => ({ ...item, authorStatus: 'reviewed', reviewStatus: 'reviewed', integrationStatus: 'integrated' })),
  };
}
