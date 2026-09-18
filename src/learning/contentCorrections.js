// Content corrections and quarantine.
//
// When a review finds a teaching or grading defect, the affected item is quarantined rather than
// silently edited: it is withheld from lessons and assessments until the reviewer records that the
// correction is acceptable. Claude may propose a correction; only the named reviewer may resolve
// it. Quarantine reduces coverage, so the manifest reports it instead of hiding it.

const REQUIRED_CORRECTION_FIELDS = ['id', 'itemIds', 'reason', 'proposedBy', 'reviewer', 'reviewStatus', 'raisedAt'];
export const OPEN_CORRECTION_STATUS = 'changes_required';
export const NOT_INSTALLED_STATUS = 'correction_not_installed';

// How bad the finding is, which decides whether the item is withheld while the fix waits.
//
// `defect` is the default, so every record written before this field existed keeps exactly the
// behaviour it had. It means the item teaches or grades something wrong — "Falling rocks." called a
// complete sentence, `watch` described with the vowel of `cat`, a prompt that supplied the
// pronunciation it was testing. A child must not meet it while the fix is pending.
//
// `improvement` means the item is correct but weak: a fragment that happens to be the only option
// without an end mark, a question with two options where three would measure better, a distractor no
// one would pick. Nothing it teaches is false. Withholding it would empty the lessons and protect
// nobody, so the item keeps running and the drafted replacement waits for the reviewer.
//
// This never softens a defect. A correction that does not say which it is counts as a defect.
export const CORRECTION_SEVERITY = { DEFECT: 'defect', IMPROVEMENT: 'improvement' };

export function withholdsWhileOpen(correction) {
  return (correction?.severity || CORRECTION_SEVERITY.DEFECT) !== CORRECTION_SEVERITY.IMPROVEMENT;
}

// A correction is only genuinely resolved when the replacement is actually in the content. Marking
// the record reviewed while the item is still at its old version would restore the defective
// version behind an approving status, so the item stays withheld until the new version is present.
// A correction may name items, episodes, or both. An episode is not an item — it carries its own
// version and lives in the story file — but the rule is identical: the record is not installed until
// the thing it names is at the replacement version. `corr.c0.013` names only episodes, and judging it
// against items alone would have made it unverifiable in exactly the direction that matters.
export function correctionScopeIds(correction) {
  return [...(correction?.itemIds || []), ...(correction?.episodeIds || [])];
}

export function correctionInstalled(correction, itemsById) {
  if (correction.reviewStatus !== 'reviewed') return false;
  if (!correction.toVersion) return true;
  // Judge only the items this content actually contains. A correction can span two packs — the
  // 2026-09-17 audit's option-count record covers the punctuation pack and the pronoun pack together
  // — and a pack is applied to its own items, so it can see only half of one. Treating the half it
  // cannot see as "not installed" would withhold the half it can, at full version, for no reason.
  // An unknown item id is not excused by this: `validateCorrections` rejects one outright.
  const visible = correctionScopeIds(correction).map((scopeId) => itemsById?.get?.(scopeId)).filter(Boolean);
  if (!visible.length) return false;
  return visible.every((entry) => entry.version === correction.toVersion);
}

