// Content corrections and quarantine.
//
// When a review finds a teaching or grading defect, the affected item is quarantined rather than
// silently edited: it is withheld from lessons and assessments until the reviewer records that the
// correction is acceptable. Claude may propose a correction; only the named reviewer may resolve
// it. Quarantine reduces coverage, so the manifest reports it instead of hiding it.

const REQUIRED_CORRECTION_FIELDS = ['id', 'itemIds', 'reason', 'proposedBy', 'reviewer', 'reviewStatus', 'raisedAt'];
export const OPEN_CORRECTION_STATUS = 'changes_required';

export function validateCorrections({ corrections = [], items = [] } = {}) {
  const errors = [];
  const itemIds = new Set(items.map(({ id }) => id));
  const seen = new Set();
  for (const correction of corrections) {
    const label = correction.id || 'unknown correction';
    const missing = REQUIRED_CORRECTION_FIELDS.filter((field) => correction[field] === undefined || correction[field] === null || correction[field] === '');
    if (missing.length) errors.push(`${label} is missing ${missing.join(', ')}`);
    if (seen.has(correction.id)) errors.push(`${label} is recorded more than once`);
    seen.add(correction.id);
    for (const itemId of correction.itemIds || []) {
      if (items.length && !itemIds.has(itemId)) errors.push(`${label} targets unknown item ${itemId}`);
    }
    if (!['changes_required', 'reviewed', 'withdrawn'].includes(correction.reviewStatus)) {
      errors.push(`${label} has an unsupported correction status`);
    }
    // The author of a correction can never be its reviewer: proposing and checking are separate
    // passes, exactly as the content governance protocol requires.
    if (correction.reviewStatus === 'reviewed' && correction.reviewedBy === correction.proposedBy) {
      errors.push(`${label} cannot be reviewed by the role that proposed it`);
    }
    if (correction.reviewStatus === 'reviewed' && !correction.reviewedBy) {
      errors.push(`${label} is marked reviewed without recording who reviewed it`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function openCorrections(corrections = []) {
  return corrections.filter((correction) => correction.reviewStatus === OPEN_CORRECTION_STATUS);
}

export function quarantinedItemIds(corrections = []) {
  return new Set(openCorrections(corrections).flatMap((correction) => correction.itemIds || []));
}

// Stamps `correctionStatus` onto the affected items so every consumer can see the quarantine
// without having to know about the corrections file.
export function applyCorrections(items = [], corrections = []) {
  const quarantined = quarantinedItemIds(corrections);
  return items.map((item) => (quarantined.has(item.id) ? { ...item, correctionStatus: OPEN_CORRECTION_STATUS } : item));
}

export function isQuarantined(item) {
  return item?.correctionStatus === OPEN_CORRECTION_STATUS;
}

export function usableItems(items = []) {
  return items.filter((item) => !isQuarantined(item));
}
