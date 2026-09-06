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
    return item.allowReview
      ? result('pending', 'reasonable_alternative_review', { submitted: actual })
      : result('incorrect', 'unaccepted_sentence');
  }

  return result('pending', 'unsupported_evaluator');
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
  return independent.has(attempt.evidenceType) && !attempt.helped && !attempt.revealed && attempt.status !== 'pending' && !attempt.technicalFailure;
}