export function validateCorrections({ corrections = [], items = [], episodes = [] } = {}) {
  const errors = [];
  const scopes = [...items, ...episodes];
  const itemIds = new Set(scopes.map(({ id }) => id));
  const itemsById = new Map(scopes.map((entry) => [entry.id, entry]));
  const seen = new Set();
  for (const correction of corrections) {
    const label = correction.id || 'unknown correction';
    const missing = REQUIRED_CORRECTION_FIELDS.filter((field) => correction[field] === undefined || correction[field] === null || correction[field] === '');
    if (missing.length) errors.push(`${label} is missing ${missing.join(', ')}`);
    if (seen.has(correction.id)) errors.push(`${label} is recorded more than once`);
    seen.add(correction.id);
    for (const scopeId of correctionScopeIds(correction)) {
      if (scopes.length && !itemIds.has(scopeId)) errors.push(`${label} targets unknown item ${scopeId}`);
    }
    if (!['changes_required', 'reviewed', 'withdrawn'].includes(correction.reviewStatus)) {
      errors.push(`${label} has an unsupported correction status`);
    }
    if (correction.severity !== undefined && !Object.values(CORRECTION_SEVERITY).includes(correction.severity)) {
      errors.push(`${label} has an unsupported severity`);
    }
    // The author of a correction can never be its reviewer: proposing and checking are separate
    // passes, exactly as the content governance protocol requires.
    if (correction.reviewStatus === 'reviewed' && correction.reviewedBy === correction.proposedBy) {
      errors.push(`${label} cannot be reviewed by the role that proposed it`);
    }
    if (correction.reviewStatus === 'reviewed' && !correction.reviewedBy) {
      errors.push(`${label} is marked reviewed without recording who reviewed it`);
    }
    if (correction.reviewStatus === 'reviewed' && items.length && !correctionInstalled(correction, itemsById)) {
      errors.push(`${label} is marked reviewed but its version ${correction.toVersion} replacement is not installed`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function openCorrections(corrections = []) {
  return corrections.filter((correction) => correction.reviewStatus === OPEN_CORRECTION_STATUS);
}

export function quarantinedItemIds(corrections = []) {
  return new Set(openCorrections(corrections).filter(withholdsWhileOpen).flatMap((correction) => correction.itemIds || []));
}

// Stamps `correctionStatus` onto the affected items so every consumer can see the quarantine
// without having to know about the corrections file. An item stays withheld both while its
// correction is open and while a resolved correction's replacement has not been installed.
export function applyCorrections(items = [], corrections = []) {
  const itemsById = new Map(items.map((entry) => [entry.id, entry]));
  const status = new Map();
  for (const correction of corrections) {
    if (correction.reviewStatus === OPEN_CORRECTION_STATUS) {
      // An improvement leaves the item running: see CORRECTION_SEVERITY.
      if (!withholdsWhileOpen(correction)) continue;
      for (const itemId of correction.itemIds || []) status.set(itemId, OPEN_CORRECTION_STATUS);
    } else if (correction.reviewStatus === 'reviewed' && !correctionInstalled(correction, itemsById)) {
      for (const itemId of correction.itemIds || []) if (!status.has(itemId)) status.set(itemId, NOT_INSTALLED_STATUS);
    }
  }
  return items.map((item) => (status.has(item.id) ? { ...item, correctionStatus: status.get(item.id) } : item));
}

// Installing a resolved correction's replacement text.
//
// Marking a correction `reviewed` is not enough: `correctionInstalled` requires the item to be at
// the correction's `toVersion`, so a record whose replacement never landed keeps its items withheld
// rather than restoring the defective version behind an approving status. This is the function that
// makes the replacement land. It is deliberately narrow — it replaces the parts a correction may
// rewrite and bumps the version, and it cannot invent an item that does not exist, because a
// replacement keyed to a typo would otherwise vanish silently instead of failing.
//
// The version bump is the point. An item edited in place at the same version would let a reviewer's
// approval appear to fix content that never changed.
export function installReplacements(items = [], replacements = {}, { toVersion = 2 } = {}) {
  const known = new Set(items.map((item) => item.id));
  for (const id of Object.keys(replacements)) {
    if (!known.has(id)) throw new Error(`installReplacements: ${id} is not an item in this content`);
  }
  return items.map((item) => {
    const replacement = replacements[item.id];
    if (!replacement) return item;
    const { answer, choices, ...rest } = replacement;
    return {
      ...item,
      ...rest,
      ...(choices ? { choices: choices.map(([id, text]) => ({ id, text })) } : {}),
      ...(answer ? { acceptedAnswers: [answer] } : {}),
      version: toVersion,
    };
  });
}

export function isQuarantined(item) {
  return item?.correctionStatus === OPEN_CORRECTION_STATUS || item?.correctionStatus === NOT_INSTALLED_STATUS;
}

export function usableItems(items = []) {
  return items.filter((item) => !isQuarantined(item));
}
