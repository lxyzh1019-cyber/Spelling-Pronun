import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptDocumentId, mergeAttempts } from '../src/persistence/sync.js';

test('attempt sync merges additively and preserves one immutable event per ID', () => {
  const remote = [{ attemptId: 'a', eventTime: '2026-01-01T00:00:00Z', originalAnswer: 'remote' }];
  const local = [{ attemptId: 'a', eventTime: '2026-01-01T00:00:00Z', originalAnswer: 'local' }, { attemptId: 'b', eventTime: '2026-01-02T00:00:00Z' }];
  const merged = mergeAttempts(local, remote);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].originalAnswer, 'remote');
  assert.deepEqual(merged.map(({ attemptId }) => attemptId), ['a', 'b']);
});

test('cloud attempt IDs remain owner and learner scoped', () => {
  assert.equal(attemptDocumentId('parent-1', { learnerId: 'jenn', attemptId: 'attempt-2' }), 'parent-1_jenn_attempt-2');
});
