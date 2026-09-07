import test from 'node:test';
import assert from 'node:assert/strict';
import { previewLessonForTrack } from '../src/data/lessonCatalog.js';

test('assessment preview recommendations use only a matching integrated C0 lesson', () => {
  assert.equal(previewLessonForTrack('spelling')?.sessionId, 'pilot-sp-patterns');
  assert.equal(previewLessonForTrack('grammar')?.sessionId, 'pilot-gr-pronouns');
  assert.equal(previewLessonForTrack('sentences')?.sessionId, 'pilot-se-complete');
  assert.equal(previewLessonForTrack('punctuation')?.sessionId, 'pilot-pu-capitals');
  assert.equal(previewLessonForTrack('decoding'), null);
  assert.equal(previewLessonForTrack('pronunciation'), null);
});
