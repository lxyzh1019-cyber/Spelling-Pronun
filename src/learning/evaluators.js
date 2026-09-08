function normalizeUnicode(value) {
  return String(value ?? '').normalize('NFC').trim();
}

export function normalizeSpelling(value, { caseSensitive = false } = {}) {
  const normalized = normalizeUnicode(value);
  return caseSensitive ? normalized : normalized.toLocaleLowerCase('en-CA');
}

export function normalizeSentenceSpacing(value) {
  return normalizeUnicode(value).replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1');
}

function result(status, reason, details = {}) {
  return { status, correct: status === 'correct', reason, ...details };
}

export function evaluateItem(item, response) {
  if (!item?.evaluator) return result('pending', 'missing_evaluator');
  if (item.evaluator === 'human_rubric') return result('pending', 'human_review_required', { rubric: item.rubric });
  if (item.evaluator === 'self_report') return result('pending', 'self_report_only');

  if (item.evaluator === 'choice' || item.evaluator === 'tokens') {
    const actual = Array.isArray(response) ? response : [response];
    const expected = Array.isArray(item.acceptedAnswers?.[0]) ? item.acceptedAnswers : [item.acceptedAnswers];
    const matched = expected.some((candidate) => {
      const values = Array.isArray(candidate) ? candidate : [candidate];
      return values.length === actual.length && values.every((value, index) => value === actual[index]);
    });
    return result(matched ? 'correct' : 'incorrect', matched ? 'accepted_id_sequence' : 'unaccepted_id_sequence');
  }

  if (item.evaluator === 'spelling') {
    const actual = normalizeSpelling(response, { caseSensitive: item.caseSensitive });
    const accepted = (item.acceptedAnswers || []).map((answer) => normalizeSpelling(answer, { caseSensitive: item.caseSensitive }));
    return result(accepted.includes(actual) ? 'correct' : 'incorrect', accepted.includes(actual) ? 'accepted_spelling' : 'unaccepted_spelling');
  }

  if (item.evaluator === 'punctuation' || item.evaluator === 'sentence_repair') {
    const actual = normalizeSentenceSpacing(response);
    const accepted = (item.acceptedAnswers || []).map(normalizeSentenceSpacing);
    if (accepted.includes(actual)) return result('correct', 'accepted_sentence');
    if (item.evaluator === 'sentence_repair' && item.repairScope) {
      const structural = evaluateRepairScope(item.repairScope, actual);
      if (structural) return result('correct', structural);
    }
    return item.allowReview
      ? result('pending', 'reasonable_alternative_review', { submitted: actual })
      : result('incorrect', 'unaccepted_sentence');
  }

  return result('pending', 'unsupported_evaluator');
}

const COORDINATING_CONJUNCTIONS = ['and', 'but', 'so', 'or', 'yet', 'for', 'nor'];
const JOIN_PATTERNS = {
  period: /^\. $/,
  semicolon: /^; $/,
  coordinating: new RegExp(`^, (${COORDINATING_CONJUNCTIONS.join('|')}) $`),
};

function capitalizeFirst(text) {
  return text.charAt(0).toLocaleUpperCase('en-CA') + text.slice(1);
}

/**
 * Scoped structural check for sentence repairs. It never accepts a response merely because it
 * contains a period or conjunction: every declared clause must appear verbatim, in order, and each
 * boundary between clauses must be one of the joins the item explicitly allows. A trailing end mark
 * from the declared set (default period) closes the sentence.
 */
export function evaluateRepairScope(scope, response) {
  const clauses = (scope?.clauses || []).map((clause) => normalizeSentenceSpacing(clause).replace(/[.!?]+$/, ''));
  const allowedJoins = (scope?.allowedJoins || []).filter((join) => JOIN_PATTERNS[join]);
  if (clauses.length < 2 || !allowedJoins.length) return null;
  const endMarks = scope.endMarks || ['.'];
  let remaining = normalizeSentenceSpacing(response);
  const joinsUsed = [];
  for (let index = 0; index < clauses.length; index++) {
    const clause = clauses[index];
    const candidates = index === 0 ? [capitalizeFirst(clause)] : [clause, clause.charAt(0).toLocaleLowerCase('en-CA') + clause.slice(1), capitalizeFirst(clause)];
    const match = candidates.find((candidate) => remaining.startsWith(candidate));
    if (!match) return null;
    remaining = remaining.slice(match.length);
    if (index === clauses.length - 1) break;
    const boundary = remaining.match(/^(\. |; |, [a-z]+ )/);
    if (!boundary) return null;
    const join = allowedJoins.find((name) => JOIN_PATTERNS[name].test(boundary[0]));
    if (!join) return null;
    // A period or semicolon join requires the next clause to start with a capital letter; a
    // coordinating join requires lower case.
    const nextClause = clauses[index + 1];
    const afterJoin = remaining.slice(boundary[0].length);
    // The pronoun I and proper names stay capitalized after a coordinating join, so either the
    // declared form or its lower-cased form is acceptable there; a new sentence must be capitalized.
    const acceptableNext = join === 'coordinating'
      ? [nextClause, nextClause.charAt(0).toLocaleLowerCase('en-CA') + nextClause.slice(1)]
      : [capitalizeFirst(nextClause)];
    if (!acceptableNext.some((candidate) => afterJoin.startsWith(candidate))) return null;
    joinsUsed.push(join);
    remaining = remaining.slice(boundary[0].length);
  }
  if (!endMarks.includes(remaining)) return null;
  return `accepted_structural_repair:${joinsUsed.join('+')}`;
}

export function evidenceEligible(attempt) {
  const independent = new Set([
    'independent_spelling',
    'independent_choice',
    'independent_punctuation',
    'independent_transfer',
    'delayed_review',
    'reviewed_writing',
    'reviewed_pronunciation',
  ]);
  // Only a first attempt at an item within a session is independent evidence. Any later attempt
  // at the same item (ordinal > 1) is a retry and can never count, whatever page produced it.
  const firstAttempt = attempt.ordinal === undefined || attempt.ordinal === null || attempt.ordinal <= 1;
  return independent.has(attempt.evidenceType) && firstAttempt && !attempt.helped && !attempt.revealed && attempt.status !== 'pending' && !attempt.technicalFailure;
}
