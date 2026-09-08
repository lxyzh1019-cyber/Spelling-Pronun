import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentLessonCompletion } from '../src/learning/storyProgress.js';

const lesson = { sessionId: 'pilot-sp-patterns', version: 3 };

test('story progression accepts only a completion for the current lesson version', () => {
  assert.equal(isCurrentLessonCompletion({ sessionId: lesson.sessionId, contentVersion: 3 }, lesson), true);
  assert.equal(isCurrentLessonCompletion({ sessionId: lesson.sessionId, contentVersion: 2 }, lesson), false);
  assert.equal(isCurrentLessonCompletion({ sessionId: 'another-lesson', contentVersion: 3 }, lesson), false);
  assert.equal(isCurrentLessonCompletion({ sessionId: lesson.sessionId }, lesson), false);
});
