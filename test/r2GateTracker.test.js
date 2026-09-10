import test from 'node:test';
import assert from 'node:assert/strict';
import { gateStateLabel, r2GateTracker } from '../src/data/r2GateTracker.js';

test('R2 gate tracker exposes every remaining external dependency without a false ready state', () => {
  assert.deepEqual(r2GateTracker.map((gate) => gate.id), ['c0-audio-review', 'shared-identity', 'ipad-check', 'pilot-approval', 'family-pilot', 'c1-c2']);
  assert.ok(r2GateTracker.every((gate) => gate.state !== 'ready'));
  assert.equal(gateStateLabel('requires_device_test'), 'Needs real-device test');
});

test('the tracker states the pilot approval that was actually recorded', () => {
  const gate = r2GateTracker.find((entry) => entry.id === 'pilot-approval');
  // It said no content was pilot-approved long after the parent approved some.
  assert.doesNotMatch(gate.detail, /no content is pilot-approved/);
  assert.match(gate.detail, /2026-09-09/);
  assert.match(gate.detail, /Part A prompts stay excluded/);
  // Approved in part is still not released, and the label must not imply otherwise.
  assert.notEqual(gate.state, 'ready');
  assert.equal(gateStateLabel(gate.state), 'Granted for part of the content');
  assert.match(gate.detail, /never validated progress/);
});
