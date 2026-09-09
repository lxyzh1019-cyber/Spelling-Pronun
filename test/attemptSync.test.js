import test from 'node:test';
import assert from 'node:assert/strict';
import { syncLearnerAttempts } from '../src/persistence/attemptSync.js';
import { flushOutbox, queueAttempt, queueOutboxEntry, useDatabaseOpener } from '../src/persistence/indexedDb.js';
import { createIndexedDbFake } from './fakes/indexedDbFake.js';
import { createFirestoreFake } from './fakes/firestoreFake.js';

// Runs the whole sync sequence: the real outbox, the real write planning, the real merge, against
// in-memory storage and an in-memory account.

function harness({ importDecision = null, remoteSeed = {} } = {}) {
  const cloud = createFirestoreFake();
  for (const [path, data] of Object.entries(remoteSeed)) cloud.seed(path, data);
  const localAttempts = new Map();
  const reconciled = [];
  const io = {
    loadRemoteAttempts: async (uid, learnerId) => {
      const snapshot = await cloud.api.getDocs(cloud.api.query(cloud.api.collection(cloud.db, 'spelling-attempts'), cloud.api.where('userId', '==', uid), cloud.api.where('learnerId', '==', learnerId)));
      return snapshot.docs.map((entry) => entry.data());
    },
    loadRemoteProgress: async () => ({}),
    readImportDecision: async () => importDecision,
    readLocalAttempts: async (learnerId) => localAttempts.get(learnerId) || [],
    writeLocalAttempts: async (learnerId, attempts) => { localAttempts.set(learnerId, attempts); },
    flushOutbox,
    writeDocument: async (write) => {
      const ref = cloud.api.doc(cloud.db, write.collection, write.id);
      if (write.mode === 'create-if-missing') {
        const existing = await cloud.api.getDoc(ref);
        if (!existing.exists()) await cloud.api.setDoc(ref, write.data);
        return;
      }
      await cloud.api.setDoc(ref, write.data, { merge: true });
    },
    reconcileWords: async (learnerId, wordIds) => { reconciled.push([learnerId, wordIds]); },
  };
  return { cloud, io, localAttempts, reconciled };
}

test('answers made offline reconcile exactly once when the connection returns', async () => {
  const store = createIndexedDbFake();
  const restore = useDatabaseOpener(store.open);
  try {
    const { cloud, io, localAttempts } = harness();
    const attempts = Array.from({ length: 5 }, (_, index) => ({ attemptId: `a${index}`, learnerId: 'jenn', itemId: `i${index}`, correct: true }));
    for (const attempt of attempts) await queueAttempt(attempt);
    localAttempts.set('jenn', attempts);

    const first = await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: true, io });
    assert.equal(first.pushed, true);
    assert.equal(cloud.writeCount(), 5, 'five answers, five documents');
    assert.equal(first.merged.length, 5);

    // Reconnecting again must not write them a second time.
    const writesAfterFirst = cloud.writeCount();
    const second = await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: true, io });
    assert.equal(cloud.writeCount(), writesAfterFirst, 'a repeated sync writes nothing new');
    assert.equal(second.merged.length, 5, 'and does not duplicate the local record');
  } finally { restore(); }
});

test('a sync sends only the learner it is syncing', async () => {
  const store = createIndexedDbFake();
  const restore = useDatabaseOpener(store.open);
  try {
    const { cloud, io, localAttempts } = harness();
    await queueAttempt({ attemptId: 'jenn1', learnerId: 'jenn', itemId: 'i1' });
    await queueAttempt({ attemptId: 'jess1', learnerId: 'jess', itemId: 'i1' });
    localAttempts.set('jenn', [{ attemptId: 'jenn1', learnerId: 'jenn' }]);
    localAttempts.set('jess', [{ attemptId: 'jess1', learnerId: 'jess' }]);

    await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: true, io });
    assert.ok(cloud.read('spelling-attempts/u1_jenn_jenn1'), "Jenn's answer reached the account");
    assert.equal(cloud.read('spelling-attempts/u1_jess_jess1'), undefined, "Jess's answer stayed on the device");

    await syncLearnerAttempts({ uid: 'u1', learnerId: 'jess', isAnonymous: true, io });
    assert.ok(cloud.read('spelling-attempts/u1_jess_jess1'), 'and sends when it is her turn');
  } finally { restore(); }
});

test('an account that already holds history is not merged into until the parent decides', async () => {
  const store = createIndexedDbFake();
  const restore = useDatabaseOpener(store.open);
  try {
    const { cloud, io, localAttempts } = harness({
      remoteSeed: { 'spelling-attempts/u1_jenn_old1': { userId: 'u1', learnerId: 'jenn', attemptId: 'old1' } },
    });
    await queueAttempt({ attemptId: 'new1', learnerId: 'jenn', itemId: 'i1' });
    localAttempts.set('jenn', [{ attemptId: 'new1', learnerId: 'jenn' }]);

    const blocked = await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: false, io });
    assert.equal(blocked.pushed, false, 'nothing is pushed');
    assert.equal(blocked.held, 1, 'and the device says how much is waiting');
    assert.equal(cloud.read('spelling-attempts/u1_jenn_new1'), undefined);
    // The device still learns what the account holds.
    assert.deepEqual(blocked.merged.map(({ attemptId }) => attemptId).sort(), ['new1', 'old1']);

    // After the parent imports, the same call pushes.
    const imported = await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: false, push: 'force', io });
    assert.equal(imported.pushed, true);
    assert.equal(imported.held, 0);
    assert.ok(cloud.read('spelling-attempts/u1_jenn_new1'));
  } finally { restore(); }
});

test('word totals are recomputed only after the answers they derive from are written', async () => {
  const store = createIndexedDbFake();
  const restore = useDatabaseOpener(store.open);
  try {
    const { cloud, io, reconciled, localAttempts } = harness();
    await queueOutboxEntry({ id: 'w1', kind: 'word-attempt', payload: { attemptId: 'w1', learnerId: 'jenn', wordId: 'grade-4__accident', correct: true, evidenceType: 'independent_spelling' } });
    localAttempts.set('jenn', []);

    await syncLearnerAttempts({ uid: 'u1', learnerId: 'jenn', isAnonymous: true, io });
    assert.ok(cloud.read('spelling-attempts/u1_jenn_w1'), 'the immutable answer is written');
    assert.deepEqual(reconciled, [['jenn', ['grade-4__accident']]], 'and its word total is recomputed afterwards');
  } finally { restore(); }
});
