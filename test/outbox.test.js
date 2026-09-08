import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverOutbox, planOutboxWrites } from '../src/persistence/outboxSync.js';

function queue(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `a${index + 1}`, kind: 'attempt', payload: { attemptId: `a${index + 1}`, learnerId: 'jenn' } }));
}

test('a failed delivery keeps that entry and every later entry queued, then a retry sends each once', async () => {
  const queued = queue(5);
  const sent = [];
  let failures = 0;
  const remove = async (id) => { queued.splice(queued.findIndex((entry) => entry.id === id), 1); };
  const flakySend = async (entry) => {
    if (entry.id === 'a3' && failures === 0) { failures += 1; throw new Error('offline'); }
    sent.push(entry.id);
  };
  const first = await deliverOutbox([...queued], { send: flakySend, remove });
  assert.deepEqual(first.map(({ status }) => status), ['sent', 'sent', 'failed', 'sent', 'sent']);
  assert.deepEqual(queued.map(({ id }) => id), ['a3'], 'only the failed entry remains queued');

  const second = await deliverOutbox([...queued], { send: flakySend, remove });
  assert.deepEqual(second, [{ id: 'a3', status: 'sent' }]);
  assert.equal(queued.length, 0);
  assert.deepEqual([...sent].sort(), ['a1', 'a2', 'a3', 'a4', 'a5'], 'every entry was written exactly once');
});

test('reconnect flush plans idempotent writes and defers word totals to a derivation', () => {
  const lesson = planOutboxWrites({ kind: 'attempt', payload: { attemptId: 'x', learnerId: 'jess', correct: true } }, { uid: 'u1' });
  assert.equal(lesson.length, 1);
  assert.equal(lesson[0].mode, 'create-if-missing');
  assert.equal(lesson[0].id, 'u1_jess_x');
  assert.equal(lesson[0].data.userId, 'u1');

  const word = planOutboxWrites(
    { kind: 'word-attempt', payload: { attemptId: 'y', learnerId: 'jess', wordId: 'w1', correct: true, evidenceType: 'independent_dictation' } },
    { uid: 'u1' },
  );
  assert.equal(word.length, 2);
  assert.equal(word[0].mode, 'create-if-missing');
  assert.equal(word[0].collection, 'spelling-attempts');
  assert.deepEqual(word[1], { mode: 'reconcile-progress', learnerId: 'jess', wordId: 'w1' });
  // The plan carries no totals at all, so a flush cannot push this device's counts over another's.
  assert.ok(!word.some((write) => write.collection === 'spelling-progress'), 'totals are derived, not written from the device');
});

test('outbox planning refuses to write without an authenticated owner or an unknown kind', () => {
  assert.deepEqual(planOutboxWrites({ kind: 'attempt', payload: { attemptId: 'x', learnerId: 'jess' } }, { uid: null }), []);
  assert.deepEqual(planOutboxWrites({ kind: 'mystery', payload: { attemptId: 'x' } }, { uid: 'u1' }), []);
});
