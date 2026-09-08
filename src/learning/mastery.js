import { evidenceEligible } from './evaluators.js';

const DAY_MS = 86_400_000;
export const REGRESSION_WINDOW = 5;
export const REGRESSION_FAILURES = 2;

export function deriveMastery(attempts, { derivationVersion = 2 } = {}) {
  const eligible = attempts.filter(evidenceEligible).sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
  if (!eligible.length) return { status: 'unassessed', derivationVersion, eligibleCount: 0, needsReview: false };
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
  return { status, needsReview, recentFailures, derivationVersion, eligibleCount: eligible.length, correctCount: correct.length, accuracy, sessionCount: sessions.size, dateCount: dates.size, unseenCount, hasTransfer: transfer, hasDelayedReview: delayedReview };
}
