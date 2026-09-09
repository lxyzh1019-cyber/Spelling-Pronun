import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAssessment, evidenceTypeForAssessment, panelFor, recordAssessmentResult } from '../src/learning/assessmentFlow.js';

const writing = { id: 'w1', evaluator: 'human_rubric', responseType: 'text' };
const decoding = { id: 'd1', evaluator: 'choice', responseType: 'audio_choice', optionalPractice: { evaluator: 'self_comparison' } };
const plain = { id: 'p1', evaluator: 'choice', responseType: 'choice' };

test('an open answer earns a self check and a decoding item earns optional practice', () => {
  assert.deepEqual(panelFor(writing, 'my answer', {}), { kind: 'self_check', itemId: 'w1', response: 'my answer' });
  assert.deepEqual(panelFor(decoding, 'b', {}), { kind: 'practice', itemId: 'd1' });
  assert.equal(panelFor(plain, 'a', {}), null);
});

test('an omitted or failed item earns no panel, because there is nothing to compare', () => {
  assert.equal(panelFor(writing, null, { omitted: true }), null);
  assert.equal(panelFor(writing, null, { technicalFailure: true }), null);
  assert.equal(panelFor(decoding, null, { technicalFailure: true }), null);
});

test('assistance outranks the item type, and a recording is always pending review', () => {
  assert.equal(evidenceTypeForAssessment(plain, { technicalFailure: true }), 'technical_failure');
  assert.equal(evidenceTypeForAssessment(plain, { omitted: true }), 'omission');
  assert.equal(evidenceTypeForAssessment({ ...plain, evaluator: 'spelling' }, { helped: true }), 'assisted_assessment');
  assert.equal(evidenceTypeForAssessment({ evaluator: 'human_rubric', responseType: 'recording' }, {}), 'reviewed_pronunciation_pending');
  assert.equal(evidenceTypeForAssessment({ evaluator: 'spelling', responseType: 'text' }, {}), 'independent_spelling');
  assert.equal(evidenceTypeForAssessment({ evaluator: 'punctuation', responseType: 'text' }, {}), 'independent_punctuation');
  assert.equal(evidenceTypeForAssessment(plain, {}), 'independent_choice');
});

test('a run completes only when it advances past the last item', () => {
  const now = '2026-09-09T12:00:00.000Z';
  const mid = advanceAssessment({ index: 0, results: [], completedAt: null }, 3, now);
  assert.equal(mid.index, 1);
  assert.equal(mid.completedAt, null);
  assert.equal(mid.pendingPanel, null);
  const last = advanceAssessment({ index: 2, results: [], completedAt: null, pendingPanel: { kind: 'practice' } }, 3, now);
  assert.equal(last.index, 3);
  assert.equal(last.completedAt, now, 'the run is complete');
  assert.equal(last.pendingPanel, null, 'a pending panel is cleared when the run advances');
});

test('a recorded result keeps every outcome category distinct', () => {
  const attempt = { status: 'omitted', correct: false, helped: false, omitted: true, technicalFailure: false };
  const next = recordAssessmentResult({ index: 0, results: [] }, plain, attempt);
  assert.deepEqual(next.results, [{ itemId: 'p1', skillId: undefined, status: 'omitted', correct: false, helped: false, omitted: true, technicalFailure: false }]);
  assert.equal(next.index, 0, 'recording a result does not advance the run');
});
