import test from 'node:test';
import assert from 'node:assert/strict';
import { claimSessionLease, ownsSessionLease, renewSessionLease, takeOverSessionLease } from '../src/learning/sessionLease.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a second client is read-only until it explicitly takes over', () => {
  const storage = memoryStorage();
  const first = claimSessionLease(storage, 'lesson:jenn:one', 'tab-a', 1_000);
  const second = claimSessionLease(storage, 'lesson:jenn:one', 'tab-b', 2_000);
  assert.equal(first.writable, true);
  assert.equal(second.writable, false);
  const taken = takeOverSessionLease(storage, 'lesson:jenn:one', 'tab-b', 3_000);
  assert.equal(ownsSessionLease(storage, 'lesson:jenn:one', 'tab-b', taken.revision, 3_001), true);
  assert.equal(ownsSessionLease(storage, 'lesson:jenn:one', 'tab-a', first.lease.revision, 3_001), false);
});

test('stale clients cannot renew or write after takeover', () => {
  const storage = memoryStorage();
  const first = claimSessionLease(storage, 'assessment:jenn:a', 'tab-a', 1_000);
  takeOverSessionLease(storage, 'assessment:jenn:a', 'tab-b', 2_000);
  assert.equal(renewSessionLease(storage, 'assessment:jenn:a', 'tab-a', first.lease.revision, 2_500).writable, false);
  assert.equal(ownsSessionLease(storage, 'assessment:jenn:a', 'tab-a', first.lease.revision, 2_500), false);
});

test('an expired lease can be claimed without forced takeover', () => {
  const storage = memoryStorage();
  claimSessionLease(storage, 'review:jenn', 'tab-a', 1_000, 100);
  const next = claimSessionLease(storage, 'review:jenn', 'tab-b', 1_101, 100);
  assert.equal(next.writable, true);
  assert.equal(next.lease.holderId, 'tab-b');
});
