import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionSnapshot, selectSessionState, shouldStoreSession } from '../src/persistence/durableSession.js';

const expected = { id: 'lesson:jenn:one', learnerId: 'jenn', mode: 'lesson', contentVersion: 3 };
const fallback = () => ({ stage: 'teach' });

test('a valid local session remains the primary fast bootstrap', () => {
  const durableSnapshot = { ...expected, revision: 4, state: { stage: 'attempt', index: 1 } };
  const selected = selectSessionState({ localRaw: JSON.stringify({ stage: 'attempt', index: 2 }), durableSnapshot, expected, fallback });
  assert.deepEqual(selected.state, { stage: 'attempt', index: 2 });
  assert.equal(selected.source, 'local');
  assert.equal(selected.revision, 4);
});

test('IndexedDB recovers a missing or corrupt local session', () => {
  const durableSnapshot = { ...expected, revision: 7, state: { stage: 'repair', index: 3 } };
  for (const localRaw of [null, '{bad json']) {
    const selected = selectSessionState({ localRaw, durableSnapshot, expected, fallback });
    assert.deepEqual(selected.state, durableSnapshot.state);
    assert.equal(selected.source, 'indexeddb');
    assert.equal(selected.revision, 7);
  }
});

test('a snapshot for another learner or content version is never restored', () => {
  const wrongLearner = { ...expected, learnerId: 'jess', revision: 9, state: { stage: 'complete' } };
  const wrongVersion = { ...expected, contentVersion: 2, revision: 9, state: { stage: 'complete' } };
  assert.equal(selectSessionState({ localRaw: null, durableSnapshot: wrongLearner, expected, fallback }).source, 'new');
  assert.equal(selectSessionState({ localRaw: null, durableSnapshot: wrongVersion, expected, fallback }).source, 'new');
});

test('durable snapshots carry ownership, ordered content, revision, and completion status', () => {
  const snapshot = createSessionSnapshot({ ...expected, orderedItemIds: ['a', 'b'], state: { stage: 'complete' }, revision: 8 });
  assert.deepEqual(snapshot.orderedItemIds, ['a', 'b']);
  assert.equal(snapshot.revision, 8);
  assert.equal(snapshot.status, 'complete');
  assert.equal(snapshot.learnerId, 'jenn');
});

test('an older or duplicate asynchronous snapshot cannot replace a newer revision', () => {
  assert.equal(shouldStoreSession({ revision: 8 }, { revision: 7 }), false);
  assert.equal(shouldStoreSession({ revision: 8 }, { revision: 8 }), false);
  assert.equal(shouldStoreSession({ revision: 8 }, { revision: 9 }), true);
});
