// The attempt record and the rules that shape it.
//
// This is the schema every piece of evidence in the app is built from, so it is kept here as a
// pure function rather than inside the provider that happens to call it. `buildAttempt` decides
// three things that matter: which ordinal an answer gets, what status it carries, and which
// content lifecycle it belongs to.

// A learner's answers to the same item within one session are numbered. Only the first is
// independent evidence, so the count has to be right. A technical failure is not an answer, so it
// does not consume an ordinal: an audio problem must not turn the learner's real attempt into a retry.
export function nextAttemptOrdinal(priorAttempts = [], { sessionId, itemId }) {
  return priorAttempts.filter((entry) => entry.sessionId === sessionId
    && entry.itemId === itemId
    && !entry.technicalFailure).length + 1;
}

// Status precedence: a technical failure and an omission both outrank whatever the evaluator said,
// because neither is a judgement about the answer.
export function attemptStatusFor(evaluation, metadata = {}) {
  if (metadata.technicalFailure) return 'technical_failure';
  if (metadata.omitted) return 'omitted';
  return evaluation?.status;
}

export function buildAttempt({ item, response, evaluation, metadata = {}, priorAttempts = [], learnerId, eventTime, edmontonDate, attemptId }) {
  const ordinal = metadata.ordinal ?? nextAttemptOrdinal(priorAttempts, { sessionId: metadata.sessionId, itemId: item.id });
  return Object.freeze({
    attemptId,
    learnerId,
    sessionId: metadata.sessionId,
    itemId: item.id,
    itemVersion: item.version,
    skillIds: [item.primarySkill, ...(item.secondarySkills || [])],
    originalAnswer: response,
    status: attemptStatusFor(evaluation, metadata),
    // An omission is never correct, whatever the evaluator made of an empty response.
    correct: metadata.omitted ? false : Boolean(evaluation?.correct),
    omitted: Boolean(metadata.omitted),
    technicalFailure: Boolean(metadata.technicalFailure),
    helped: Boolean(metadata.helped),
    revealed: Boolean(metadata.revealed),
    unseen: Boolean(metadata.unseen),
    ordinal,
    evidenceType: metadata.evidenceType || 'independent_choice',
    eventTime,
    edmontonDate,
    reviewStatus: item.reviewStatus,
    // Evidence inherits the content's lifecycle, so released, pilot, and preview answers can never
    // be pooled together later.
    contentStatus: item.releaseStatus || 'not_released',
  });
}
