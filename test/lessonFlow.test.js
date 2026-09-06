import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptWorkedSolution, completeReflection, continueLesson, createLessonState, startLesson, submitLessonResult } from '../src/learning/lessonFlow.js';
import { c0LessonCatalog } from '../src/data/lessonCatalog.js';

test('each C0 lesson uses two examples, six independent questions, and two unseen transfers', () => {
  assert.equal(Object.keys(c0LessonCatalog).length, 4);
  for (const lesson of Object.values(c0LessonCatalog)) {
    assert.equal(lesson.examples.length, 2);
    assert.equal(lesson.practice.length, 6);
    assert.equal(lesson.transfer.length, 2);
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
