// Target active minutes are guidance only (master plan §1 provisional default). No transition in
// this module reads a clock; elapsed time can never advance, fail, or expire a lesson.
// Two unsuccessful independent attempts earn a worked solution rather than a third repair.
import { newOrderSeed } from './choiceOrder.js';

export const WORKED_SOLUTION_AFTER = 2;
export const LESSON_MINUTE_OPTIONS = [10, 15, 20];
export const DEFAULT_LESSON_MINUTES = 20;

export function normalizeLessonMinutes(value) {
  const minutes = Number(value);
  return LESSON_MINUTE_OPTIONS.includes(minutes) ? minutes : DEFAULT_LESSON_MINUTES;
}

export function createLessonState() {
  // `orderSeed` fixes the display order of this sitting's multiple-choice options. It lives in the
  // durable state so a reload or a resumed tab shows the same order, and a new lesson reshuffles.
  return { stage: 'teach', practiceIndex: 0, transferIndex: 0, retryCount: 0, lastResult: null, orderSeed: newOrderSeed() };
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
  // A pending answer is undecided, not wrong. The evaluator returns `pending` when a typed answer is a
  // reasonable alternative the key did not list, or when a human rubric must be applied. Counting it as
  // a miss would tell a child their good answer was an error, push them into a repair they do not need,
  // and burn a retry towards the worked solution. It advances like a technical deferral and waits for a
  // person to read it.
  const pending = Boolean(metadata.pending) && !correct;
  const counted = correct || technicalFailure || pending;
  const retryCount = counted ? state.retryCount : state.retryCount + 1;
  return { ...state, stage: 'feedback', retryCount, lastResult: { correct, sourceStage, omitted: Boolean(metadata.omitted), technicalFailure, pending } };
}

export function continueLesson(state, practiceCount, transferCount) {
  if (state.stage !== 'feedback' || !state.lastResult) return state;
  if (state.lastResult.correct || state.lastResult.technicalFailure || state.lastResult.pending) return advance(state, state.lastResult.sourceStage, practiceCount, transferCount);
  if (state.retryCount >= WORKED_SOLUTION_AFTER) return { ...state, stage: 'worked_solution', repairSource: state.lastResult.sourceStage };
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

// The evidence a lesson answer produces. A repair is assisted whether or not help was tapped,
// because the learner has already seen the feedback for that item.
export function evidenceTypeForLesson({ stage, repairSource, helped = false, omitted = false, technicalFailure = false } = {}) {
  if (technicalFailure) return 'technical_failure';
  if (omitted) return 'omission';
  const assisted = helped || stage === 'repair';
  if (assisted) return 'assisted_repair';
  const sourceStage = stage === 'repair' ? repairSource : stage;
  return sourceStage === 'transfer' ? 'independent_transfer' : 'independent_choice';
}

export function lessonAssistanceFor({ stage, helped = false }) {
  return helped || stage === 'repair';
}

export function lessonFeedbackHeading(lastResult) {
  if (lastResult?.technicalFailure) return 'Deferred: audio or microphone problem';
  if (lastResult?.correct) return 'Correct';
  if (lastResult?.pending) return 'Sent for review';
  if (lastResult?.omitted) return 'Not answered yet';
  return 'Not yet';
}

// What the learner reads under that heading. A pending answer must not be handed the item's explanation,
// because the explanation argues for the one answer the key lists and would read as a correction.
export function lessonFeedbackMessage(lastResult, item) {
  if (lastResult?.technicalFailure) return 'This was recorded as a technical issue, not a wrong answer. It is deferred and can be retried in a later review.';
  if (lastResult?.pending) return 'Your answer is a reasonable alternative that the answer key does not list, so it is kept for a person to read. It is not marked right or wrong, and it is not counted as a mistake.';
  if (lastResult?.omitted) return 'This item remains unresolved. Use the guided repair before moving on.';
  return item?.explanation || '';
}

// After two unsuccessful independent attempts the learner is shown a worked solution rather than
// being asked to repair a third time.
export function lessonContinueLabel(state) {
  if (state?.lastResult?.correct || state?.lastResult?.technicalFailure || state?.lastResult?.pending) return 'Continue';
  return state?.retryCount >= WORKED_SOLUTION_AFTER ? 'See worked solution' : 'Repair this answer';
}
