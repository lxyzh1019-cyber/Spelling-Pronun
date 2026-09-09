// Content corrections and quarantine.
//
// When a review finds a teaching or grading defect, the affected item is quarantined rather than
// silently edited: it is withheld from lessons and assessments until the reviewer records that the
// correction is acceptable. Claude may propose a correction; only the named reviewer may resolve
// it. Quarantine reduces coverage, so the manifest reports it instead of hiding it.

const REQUIRED_CORRECTION_FIELDS = ['id', 'itemIds', 'reason', 'proposedBy', 'reviewer', 'reviewStatus', 'raisedAt'];
export const OPEN_CORRECTION_STATUS = 'changes_required';
export const NOT_INSTALLED_STATUS = 'correction_not_installed';

// A correction is only genuinely resolved when the replacement is actually in the content. Marking
// the record reviewed while the item is still at its old version would restore the defective
// version behind an approving status, so the item stays withheld until the new version is present.
export function correctionInstalled(correction, itemsById) {
  if (correction.reviewStatus !== 'reviewed') return false;
  if (!correction.toVersion) return true;
  return (correction.itemIds || []).every((itemId) => {
    const item = itemsById?.get?.(itemId);
    return item ? item.version === correction.toVersion : false;
  });
}

export function validateCorrections({ corrections = [], items = [] } = {}) {
  const errors = [];
  const itemIds = new Set(items.map(({ id }) => id));
  const itemsById = new Map(items.map((entry) => [entry.id, entry]));
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
  return new Set(openCorrections(corrections).flatMap((correction) => correction.itemIds || []));
}

// Stamps `correctionStatus` onto the affected items so every consumer can see the quarantine
// without having to know about the corrections file. An item stays withheld both while its
// correction is open and while a resolved correction's replacement has not been installed.
export function applyCorrections(items = [], corrections = []) {
  const itemsById = new Map(items.map((entry) => [entry.id, entry]));
  const status = new Map();
  for (const correction of corrections) {
    if (correction.reviewStatus === OPEN_CORRECTION_STATUS) {
      for (const itemId of correction.itemIds || []) status.set(itemId, OPEN_CORRECTION_STATUS);
    } else if (correction.reviewStatus === 'reviewed' && !correctionInstalled(correction, itemsById)) {
      for (const itemId of correction.itemIds || []) if (!status.has(itemId)) status.set(itemId, NOT_INSTALLED_STATUS);
    }
  }
  return items.map((item) => (status.has(item.id) ? { ...item, correctionStatus: status.get(item.id) } : item));
}

export function isQuarantined(item) {
  return item?.correctionStatus === OPEN_CORRECTION_STATUS || item?.correctionStatus === NOT_INSTALLED_STATUS;
}

export function usableItems(items = []) {
  return items.filter((item) => !isQuarantined(item));
}
