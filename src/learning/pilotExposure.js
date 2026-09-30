// How much of the family pilot each child has actually done, read from her real pilot answers.
//
// Master plan §12 asks for at least two visits per child and one delayed review after seven days,
// and for a starting result or a list of what is still pending (R2-G7). This works those out from
// what the app already holds, so none of them has to be ticked by hand.
//
// It reads only. It never writes, and nothing it returns feeds mastery, the review queue or a
// release gate. It counts only pilot-track answers (`EVIDENCE_TRACKS.PILOT`): released, draft and
// unreleased answers are a different record, and a technical failure is not an answer at all.

import { EVIDENCE_TRACKS, attemptIsInTrack } from './pilotApproval.js';
import { edmontonDayKey } from './r1Core.js';

export const PILOT_DAYS_TARGET = 2;
export const REVIEW_GAP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function timeOf(attempt) {
  const value = new Date(attempt?.eventTime).getTime();
  return Number.isFinite(value) ? value : null;
}

// The skill an answer practised, or the item itself when the answer carries no skill.
function topicOf(attempt) {
  return attempt.skillIds?.[0] || `item:${attempt.itemId}`;
}

function dayOf(attempt, time) {
  return attempt.edmontonDate || edmontonDayKey(new Date(time));
}

function pilotAnswers(attempts, learnerId) {
  return (attempts || []).filter((attempt) => attempt?.learnerId === learnerId
    && attemptIsInTrack(attempt, EVIDENCE_TRACKS.PILOT)
    && !attempt.technicalFailure
    && timeOf(attempt) !== null);
}

// A review is an answer on the same skill at least seven days after that skill's first answer.
function findReview(answers) {
  const firstByTopic = new Map();
  [...answers].sort((a, b) => timeOf(a) - timeOf(b)).forEach((attempt) => {
    if (!firstByTopic.has(topicOf(attempt))) firstByTopic.set(topicOf(attempt), attempt);
  });
  let earliest = null;
  for (const [topic, first] of firstByTopic) {
    const dueAt = timeOf(first) + (REVIEW_GAP_DAYS * DAY_MS);
    const review = answers
      .filter((attempt) => topicOf(attempt) === topic && timeOf(attempt) >= dueAt)
      .sort((a, b) => timeOf(a) - timeOf(b))[0];
    if (review) {
      return {
        found: true,
        skill: topic.startsWith('item:') ? '' : topic,
        itemId: topic.startsWith('item:') ? topic.slice(5) : '',
        firstDay: dayOf(first, timeOf(first)),
        reviewDay: dayOf(review, timeOf(review)),
        earliestDay: edmontonDayKey(new Date(dueAt)),
      };
    }
    if (earliest === null || dueAt < earliest) earliest = dueAt;
  }
  return { found: false, earliestDay: earliest === null ? '' : edmontonDayKey(new Date(earliest)) };
}

function findBaseline(learner, diagnosticItemCount) {
  const assessment = (learner.assessments || [])
    .filter((report) => report?.completedAt)
    .sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)))[0];
  const answered = Object.keys(learner.diagnosticRun?.answers || {}).length;
  const diagnosticDone = diagnosticItemCount > 0 && answered >= diagnosticItemCount;
  if (assessment) {
    return { done: true, pending: [], summary: `Assessment form ${assessment.form} finished on ${String(assessment.completedAt).slice(0, 10)}` };
  }
  if (diagnosticDone) {
    return { done: true, pending: [], summary: `Below-grade diagnostic finished (${answered} of ${diagnosticItemCount} answered)` };
  }
  return {
    done: false,
    pending: ['the assessment (form A or B)', `the below-grade diagnostic (${answered} of ${diagnosticItemCount} answered)`],
    summary: '',
  };
}

// `learners` are the app's profiles in device order, each optionally carrying its stored
// `assessments` (completed assessment reports) and `diagnosticRun`. `today` is a YYYY-MM-DD day.
export function derivePilotExposure(attempts = [], learners = [], today = '', { diagnosticItemCount = 0 } = {}) {
  return (learners || []).map((learner) => {
    const answers = pilotAnswers(attempts, learner.id);
    const days = [...new Set(answers.map((attempt) => dayOf(attempt, timeOf(attempt))))].sort();
    const review = findReview(answers);
    return {
      learnerId: learner.id,
      name: learner.name || learner.id,
      answers: answers.length,
      days: days.length,
      daysTarget: PILOT_DAYS_TARGET,
      visitsMet: days.length >= PILOT_DAYS_TARGET,
      firstDay: days[0] || '',
      latestDay: days[days.length - 1] || '',
      review: { ...review, possibleNow: Boolean(review.earliestDay) && Boolean(today) && today >= review.earliestDay },
      baseline: findBaseline(learner, diagnosticItemCount),
    };
  });
}
