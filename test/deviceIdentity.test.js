import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateDeviceId } from '../src/persistence/deviceIdentity.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a device keeps one stable identifier across page loads', () => {
  const storage = memoryStorage();
  assert.equal(getOrCreateDeviceId(storage, () => 'device-a'), 'device-a');
  assert.equal(getOrCreateDeviceId(storage, () => 'device-b'), 'device-a');
});

test('blocked storage falls back without crashing session startup', () => {
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(typeof getOrCreateDeviceId(blocked), 'string');
});
