// Target active minutes are guidance only (master plan §1 provisional default). No transition in
// this module reads a clock; elapsed time can never advance, fail, or expire a lesson.
export const LESSON_MINUTE_OPTIONS = [10, 15, 20];
export const DEFAULT_LESSON_MINUTES = 20;

export function normalizeLessonMinutes(value) {
  const minutes = Number(value);
  return LESSON_MINUTE_OPTIONS.includes(minutes) ? minutes : DEFAULT_LESSON_MINUTES;
}

export function createLessonState() {
  return { stage: 'teach', practiceIndex: 0, transferIndex: 0, retryCount: 0, lastResult: null };
}

// Human-readable recap for a resumed lesson so the learner sees what is already done and that
// earlier answers are kept. Returns null when nothing has been answered yet.
export function lessonResumeRecap(state, practiceCount, transferCount) {
  const total = practiceCount + transferCount;
  const completed = completedLessonTasks(state, practiceCount, transferCount);
  if (!completed || state.stage === 'complete') return null;
  return `Welcome back. You have finished ${completed} of ${total} tasks; your earlier answers are kept and will not be asked again for credit.`;
}

export function completedLessonTasks(state, practiceCount, transferCount) {
  if (state.stage === 'teach') return 0;
  if (state.stage === 'complete' || state.stage === 'reflection') return practiceCount + transferCount;
  const inTransfer = ['transfer'].includes(state.stage) || (['repair', 'worked_solution', 'feedback'].includes(state.stage) && (state.lastResult?.sourceStage || state.repairSource) === 'transfer');
  return inTransfer ? practiceCount + state.transferIndex : state.practiceIndex;
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
  // A technical failure (audio or microphone) is neither a miss nor a skip: it does not count as a
  // retry and the item is deferred rather than repaired.
  const technicalFailure = Boolean(metadata.technicalFailure);
  const retryCount = correct || technicalFailure ? state.retryCount : state.retryCount + 1;
  return { ...state, stage: 'feedback', retryCount, lastResult: { correct, sourceStage, omitted: Boolean(metadata.omitted), technicalFailure } };
}

export function continueLesson(state, practiceCount, transferCount) {
  if (state.stage !== 'feedback' || !state.lastResult) return state;
  if (state.lastResult.correct || state.lastResult.technicalFailure) return advance(state, state.lastResult.sourceStage, practiceCount, transferCount);
  if (state.retryCount >= 2) return { ...state, stage: 'worked_solution', repairSource: state.lastResult.sourceStage };
  return { ...state, stage: 'repair', repairSource: state.lastResult.sourceStage };
}

export function acceptWorkedSolution(state, practiceCount, transferCount) {
  if (state.stage !== 'worked_solution') return state;
  return advance(state, state.repairSource, practiceCount, transferCount);
}

export function completeReflection(state, reflection, note = '') {
  if (state.stage !== 'reflection' || !reflection) return state;
  const trimmed = String(note || '').trim().slice(0, 280);
  return { ...state, stage: 'complete', reflection, ...(trimmed ? { reflectionNote: trimmed } : {}) };
}

export function currentLessonItem(state, lesson) {
  const source = state.stage === 'repair' || state.stage === 'worked_solution' || state.stage === 'feedback' ? state.lastResult?.sourceStage || state.repairSource : state.stage;
  return source === 'transfer' ? lesson.transfer[state.transferIndex] : lesson.practice[state.practiceIndex];
}
