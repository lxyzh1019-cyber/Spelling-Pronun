export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30];

export function nextReview({ eventTime, reviewStage = -1, correct, helped = false }) {
  const base = new Date(eventTime);
  const nextStage = correct && !helped ? Math.min(reviewStage + 1, REVIEW_INTERVAL_DAYS.length - 1) : 0;
  const due = new Date(base.getTime() + REVIEW_INTERVAL_DAYS[nextStage] * 86_400_000);
  return { reviewStage: nextStage, reviewDue: due.toISOString() };
}

export function selectDueReviews(progress, now = new Date(), limit = 4) {
  return Object.values(progress)
    .filter((entry) => entry.reviewDue && new Date(entry.reviewDue) <= now)
    .sort((a, b) => new Date(a.reviewDue) - new Date(b.reviewDue) || new Date(b.lastErrorAt || 0) - new Date(a.lastErrorAt || 0))
    .slice(0, limit);
}

export function deriveReviewProgress(attempts) {
  const progress = {};
  const sorted = [...attempts]
    .filter((attempt) => attempt.contentStatus === 'reviewed' && !attempt.technicalFailure && attempt.status !== 'pending' && attempt.status !== 'omitted')
    .sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
  for (const attempt of sorted) {
    for (const skillId of attempt.skillIds || []) {
      const previous = progress[skillId];
      const sameDayRepair = attempt.helped && previous?.lastAttemptDate === attempt.edmontonDate;
      const scheduled = nextReview({
        eventTime: attempt.eventTime,
        reviewStage: sameDayRepair ? previous?.reviewStage ?? -1 : previous?.reviewStage ?? -1,
        correct: attempt.correct && !sameDayRepair,
        helped: attempt.helped,
      });
      progress[skillId] = {
        skillId,
        ...scheduled,
        lastAttemptAt: attempt.eventTime,
        lastAttemptDate: attempt.edmontonDate,
        lastErrorAt: attempt.correct ? previous?.lastErrorAt : attempt.eventTime,
      };
    }
  }
  return progress;
}
