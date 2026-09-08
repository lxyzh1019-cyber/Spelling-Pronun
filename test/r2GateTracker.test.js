import test from 'node:test';
import assert from 'node:assert/strict';
import { gateStateLabel, r2GateTracker } from '../src/data/r2GateTracker.js';

test('R2 gate tracker exposes every remaining external dependency without a false ready state', () => {
  assert.deepEqual(r2GateTracker.map((gate) => gate.id), ['c0-audio-review', 'shared-identity', 'ipad-check', 'pilot-approval', 'family-pilot', 'c1-c2']);
  assert.ok(r2GateTracker.every((gate) => gate.state !== 'ready'));
  assert.equal(gateStateLabel('requires_device_test'), 'Needs real-device test');
});
