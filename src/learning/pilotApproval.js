// Approved-for-private-pilot state.
//
// The master plan's release lifecycle had a circular dependency: content could not enter delayed
// review until it was released, release required learner testing, and the pilot was the learner
// test. `pilot_approved` breaks it. Reviewed and integrated content a parent has explicitly
// approved may run the complete learning loop — including mastery derivation and the delayed
// review queue — but every attempt it produces is recorded as PILOT evidence, kept in its own
// record, and never merged with released evidence or presented as validated progress.

export const CONTENT_LIFECYCLE = [
  'draft',
  'schema_valid',
  'independently_challenged',
  'reviewed',
  'integrated',
  'pilot_approved',
  'learner_tested',
  'released',
];

export const EVIDENCE_TRACKS = { RELEASED: 'released', PILOT: 'pilot' };

export function contentStatusesForTrack(track) {
  return track === EVIDENCE_TRACKS.PILOT ? ['pilot_approved'] : ['released'];
}

export function attemptIsInTrack(attempt, track = EVIDENCE_TRACKS.RELEASED) {
  return contentStatusesForTrack(track).includes(attempt?.contentStatus);
}

// A pilot approval is a recorded parent decision about one pack, assessment form, or episode.
// Nothing becomes pilot-eligible without a matching record, and the record must name who decided
// and when, so a pilot can never be claimed retroactively.
const REQUIRED_APPROVAL_FIELDS = ['scopeId', 'scopeType', 'decision', 'decidedBy', 'decidedAt'];

export function validatePilotApprovals({ approvals = [], packs = [], assessmentForms = [], episodes = [] } = {}) {
  const errors = [];
  const packById = new Map(packs.map((pack) => [pack.id, pack]));
  const formById = new Map(assessmentForms.map((form) => [form.id, form]));
  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const seen = new Set();

  for (const approval of approvals) {
    const label = approval.scopeId || 'unknown approval';
    const missing = REQUIRED_APPROVAL_FIELDS.filter((field) => !approval[field]);
    if (missing.length) errors.push(`${label} pilot approval is missing ${missing.join(', ')}`);
    if (seen.has(approval.scopeId)) errors.push(`${label} has more than one pilot approval record`);
    seen.add(approval.scopeId);
    if (approval.decidedBy !== 'parent') errors.push(`${label} pilot approval must be decided by the parent`);
    if (!['approved', 'declined'].includes(approval.decision)) errors.push(`${label} has an unsupported pilot decision`);

    const scope = packById.get(approval.scopeId) || formById.get(approval.scopeId) || episodeById.get(approval.scopeId);
    if (!scope) {
      errors.push(`${label} pilot approval targets unknown content`);
      continue;
    }
    if (approval.scopeVersion !== undefined && approval.scopeVersion !== scope.version) {
      errors.push(`${label} pilot approval targets version ${approval.scopeVersion}, current version is ${scope.version}`);
    }
    if (approval.decision !== 'approved') continue;
    const items = scope.items || [];
    for (const item of items) {
      if (item.reviewStatus !== 'reviewed' || item.integrationStatus !== 'integrated') {
        errors.push(`${label} cannot be pilot-approved while ${item.id} is not reviewed and integrated`);
        break;
      }
      if (item.correctionStatus === 'changes_required') {
        errors.push(`${label} cannot be pilot-approved while ${item.id} has an open correction`);
        break;
      }
    }
    if (!items.length && scope.reviewStatus !== 'reviewed') {
      errors.push(`${label} cannot be pilot-approved before its own review is complete`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function approvedPilotScopeIds(approvals = []) {
  return approvals.filter((approval) => approval.decision === 'approved').map(({ scopeId }) => scopeId);
}

// Resolves the status an item should carry given the pilot approvals. Release status is never
// upgraded here: released content stays released, and unapproved content keeps its own status.
export function applyPilotApproval(item, approvedScopeIds = []) {
  if (item.releaseStatus === 'released') return item;
  if (!approvedScopeIds.includes(item.packId) && !approvedScopeIds.includes(item.formId) && !approvedScopeIds.includes(item.scopeId)) return item;
  if (item.reviewStatus !== 'reviewed' || item.integrationStatus !== 'integrated') return item;
  if (item.correctionStatus === 'changes_required') return item;
  return { ...item, releaseStatus: 'pilot_approved' };
}
