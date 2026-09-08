import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptWorkedSolution, completeReflection, continueLesson, createLessonState, startLesson, submitLessonResult } from '../src/learning/lessonFlow.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';

test('each C0 lesson serves two examples and six independent questions, withholding quarantined items', async () => {
  const { c0PilotPacks } = await import('../src/data/packs.c0.draft.js');
  const { isQuarantined } = await import('../src/learning/contentCorrections.js');
  assert.equal(Object.keys(c0LessonCatalog).length, 4);
  for (const lesson of Object.values(c0LessonCatalog)) {
    const pack = c0PilotPacks.find((candidate) => candidate.id === lesson.packId);
    // The pack still holds the full required inventory; quarantine withholds items from the
    // served lesson rather than deleting them, and the reduction is reported.
    assert.equal(pack.items.length, 24);
    assert.equal(pack.items.filter((item) => item.role === 'transfer').length, 2);
    assert.equal(lesson.examples.length, 2);
    assert.equal(lesson.practice.length, 6, 'the next unaffected question replaces a quarantined one');
    const quarantinedTransfers = pack.items.filter((item) => item.role === 'transfer' && isQuarantined(item)).length;
    assert.equal(lesson.transfer.length, 2 - quarantinedTransfers);
    assert.equal(lesson.quarantinedCount, pack.items.filter(isQuarantined).length);
    assert.ok(lesson.practice.every((item) => !isQuarantined(item)), 'no quarantined item is ever served');
  }
});

test('lesson flow runs six attempts, two transfers, reflection, and completion', () => {
  let state = startLesson(createLessonState());
  for (let index = 0; index < 6; index++) {
    state = submitLessonResult(state, true);
    state = continueLesson(state, 6, 2);
  }
  assert.equal(state.stage, 'transfer');
  state = continueLesson(submitLessonResult(state, true), 6, 2);
  assert.equal(state.stage, 'transfer');
  assert.equal(state.transferIndex, 1);
  state = continueLesson(submitLessonResult(state, true), 6, 2);
  assert.equal(state.stage, 'reflection');
  state = completeReflection(state, 'I compared the choices with the rule.');
  assert.equal(state.stage, 'complete');
});

test('two misses lead to a worked solution without overwriting either attempt', () => {
  let state = startLesson(createLessonState());
  state = continueLesson(submitLessonResult(state, false), 6, 2);
  assert.equal(state.stage, 'repair');
  state = continueLesson(submitLessonResult(state, false), 6, 2);
  assert.equal(state.stage, 'worked_solution');
  state = acceptWorkedSolution(state, 6, 2);
  assert.equal(state.stage, 'attempt');
  assert.equal(state.practiceIndex, 1);
});

test('an omitted lesson item stays unresolved and enters guided repair', () => {
  let state = startLesson(createLessonState());
  state = submitLessonResult(state, false, { omitted: true });
  assert.equal(state.lastResult.omitted, true);
  assert.equal(state.retryCount, 1);
  state = continueLesson(state, 6, 2);
  assert.equal(state.stage, 'repair');
  assert.equal(state.practiceIndex, 0);
});

test('lesson duration is guidance only: options are fixed and no transition reads a clock', async () => {
  const { DEFAULT_LESSON_MINUTES, LESSON_MINUTE_OPTIONS, normalizeLessonMinutes } = await import('../src/learning/lessonFlow.js');
  assert.deepEqual(LESSON_MINUTE_OPTIONS, [10, 15, 20]);
  assert.equal(DEFAULT_LESSON_MINUTES, 20);
  assert.equal(normalizeLessonMinutes('15'), 15);
  assert.equal(normalizeLessonMinutes(7), 20, 'unknown values fall back to the default');
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/learning/lessonFlow.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Date\.now|new Date|setTimeout|performance\.now/, 'lesson transitions never depend on elapsed time');
});

test('a technical failure in a lesson defers the item without counting as a miss or retry', () => {
  let state = startLesson(createLessonState());
  state = submitLessonResult(state, false, { technicalFailure: true });
  assert.equal(state.lastResult.technicalFailure, true);
  assert.equal(state.retryCount, 0, 'not a retry');
  state = continueLesson(state, 6, 2);
  assert.equal(state.stage, 'attempt', 'advances instead of entering repair');
  assert.equal(state.practiceIndex, 1);
});

test('reflection requires a concrete choice and accepts an optional trimmed note', () => {
  let state = startLesson(createLessonState());
  for (let index = 0; index < 8; index++) state = continueLesson(submitLessonResult(state, true), 6, 2);
  assert.equal(state.stage, 'reflection');
  assert.equal(completeReflection(state, '').stage, 'reflection', 'a note alone cannot complete the lesson');
  const withoutNote = completeReflection(state, 'I compared the choices with the rule.');
  assert.equal(withoutNote.stage, 'complete');
  assert.equal(withoutNote.reflectionNote, undefined);
  const withNote = completeReflection(state, 'I compared the choices with the rule.', '  I looked for the verb first.  ');
  assert.equal(withNote.reflectionNote, 'I looked for the verb first.');
});

test('resume recap reports completed tasks and disappears once the lesson is complete', async () => {
  const { completedLessonTasks, lessonResumeRecap } = await import('../src/learning/lessonFlow.js');
  let state = startLesson(createLessonState());
  assert.equal(lessonResumeRecap(state, 6, 2), null, 'nothing answered yet');
  for (let index = 0; index < 3; index++) state = continueLesson(submitLessonResult(state, true), 6, 2);
  assert.equal(completedLessonTasks(state, 6, 2), 3);
  assert.match(lessonResumeRecap(state, 6, 2), /finished 3 of 8 tasks/);
  const inRepair = continueLesson(submitLessonResult(state, false), 6, 2);
  assert.equal(completedLessonTasks(inRepair, 6, 2), 3, 'an item under repair is not counted as done');
  for (let index = 0; index < 6; index++) state = continueLesson(submitLessonResult(state, true), 6, 2);
  assert.equal(state.stage, 'reflection');
  assert.equal(completedLessonTasks(state, 6, 2), 8);
  assert.equal(lessonResumeRecap(completeReflection(state, 'done'), 6, 2), null);
});

test('optional Chinese rule help is validated only when present and rendered behind a toggle', async () => {
  const { validateContent } = await import('../src/learning/contentValidator.js');
  const base = { id: 'i', version: 1, primarySkill: 'a', role: 'independent', difficulty: 1, prompt: 'p', responseType: 'choice', evaluator: 'choice', acceptedAnswers: ['x'], explanation: 'e', helpSteps: ['h'], evidenceEligibility: 'independent', transferGroup: 't', authorStatus: 'draft', reviewStatus: 'draft', releaseStatus: 'not_released' };
  const skills = [{ id: 'a' }];
  assert.equal(validateContent({ skills, items: [base] }).valid, true);
  assert.equal(validateContent({ skills, items: [{ ...base, ruleHelpZh: '先找动词。' }] }).valid, true);
  assert.equal(validateContent({ skills, items: [{ ...base, ruleHelpZh: '   ' }] }).valid, false);
  const { readFile } = await import('node:fs/promises');
  const page = await readFile(new URL('../src/pages/LessonPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /中文提示/);
  assert.match(page, /Audio or microphone did not work/);
  assert.match(page, /More help/);
});
