// Assessment runner rules: what an answer earns, and how the run advances.

// Which follow-up panel an answered item earns. Neither panel scores anything: the self check
// compares an open answer with its stated rubric, and the practice step is an optional recording.
// An omitted or technically failed item earns neither, because there is nothing to compare.
export function panelFor(item, response, metadata = {}) {
  if (metadata.omitted || metadata.technicalFailure) return null;
  if (item.evaluator === 'human_rubric' && item.responseType === 'text') return { kind: 'self_check', itemId: item.id, response };
  if (item.optionalPractice) return { kind: 'practice', itemId: item.id };
  return null;
}

// The evidence an assessment answer produces. Assistance outranks the item type, and a recording
// is always pending human review rather than scored.
export function evidenceTypeForAssessment(item, { helped = false, omitted = false, technicalFailure = false } = {}) {
  if (technicalFailure) return 'technical_failure';
  if (omitted) return 'omission';
  if (helped) return 'assisted_assessment';
  if (item.responseType === 'recording') return 'reviewed_pronunciation_pending';
  if (item.evaluator === 'spelling') return 'independent_spelling';
  if (item.evaluator === 'punctuation') return 'independent_punctuation';
  return 'independent_choice';
}

// Advancing past the last item is what completes a run. The timestamp is passed in so the rule
// stays free of a clock.
export function advanceAssessment(state, itemCount, now) {
  const nextIndex = state.index + 1;
  return {
    ...state,
    index: nextIndex,
    pendingPanel: null,
    completedAt: nextIndex === itemCount ? now : state.completedAt || null,
  };
}

export function recordAssessmentResult(state, item, attempt) {
  return {
    ...state,
    results: [...state.results, {
      itemId: item.id,
      skillId: item.primarySkill,
      status: attempt.status,
      correct: attempt.correct,
      helped: attempt.helped,
      omitted: attempt.omitted,
      technicalFailure: attempt.technicalFailure,
    }],
  };
}
