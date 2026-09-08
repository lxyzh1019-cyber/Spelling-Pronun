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

function lowercaseFirst(text) {
  return text.charAt(0).toLocaleLowerCase('en-CA') + text.slice(1);
}

// Words that keep their capital letter mid-sentence: the pronoun I (including contractions) and
// any proper noun the item declares. Lower-casing these is a spelling error, not a style choice.
function keepsCapitalMidSentence(clause, scope) {
  const firstWord = normalizeSentenceSpacing(clause).split(' ')[0] || '';
  if (/^I(?:$|['’])/.test(firstWord)) return true;
  return (scope?.properNouns || []).some((noun) => firstWord.replace(/[^\p{L}'’]/gu, '') === noun);
}

// Forms of a clause accepted at a given boundary. A new sentence (period or semicolon join) must be
// capitalized; after a coordinating conjunction the clause continues the sentence, so it is
// lower-cased unless its first word keeps its capital.
function clauseVariantsAfterJoin(clause, join, scope) {
  if (join !== 'coordinating') return [capitalizeFirst(clause)];
  return keepsCapitalMidSentence(clause, scope) ? [capitalizeFirst(clause)] : [lowercaseFirst(clause)];
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
  let acceptedClauseForms = [];
  const joinsUsed = [];
  for (let index = 0; index < clauses.length; index++) {
    const clause = clauses[index];
    // Index 0 opens the sentence; later clauses were already validated against the join that
    // introduced them, so the same accepted form is consumed here.
    const candidates = index === 0 ? [capitalizeFirst(clause)] : acceptedClauseForms;
    const match = candidates.find((candidate) => remaining.startsWith(candidate));
    if (!match) return null;
    remaining = remaining.slice(match.length);
    if (index === clauses.length - 1) break;
    const boundary = remaining.match(/^(\. |; |, [a-z]+ )/);
    if (!boundary) return null;
    const join = allowedJoins.find((name) => JOIN_PATTERNS[name].test(boundary[0]));
    if (!join) return null;
    const nextClause = clauses[index + 1];
    const afterJoin = remaining.slice(boundary[0].length);
    const acceptableNext = clauseVariantsAfterJoin(nextClause, join, scope);
    if (!acceptableNext.some((candidate) => afterJoin.startsWith(candidate))) return null;
    acceptedClauseForms = acceptableNext;
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
