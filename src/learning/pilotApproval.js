import { isQuarantined } from './contentCorrections.js';
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
    // An approval may name a subset of prompts. That is how a form whose Part A still depends on
    // unchecked audio can contribute its usable Part B prompts without the rest riding along.
    const allItems = scope.items || [];
    const items = approval.itemIds ? allItems.filter((entry) => approval.itemIds.includes(entry.id)) : allItems;
    for (const itemId of approval.itemIds || []) {
      if (!allItems.some((entry) => entry.id === itemId)) errors.push(`${label} pilot approval names ${itemId}, which is not part of it`);
    }
    for (const item of items) {
      if (item.reviewStatus !== 'reviewed' || item.integrationStatus !== 'integrated') {
        errors.push(`${label} cannot be pilot-approved while ${item.id} is not reviewed and integrated`);
        break;
      }
      if (isQuarantined(item)) {
        errors.push(`${label} cannot be pilot-approved while ${item.id} has an unresolved correction or an uninstalled replacement`);
        break;
      }
      if (dependsOnUncheckedAudio(item)) {
        errors.push(`${label} cannot be pilot-approved while ${item.id} depends on audio that has not been listened to`);
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

// An answer the learner can only give by listening needs its audio checked by a person first.
// Synthesis can render an invented word or a minimal pair differently from the intended reading,
// and the learner would be marked wrong for the voice rather than for their answer.
export function dependsOnUncheckedAudio(item) {
  const usesAudio = Boolean(item.spokenText) || (item.choices || []).some((choice) => choice.spokenText);
  return usesAudio && item.audioStatus === 'synthetic_preview';
}

export function pilotApprovalFor(approvals = [], scopeId) {
  return approvals.find((approval) => approval.scopeId === scopeId && approval.decision === 'approved') || null;
}

// Resolves the status an item should carry given the pilot approval covering it. Release status is
// never upgraded here: released content stays released, and unapproved content keeps its own
// status. Accepts either the approval records or a plain list of approved scope ids.
export function applyPilotApproval(item, approvals = [], scopeId = null) {
  if (item.releaseStatus === 'released') return item;
  const id = scopeId ?? item.packId ?? item.formId ?? item.scopeId;
  const records = approvals.map((entry) => (typeof entry === 'string' ? { scopeId: entry, decision: 'approved' } : entry));
  const approval = pilotApprovalFor(records, id);
  if (!approval) return item;
  if (approval.itemIds && !approval.itemIds.includes(item.id)) return item;
  if (item.reviewStatus !== 'reviewed' || item.integrationStatus !== 'integrated') return item;
  if (isQuarantined(item)) return item;
  if (dependsOnUncheckedAudio(item)) return item;
  return { ...item, releaseStatus: 'pilot_approved' };
}

// Episodes carry their own lifecycle rather than a list of items.
export function applyPilotApprovalToEpisode(episode, approvals = []) {
  if (episode.releaseStatus === 'released') return episode;
  if (!pilotApprovalFor(approvals, episode.id)) return episode;
  if (episode.reviewStatus !== 'reviewed' || episode.integrationStatus !== 'integrated') return episode;
  return { ...episode, releaseStatus: 'pilot_approved' };
}
