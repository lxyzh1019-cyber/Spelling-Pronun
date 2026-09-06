import test from 'node:test';
import assert from 'node:assert/strict';
import { claimCloudSession, cloudSessionDocumentId, saveCloudSession } from '../src/persistence/sessionSync.js';

const candidate = {
  userId: 'family/one',
  learnerId: 'jenn',
  sessionId: 'lesson:one',
  deviceId: 'ipad-a',
  mode: 'lesson',
  contentVersion: 3,
  orderedItemIds: ['q1', 'q2'],
  state: { stage: 'teach' },
};

test('cloud session IDs are family, learner, and session scoped without path separators', () => {
  const id = cloudSessionDocumentId(candidate.userId, candidate.learnerId, candidate.sessionId);
  assert.equal(id, 'family%2Fone__jenn__lesson%3Aone');
  assert.equal(id.includes('/'), false);
});

test('the first device claims a new cloud session', () => {
  const decision = claimCloudSession(null, candidate);
  assert.equal(decision.writable, true);
  assert.equal(decision.record.ownerEpoch, 1);
  assert.equal(decision.record.revision, 1);
  assert.deepEqual(decision.record.orderedItemIds, ['q1', 'q2']);
});

test('a second device is read-only until explicit takeover', () => {
  const first = claimCloudSession(null, candidate).record;
  const second = { ...candidate, deviceId: 'ipad-b' };
  const readOnly = claimCloudSession(first, second);
  assert.equal(readOnly.writable, false);
  assert.equal(readOnly.changed, false);
  const takeover = claimCloudSession(first, second, { takeOver: true });
  assert.equal(takeover.writable, true);
  assert.equal(takeover.record.deviceId, 'ipad-b');
  assert.equal(takeover.record.ownerEpoch, 2);
  assert.equal(takeover.record.revision, 2);
});

test('takeover makes the old device and old revision unable to save', () => {
  const first = claimCloudSession(null, candidate).record;
  const current = claimCloudSession(first, { ...candidate, deviceId: 'ipad-b' }, { takeOver: true }).record;
  assert.throws(() => saveCloudSession(current, { ...candidate, ownerEpoch: 1, expectedRevision: 1, state: { stage: 'attempt' } }), /stale_session_owner/);
  assert.throws(() => saveCloudSession(current, { ...candidate, deviceId: 'ipad-b', ownerEpoch: 2, expectedRevision: 1, state: { stage: 'attempt' } }), /stale_session_revision/);
  const saved = saveCloudSession(current, { ...candidate, deviceId: 'ipad-b', ownerEpoch: 2, expectedRevision: 2, state: { stage: 'attempt' } });
  assert.equal(saved.revision, 3);
  assert.deepEqual(saved.state, { stage: 'attempt' });
});

test('a session cannot silently change learner, version, or item order', () => {
  const existing = claimCloudSession(null, candidate).record;
  assert.throws(() => claimCloudSession(existing, { ...candidate, learnerId: 'jess' }), /session_identity_mismatch/);
  assert.throws(() => claimCloudSession(existing, { ...candidate, contentVersion: 4 }), /session_content_version_mismatch/);
  assert.throws(() => saveCloudSession(existing, { ...candidate, ownerEpoch: 1, expectedRevision: 1, orderedItemIds: ['q2', 'q1'] }), /session_content_order_mismatch/);
});

test('the Firebase transaction adapter loads with claim and save operations', async () => {
  const adapter = await import('../src/persistence/firebaseSessionStore.js');
  assert.equal(typeof adapter.claimRemoteSession, 'function');
  assert.equal(typeof adapter.saveRemoteSession, 'function');
});
