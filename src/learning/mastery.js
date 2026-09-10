import { evidenceEligible } from './evaluators.js';
import { EVIDENCE_TRACKS, attemptIsInTrack } from './pilotApproval.js';

const DAY_MS = 86_400_000;
export const REGRESSION_WINDOW = 5;
export const REGRESSION_FAILURES = 2;

// `track` selects the evidence record. Pilot evidence is derived with the same rules but kept in
// its own record, so it can never be read as validated released progress.
export function deriveMastery(attempts, { derivationVersion = 2, track = EVIDENCE_TRACKS.RELEASED } = {}) {
  const eligible = attempts.filter((attempt) => attemptIsInTrack(attempt, track) && evidenceEligible(attempt)).sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
  if (!eligible.length) return { status: 'unassessed', track, derivationVersion, eligibleCount: 0, needsReview: false };
  const correct = eligible.filter((attempt) => attempt.correct);
  const sessions = new Set(correct.map((attempt) => attempt.sessionId));
  const dates = new Set(correct.map((attempt) => attempt.edmontonDate));
  const unseenCount = correct.filter((attempt) => attempt.unseen).length;
  const transfer = correct.some((attempt) => attempt.evidenceType === 'independent_transfer');
  const firstSuccess = correct[0] && new Date(correct[0].eventTime);
  const delayedReview = correct.some((attempt) => attempt.evidenceType === 'delayed_review' && firstSuccess && new Date(attempt.eventTime) - firstSuccess >= 7 * DAY_MS);
  const recent = eligible.slice(-REGRESSION_WINDOW);
  const recentFailures = recent.filter((attempt) => !attempt.correct).length;
  // Two independent failures within the last five eligible attempts place the skill back in
  // review. History is never erased; only the derived status is capped.
  const needsReview = recentFailures >= REGRESSION_FAILURES;
  const accuracy = correct.length / eligible.length;

  let status = 'learning';
  if (correct.length >= 3) status = 'developing';
  if (eligible.length >= 10 && correct.length >= 9 && accuracy >= 0.9 && sessions.size >= 2 && dates.size >= 2 && unseenCount >= 3 && transfer && delayedReview) status = 'secure';
  if (needsReview && status === 'secure') status = 'developing';
  return { status, track, needsReview, recentFailures, derivationVersion, eligibleCount: eligible.length, correctCount: correct.length, accuracy, sessionCount: sessions.size, dateCount: dates.size, unseenCount, hasTransfer: transfer, hasDelayedReview: delayedReview };
}

// Splits a learner's attempts for one skill into the buckets a progress screen may show. Released
// evidence is the only kind that feeds `deriveMastery`; pilot evidence is kept separate so it is
// never presented as validated progress, and everything else is explicitly not counted.
export function summarizeSkillEvidence(attempts = []) {
  const recorded = attempts.length;
  const released = attempts.filter((attempt) => attempt.contentStatus === 'released' && evidenceEligible(attempt)).length;
  const pilot = attempts.filter((attempt) => attempt.contentStatus === 'pilot_approved' && evidenceEligible(attempt)).length;
  return { recorded, released, pilot, notCounted: recorded - released - pilot };
}

// The whole progress screen as data. Keeping it here means the rules about what a learner is told
// they have achieved are testable without rendering anything.
export function buildProgressView({ skills = [], attempts = [], masteryBySkill = {}, pilotMasteryBySkill = {}, pilotScopeIds = [] } = {}) {
  const pilotMode = pilotScopeIds.length > 0;
  // A pending answer is waiting for a person to read it. It is neither right nor wrong, so it is
  // reported on its own rather than folded into either count.
  const pendingCount = attempts.filter((attempt) => attempt.status === 'pending' && !attempt.omitted && !attempt.technicalFailure).length;
  const rows = skills.map((skill) => {
    const skillAttempts = attempts.filter((attempt) => attempt.skillIds?.includes(skill.id));
    const mastery = masteryBySkill[skill.id];
    const pilotMastery = pilotMasteryBySkill[skill.id];
    const showPilotRow = pilotMode && (pilotMastery?.eligibleCount || 0) > 0;
    return {
      skillId: skill.id,
      track: skill.track,
      status: mastery?.status || 'not_started',
      needsReview: Boolean(mastery?.needsReview),
      evidence: summarizeSkillEvidence(skillAttempts),
      showPilotRow,
      pilotStatus: showPilotRow ? pilotMastery.status : null,
    };
  });
  return { pilotMode, pendingCount, rows };
}

// Not every attempt names a skill. A word-game attempt from `createAttempt` has
// none at all, and neither does anything written before the field existed; both
// reach the app once cloud attempts are merged. Such an attempt is evidence for
// no skill, which is correct — but reading through the missing field threw, and
// a throw inside a provider-level memo blanked the whole app (DEF-31).
export function attemptsForSkill(attempts = [], skillId) {
  return attempts.filter((attempt) => (attempt?.skillIds || []).includes(skillId));
}
