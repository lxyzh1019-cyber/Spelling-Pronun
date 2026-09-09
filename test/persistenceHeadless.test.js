import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteRecording, flushOutbox, listOutbox, loadRecording, loadSession, queueAttempt, queueOutboxEntry, saveSession, useDatabaseOpener } from '../src/persistence/indexedDb.js';
import { claimRemoteSession, saveRemoteSession } from '../src/persistence/firebaseSessionStore.js';
import { createIndexedDbFake } from './fakes/indexedDbFake.js';
import { createFirestoreFake } from './fakes/firestoreFake.js';

// These run the real persistence functions against in-memory stores. No browser, no Firebase.

test('an attempt queued for the cloud is stored once and removed only when it is sent', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    await queueAttempt({ attemptId: 'a1', learnerId: 'jenn', wordId: 'w1' });
    await queueAttempt({ attemptId: 'a1', learnerId: 'jenn', wordId: 'w1' });
    assert.equal((await listOutbox()).length, 1, 'requeuing the same attempt does not duplicate it');
    // The attempt itself is kept as well as the outbox entry, so a failed send never loses it.
    assert.equal(fake.contents('attempts').length, 1);

    const sent = [];
    await flushOutbox(async (entry) => { sent.push(entry.payload.attemptId); });
    assert.deepEqual(sent, ['a1']);
    assert.equal((await listOutbox()).length, 0, 'a sent entry leaves the queue');
  } finally { restore(); }
});

test('a send that throws leaves the entry queued for the next flush', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    await queueAttempt({ attemptId: 'a1', learnerId: 'jenn' });
    await queueAttempt({ attemptId: 'a2', learnerId: 'jenn' });
    let firstTry = true;
    const results = await flushOutbox(async (entry) => {
      if (entry.id === 'a1' && firstTry) { firstTry = false; throw new Error('offline'); }
    });
    assert.equal(results.filter(({ status }) => status === 'failed').length, 1);
    assert.deepEqual((await listOutbox()).map(({ id }) => id), ['a1'], 'only the failed entry is still queued');
    await flushOutbox(async () => {});
    assert.equal((await listOutbox()).length, 0, 'the retry clears it');
  } finally { restore(); }
});

test('one learner is not flushed under another learner import decision', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    await queueAttempt({ attemptId: 'a1', learnerId: 'jenn' });
    await queueAttempt({ attemptId: 'b1', learnerId: 'jess' });
    const sent = [];
    await flushOutbox(async (entry) => { sent.push(entry.id); }, { accept: (entry) => entry.payload.learnerId === 'jenn' });
    assert.deepEqual(sent, ['a1']);
    assert.deepEqual((await listOutbox()).map(({ id }) => id), ['b1'], "the other learner's answer is untouched");
  } finally { restore(); }
});

test('a saved session is not replaced by an older revision', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    const session = { id: 'spelling-lesson:jenn:pilot-sp-patterns', learnerId: 'jenn', mode: 'lesson', contentVersion: 1, orderedItemIds: ['a', 'b'], revision: 4, state: { index: 3 } };
    await saveSession(session);
    await saveSession({ ...session, revision: 2, state: { index: 1 } });
    const stored = await loadSession(session.id);
    assert.equal(stored.revision, 4, 'a stale writer cannot rewind the saved position');
    assert.equal(stored.state.index, 3);
    await saveSession({ ...session, revision: 5, state: { index: 4 } });
    assert.equal((await loadSession(session.id)).state.index, 4, 'a newer revision is accepted');
  } finally { restore(); }
});

test('a recording can be stored, read back, and deleted from the device', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    const { saveRecording } = await import('../src/persistence/indexedDb.js');
    await saveRecording({ id: 'rec1', itemId: 'c0.assessment.a.19', learnerId: 'jenn', blob: 'audio' });
    assert.equal((await loadRecording('rec1')).itemId, 'c0.assessment.a.19');
    await deleteRecording('rec1');
    assert.equal(await loadRecording('rec1'), undefined, 'delete really removes it');
  } finally { restore(); }
});

test('a queued entry survives a flush that is not allowed to send it', async () => {
  const fake = createIndexedDbFake();
  const restore = useDatabaseOpener(fake.open);
  try {
    await queueOutboxEntry({ id: 'w1', kind: 'word-attempt', payload: { attemptId: 'w1', learnerId: 'jess', wordId: 'word' } });
    await flushOutbox(async () => { throw new Error('should not be called'); }, { accept: () => false });
    assert.equal((await listOutbox()).length, 1);
  } finally { restore(); }
});

test('the cloud session contract runs end to end: claim, read-only, takeover, stale rejection', async () => {
  const cloud = createFirestoreFake();
  const candidate = { userId: 'u1', learnerId: 'jenn', sessionId: 'pilot-sp-patterns', deviceId: 'ipad', revision: 1, state: { index: 0 }, mode: 'lesson', contentVersion: 1, orderedItemIds: ['a', 'b'] };

  const first = await claimRemoteSession(cloud.db, candidate, {}, cloud.ops);
  assert.equal(first.writable, true, 'the first device owns the session');
  assert.equal(first.changed, true);

  const second = await claimRemoteSession(cloud.db, { ...candidate, deviceId: 'laptop' }, {}, cloud.ops);
  assert.equal(second.writable, false, 'a second device is read-only until it takes over');

  const takeover = await claimRemoteSession(cloud.db, { ...candidate, deviceId: 'laptop' }, { takeOver: true }, cloud.ops);
  assert.equal(takeover.writable, true);
  assert.equal(takeover.record.ownerEpoch, 2, 'taking over bumps the owner epoch');
  assert.deepEqual(takeover.record.state, { index: 0 }, 'takeover preserves the state on the server');

  // The device that lost ownership can no longer save.
  await assert.rejects(
    () => saveRemoteSession(cloud.db, { ...candidate, deviceId: 'ipad', ownerEpoch: 1, expectedRevision: 2 }, cloud.ops),
    /stale_session_owner|stale_session_revision/,
  );

  // The new owner can, and the revision advances.
  const saved = await saveRemoteSession(cloud.db, { ...candidate, deviceId: 'laptop', ownerEpoch: 2, expectedRevision: 2, state: { index: 1 } }, cloud.ops);
  assert.equal(saved.revision, 3, 'a successful save advances the revision');
  assert.equal(cloud.read('spelling-sessions/u1__jenn__pilot-sp-patterns').state.index, 1);

  // A save built on a revision the server has already moved past is refused.
  await assert.rejects(
    () => saveRemoteSession(cloud.db, { ...candidate, deviceId: 'laptop', ownerEpoch: 2, expectedRevision: 2, state: { index: 9 } }, cloud.ops),
    /stale_session_revision/,
  );
  assert.equal(cloud.read('spelling-sessions/u1__jenn__pilot-sp-patterns').state.index, 1, 'the rejected save changed nothing');
});

test('saving a session that is not in the cloud is refused rather than silently created', async () => {
  const cloud = createFirestoreFake();
  await assert.rejects(
    () => saveRemoteSession(cloud.db, { userId: 'u1', learnerId: 'jess', sessionId: 'missing', deviceId: 'ipad', revision: 1, state: {} }, cloud.ops),
    /session_not_found/,
  );
});
