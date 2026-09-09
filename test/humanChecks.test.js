import test from 'node:test';
import assert from 'node:assert/strict';
import { humanChecks, findCheck } from '../src/data/humanChecks.js';
import {
  RESULT_VALUES,
  checkAvailability,
  checkProgress,
  checkReportMarkdown,
  evidenceContributionOf,
  gateStateAfterChecks,
  isResultValue,
  nextPrompt,
  summariseChecks,
} from '../src/learning/humanChecks.js';
import { CHECK_LOG_KEY, clearCheckResult, readCheckLog, recordCheckResult } from '../src/persistence/checkLog.js';
import { r2GateTracker } from '../src/data/r2GateTracker.js';
import { createStorageFake } from './fakes/storageFake.js';
import { deriveMastery } from '../src/learning/mastery.js';

function passEverything(checks) {
  const results = {};
  checks.forEach((check) => check.prompts.forEach((prompt) => {
    results[prompt.id] = { promptId: prompt.id, result: 'pass', recordedAt: '2026-09-09T12:00:00.000Z' };
  }));
  return results;
}

test('every check names a real gate, the steps to follow, and what it does not unlock', () => {
  assert.ok(humanChecks.length > 0);
  const gateIds = new Set(r2GateTracker.map((gate) => gate.id));
  const promptIds = humanChecks.flatMap((check) => check.prompts.map((prompt) => prompt.id));
  assert.equal(new Set(promptIds).size, promptIds.length, 'prompt ids must be unique across all checks');
  humanChecks.forEach((check) => {
    assert.ok(gateIds.has(check.gateId), `${check.id} points at an unknown gate`);
    assert.ok(check.purpose && check.steps.length > 0 && check.passWhen.length > 0, `${check.id} is missing instructions`);
    // The honesty rule: every check states its own limit, so a pass is never read as more than it is.
    assert.ok(check.doesNotUnlock, `${check.id} does not say what it fails to unlock`);
    assert.ok(check.prompts.length > 0);
  });
});

test('the listening check covers exactly the prompts the audio handoff lists', () => {
  const dictation = findCheck('check.listening.dictation');
  const contrast = findCheck('check.listening.contrast');
  const decoding = findCheck('check.decoding.recordings');
  assert.equal(dictation.prompts.length, 16);
  assert.equal(contrast.prompts.length, 8);
  assert.equal(decoding.prompts.length, 12);
  // Each decoding word contributes three recordings, and exactly one of them is the expected reading.
  ['Narpish', 'Vemicate', 'Tembish', 'Lopadent'].forEach((word) => {
    const rows = decoding.prompts.filter((prompt) => prompt.label.startsWith(word));
    assert.equal(rows.length, 3, `${word} needs three recordings`);
    assert.equal(rows.filter((row) => row.detail.includes('the expected reading')).length, 1);
  });
});

test('progress reports what is left, and one problem outranks any number of passes', () => {
  const check = findCheck('check.assessment-resume');
  assert.equal(checkProgress(check, {}).status, 'not_started');
  const partial = { [check.prompts[0].id]: { result: 'pass' } };
  assert.deepEqual(
    (({ done, total, status }) => ({ done, total, status }))(checkProgress(check, partial)),
    { done: 1, total: 3, status: 'in_progress' }
  );
  const all = passEverything([check]);
  assert.equal(checkProgress(check, all).status, 'complete');
  all[check.prompts[2].id] = { result: 'problem' };
  assert.equal(checkProgress(check, all).status, 'problem_found');
  // An unsure row is not a pass; the check stays open.
  const unsure = { ...passEverything([check]), [check.prompts[1].id]: { result: 'unclear' } };
  assert.equal(checkProgress(check, unsure).status, 'needs_another_look');
});

test('the next row is the first unrecorded one, then anything left unsure', () => {
  const check = findCheck('check.listening.contrast');
  assert.equal(nextPrompt(check, {}).id, check.prompts[0].id);
  const results = { [check.prompts[0].id]: { result: 'unclear' }, [check.prompts[1].id]: { result: 'pass' } };
  assert.equal(nextPrompt(check, results).id, check.prompts[2].id, 'unrecorded rows come first');
  const done = passEverything([check]);
  done[check.prompts[5].id] = { result: 'unclear' };
  assert.equal(nextPrompt(check, done).id, check.prompts[5].id, 'then come back to the unsure row');
  assert.equal(nextPrompt(check, passEverything([check])), null);
});

test('a check whose prerequisite is missing cannot be recorded', () => {
  const twoDevice = findCheck('check.two-device');
  assert.ok(twoDevice.blockedBy, 'the two-device check depends on Firebase setup');
  assert.equal(checkAvailability(twoDevice, {}).runnable, false);
  assert.match(checkAvailability(twoDevice, {}).reason, /Email\/Password/);
  assert.equal(checkAvailability(twoDevice, { setupComplete: true }).runnable, true);
  // Checks with no prerequisite are always runnable.
  assert.equal(checkAvailability(findCheck('check.ipad'), {}).runnable, true);
});

