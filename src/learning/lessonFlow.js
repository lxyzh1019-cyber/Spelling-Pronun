export function createLessonState() {
  return { stage: 'teach', practiceIndex: 0, transferIndex: 0, retryCount: 0, lastResult: null };
}

export function startLesson(state) {
  return state.stage === 'teach' ? { ...state, stage: 'attempt' } : state;
}

function advance(state, sourceStage, practiceCount, transferCount) {
  if (sourceStage === 'attempt') {
    if (state.practiceIndex + 1 < practiceCount) return { ...state, stage: 'attempt', practiceIndex: state.practiceIndex + 1, retryCount: 0, lastResult: null };
    return { ...state, stage: 'transfer', transferIndex: 0, retryCount: 0, lastResult: null };
  }
  if (state.transferIndex + 1 < transferCount) return { ...state, stage: 'transfer', transferIndex: state.transferIndex + 1, retryCount: 0, lastResult: null };
  return { ...state, stage: 'reflection', retryCount: 0, lastResult: null };
}

export function submitLessonResult(state, correct, metadata = {}) {
  if (!['attempt', 'repair', 'transfer'].includes(state.stage)) return state;
  const sourceStage = state.stage === 'repair' ? state.repairSource : state.stage;
  const retryCount = correct ? state.retryCount : state.retryCount + 1;
  return { ...state, stage: 'feedback', retryCount, lastResult: { correct, sourceStage, omitted: Boolean(metadata.omitted) } };
}

export function continueLesson(state, practiceCount, transferCount) {
  if (state.stage !== 'feedback' || !state.lastResult) return state;
  if (state.lastResult.correct) return advance(state, state.lastResult.sourceStage, practiceCount, transferCount);
  if (state.retryCount >= 2) return { ...state, stage: 'worked_solution', repairSource: state.lastResult.sourceStage };
  return { ...state, stage: 'repair', repairSource: state.lastResult.sourceStage };
}

export function acceptWorkedSolution(state, practiceCount, transferCount) {
  if (state.stage !== 'worked_solution') return state;
  return advance(state, state.repairSource, practiceCount, transferCount);
}

export function completeReflection(state, reflection) {
  return state.stage === 'reflection' && reflection ? { ...state, stage: 'complete', reflection } : state;
}

export function currentLessonItem(state, lesson) {
  const source = state.stage === 'repair' || state.stage === 'worked_solution' || state.stage === 'feedback' ? state.lastResult?.sourceStage || state.repairSource : state.stage;
  return source === 'transfer' ? lesson.transfer[state.transferIndex] : lesson.practice[state.practiceIndex];
}
