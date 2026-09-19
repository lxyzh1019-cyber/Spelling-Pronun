// The queue of answers waiting for a person.
//
// Why this exists: `evaluateItem` returns `pending` when it cannot decide — a typed answer that is a
// reasonable alternative the key did not list, or a response whose evaluator is a human rubric. Those
// answers were recorded and then nothing ever showed them to anybody, so a learner's good alternative
// sat in storage unread and unanswered.
//
// What a decision is NOT: evidence. `evidenceEligible` rejects a pending attempt, and recording a
// parent's judgement here does not change that. A person reading an answer at the kitchen table is not
// the reviewed, independent evidence the release gates require, and folding it into mastery would
// quietly weaken the rule that assisted, pending and unreleased answers never count. The decision is
// kept, shown and reported as one person's judgement, and mastery is untouched.
//
// A decision never edits the attempt either. Attempts are immutable and create-only; a decision is a
// separate record that points at an attempt id.

export const PENDING_DECISIONS = Object.freeze({
  ACCEPTED: 'acceptable_alternative',
  REJECTED: 'not_acceptable',
});

const DECISION_VALUES = new Set(Object.values(PENDING_DECISIONS));

// An attempt needs a person when the evaluator could not decide. A technical failure is not a pending
// answer: nothing was judged, the item was deferred, and there is nothing for a person to read. An
// omission is not one either, because there is no answer.
export function needsHumanReview(attempt) {
  if (!attempt || attempt.status !== 'pending') return false;
  if (attempt.technicalFailure || attempt.omitted) return false;
  return true;
}

export function decisionsByAttemptId(decisions = []) {
  const map = new Map();
  // The first decision for an attempt stands, mirroring the rule that a first answer is never
  // overwritten. A later record for the same attempt is ignored rather than replacing it.
  for (const decision of decisions) if (decision?.attemptId && !map.has(decision.attemptId)) map.set(decision.attemptId, decision);
  return map;
}

// Rows for the parent to work, oldest first, each joined to the item it came from so the screen can
// show the question and what the answer key expected without the caller reaching into content itself.
export function buildPendingQueue(attempts = [], items = [], decisions = []) {
  const itemsById = new Map((items || []).map((item) => [item.id, item]));
  const decided = decisionsByAttemptId(decisions);
  return (attempts || [])
    .filter(needsHumanReview)
    .filter((attempt) => !decided.has(attempt.attemptId))
    .map((attempt) => {
      const item = itemsById.get(attempt.itemId) || null;
      return {
        attemptId: attempt.attemptId,
        learnerId: attempt.learnerId,
        itemId: attempt.itemId,
        itemVersion: attempt.itemVersion,
        skillIds: attempt.skillIds || [],
        submitted: attempt.originalAnswer,
        eventTime: attempt.eventTime,
        helped: Boolean(attempt.helped),
        prompt: item?.prompt || null,
        // What the key expected. Shown so the parent can judge, never so the app can score.
        expected: item?.acceptedAnswers || [],
        rubric: item?.rubric || null,
        explanation: item?.explanation || null,
        // True when the item is gone or renamed: the parent can still read the answer, but the screen
        // must say it cannot show the question rather than inventing one.
        itemMissing: !item,
      };
    })
    .sort((a, b) => String(a.eventTime).localeCompare(String(b.eventTime)));
}

// Appends a decision. Returns the list unchanged when the attempt already has one, so a double tap or
// a replayed write cannot overwrite the first judgement.
export function recordPendingDecision(decisions = [], { attemptId, decision, decidedBy, note = '', decidedAt }) {
  if (!attemptId) throw new Error('A decision must name the attempt it judges');
  if (!DECISION_VALUES.has(decision)) throw new Error(`Unknown decision ${decision}`);
  if (!decidedBy) throw new Error('A decision must name who made it');
  if (decisionsByAttemptId(decisions).has(attemptId)) return decisions;
  return [...decisions, Object.freeze({
    attemptId,
    decision,
    decidedBy,
    note: String(note || ''),
    decidedAt: decidedAt || new Date().toISOString(),
    // Stated in the record itself, so a later reader cannot mistake it for mastery evidence.
    countsAsEvidence: false,
  })];
}

// What to show about a learner's pending answers. `reviewed` counts judgements made, never evidence.
export function summarisePendingReview(attempts = [], decisions = []) {
  const pending = (attempts || []).filter(needsHumanReview);
  const decided = decisionsByAttemptId(decisions);
  const reviewed = pending.filter((attempt) => decided.has(attempt.attemptId));
  return {
    waiting: pending.length - reviewed.length,
    reviewed: reviewed.length,
    acceptable: reviewed.filter((attempt) => decided.get(attempt.attemptId).decision === PENDING_DECISIONS.ACCEPTED).length,
  };
}