test('recording every row as a pass leaves every release gate exactly where it was', () => {
  const results = passEverything(humanChecks);
  r2GateTracker.forEach((gate) => {
    const before = gate.state;
    const view = gateStateAfterChecks(gate, humanChecks, results);
    assert.equal(view.state, before, `${gate.id} must not move because someone ticked boxes`);
    if (view.note) assert.match(view.note, /not the gate itself/);
  });
  const summary = summariseChecks(humanChecks, results);
  assert.equal(summary.recordedPrompts, summary.totalPrompts);
  // There is deliberately no "ready" or "released" field to read.
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'ready'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'released'), false);
});

test('a recorded observation is never mastery evidence', () => {
  RESULT_VALUES.forEach((value) => assert.equal(evidenceContributionOf(value), 'parent_observation'));
  assert.equal(isResultValue('mastered'), false);
  // The log is a separate store with a separate shape; mastery derives from attempts alone.
  const storage = createStorageFake();
  const check = findCheck('check.lesson-journey');
  check.prompts.forEach((prompt) => recordCheckResult(storage, { promptId: prompt.id, result: 'pass', recordedAt: '2026-09-09T12:00:00.000Z' }));
  assert.equal(deriveMastery([]).status, 'unassessed', 'six recorded passes produced no mastery for anyone');
  assert.deepEqual([...storage.entries.keys()], [CHECK_LOG_KEY], 'the log writes to its own key only');
  const stored = JSON.parse(storage.entries.get(CHECK_LOG_KEY));
  Object.values(stored).forEach((entry) => {
    assert.deepEqual(Object.keys(entry).sort(), ['history', 'note', 'promptId', 'recordedAt', 'recordedBy', 'result']);
  });
});

test('re-checking a row keeps the earlier result visible', () => {
  const storage = createStorageFake();
  recordCheckResult(storage, { promptId: 'ipad.offline', result: 'problem', note: 'second answer never arrived', recordedAt: '2026-09-09T10:00:00.000Z' });
  const after = recordCheckResult(storage, { promptId: 'ipad.offline', result: 'pass', recordedAt: '2026-09-10T10:00:00.000Z' });
  assert.equal(after['ipad.offline'].result, 'pass');
  assert.equal(after['ipad.offline'].history.length, 1);
  assert.equal(after['ipad.offline'].history[0].result, 'problem');
  assert.match(after['ipad.offline'].history[0].note, /never arrived/);
  // Clearing the current answer leaves the history behind rather than erasing the finding.
  const cleared = clearCheckResult(storage, 'ipad.offline');
  assert.equal(cleared['ipad.offline'].result, undefined);
  assert.equal(cleared['ipad.offline'].history.length, 2);
  assert.equal(checkProgress(findCheck('check.ipad'), cleared).done, 0);
});

test('the log survives a reload, ignores nonsense, and never throws when storage is blocked', () => {
  const storage = createStorageFake();
  recordCheckResult(storage, { promptId: 'ipad.install', result: 'pass', recordedAt: '2026-09-09T10:00:00.000Z' });
  assert.equal(readCheckLog(storage)['ipad.install'].result, 'pass');
  // An unknown result value is refused rather than stored.
  const unchanged = recordCheckResult(storage, { promptId: 'ipad.touch', result: 'excellent' });
  assert.equal(unchanged['ipad.touch'], undefined);
  storage.entries.set(CHECK_LOG_KEY, 'not json');
  assert.deepEqual(readCheckLog(storage), {});
  const blocked = createStorageFake({ failOnWrite: true });
  assert.doesNotThrow(() => recordCheckResult(blocked, { promptId: 'ipad.install', result: 'pass' }));
  assert.deepEqual(readCheckLog(null), {}, 'no storage at all reads as an empty log');
});

test('the exported log reports the findings and states its own limits', () => {
  const results = {
    'pair.a.1': { result: 'problem', note: 'ship and sheep sound identical', recordedAt: '2026-09-09T10:00:00.000Z' },
    'pair.a.2': { result: 'pass', recordedAt: '2026-09-09T10:01:00.000Z' },
  };
  const report = checkReportMarkdown(humanChecks, results, { today: '2026-09-09' });
  assert.match(report, /not mastery evidence and they do not release content/);
  assert.match(report, /\| ship \/ sheep \| Problem found \| ship and sheep sound identical \|/);
  assert.match(report, /Status: Problem found \(2 of 8 recorded\)/);
  assert.match(report, /Nothing recorded yet\./, 'untouched checks are reported as untouched');
  // A note containing a table separator cannot break the table it is written into.
  const escaped = checkReportMarkdown([findCheck('check.listening.contrast')], { 'pair.a.1': { result: 'pass', note: 'a | b' } });
  assert.match(escaped, /\| a \/ b \|/);
});
