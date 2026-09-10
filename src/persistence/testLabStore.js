// Storage for the Test Lab, fenced off by name.
//
// Every key this module writes begins with `spelling-testlab-`. `writeTestRun`
// refuses anything else rather than trusting its caller, so a mistake here
// cannot land on a learner's key. Reset clears the run it is given and nothing
// else — there is deliberately no clear-everything control.

import { createLocalSessionMirror, parseLocalSession } from './durableSession.js';
import { TEST_LAB_LEARNER, createTestRun, testSessionExpectation } from '../learning/testLabRun.js';

export const TEST_LAB_PREFIX = 'spelling-testlab-';

export function isTestLabKey(key) {
  return typeof key === 'string' && key.startsWith(TEST_LAB_PREFIX);
}

export function testLabKey(runId) {
  return `${TEST_LAB_PREFIX}run:${runId}`;
}

export function readTestRun(storage = globalThis.localStorage, runId) {
  const key = testLabKey(runId);
  try {
    const state = parseLocalSession(storage?.getItem(key), testSessionExpectation(runId));
    return state || null;
  } catch {
    return null;
  }
}

export function writeTestRun(storage = globalThis.localStorage, runId, state) {
  const key = testLabKey(runId);
  // The fence: refuse to write anywhere that is not obviously Test Lab storage.
  if (!isTestLabKey(key)) throw new Error('Test Lab storage refused a key outside its namespace');
  try {
    storage?.setItem(key, JSON.stringify(createLocalSessionMirror({
      ...testSessionExpectation(runId),
      state,
    })));
    return true;
  } catch {
    return false;
  }
}

export function resumeTestRun(storage = globalThis.localStorage, runId) {
  const existing = readTestRun(storage, runId);
  if (existing) return { state: existing, resumed: true };
  const state = createTestRun(runId);
  writeTestRun(storage, runId, state);
  return { state, resumed: false };
}

// Clears one run. Never a broad reset.
export function clearTestRun(storage = globalThis.localStorage, runId) {
  try {
    storage?.removeItem(testLabKey(runId));
    return true;
  } catch {
    return false;
  }
}

export { TEST_LAB_LEARNER };
