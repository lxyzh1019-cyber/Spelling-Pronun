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
import { CHECK_LOG_KEY, DEFAULT_TESTER, clearCheckResult, readCheckLog, recordCheckResult } from '../src/persistence/checkLog.js';
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
    // Every check belongs to exactly one area, and the areas mean different things.
    assert.ok(['testlab', 'pilot'].includes(check.area), `${check.id} has no area`);
  });
});

test('the audio checks are derived from the assessment, not typed out here', () => {
  const dictation = findCheck('check.listening.dictation');
  const contrast = findCheck('check.listening.contrast');
  const decoding = findCheck('check.decoding.recordings');
  // Each names the group it derives from, so a row cannot drift from the real item.
  assert.deepEqual(
    [dictation, contrast, decoding].map((check) => check.promptSource.group),
    ['dictation', 'contrast', 'decoding']
  );
  assert.equal(dictation.prompts.length, 16);
  assert.equal(contrast.prompts.length, 16, 'both sides of eight pairs');
  assert.equal(decoding.prompts.length, 12);
  // Every derived prompt carries the item it came from.
  [dictation, contrast, decoding].forEach((check) => {
    check.prompts.forEach((prompt) => {
      assert.ok(prompt.audio?.itemId, `${prompt.id} lost its item`);
      assert.ok(prompt.audio.itemVersion, `${prompt.id} lost its version pin`);
    });
  });
});

test('progress reports what is left, and one problem outranks any number of passes', () => {
  const check = findCheck('check.resume');
  assert.equal(checkProgress(check, {}).status, 'not_started');
  const partial = { [check.prompts[0].id]: { result: 'pass' } };
  assert.deepEqual(
    (({ done, total, status }) => ({ done, total, status }))(checkProgress(check, partial)),
    { done: 1, total: 5, status: 'in_progress' }
  );
  const all = passEverything([check]);
  assert.equal(checkProgress(check, all).status, 'complete');
  all[check.prompts[4].id] = { result: 'problem' };
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

test('a check whose prerequisite is unproven cannot be recorded', () => {
  const twoDevice = findCheck('check.two-device');
  assert.equal(twoDevice.requiresPreflight, 'twoDevice');
  assert.equal(checkAvailability(twoDevice, {}).runnable, false);
  assert.equal(checkAvailability(twoDevice, { preflight: { twoDevice: { ok: true } } }).runnable, true);
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
  const check = findCheck('check.resume');
  check.prompts.forEach((prompt) => recordCheckResult(storage, { promptId: prompt.id, result: 'pass', recordedAt: '2026-09-09T12:00:00.000Z' }));
  assert.equal(deriveMastery([]).status, 'unassessed', 'a full sheet of passes produced no mastery for anyone');
  assert.deepEqual([...storage.entries.keys()], [CHECK_LOG_KEY], 'the log writes to its own key only');
  const stored = JSON.parse(storage.entries.get(CHECK_LOG_KEY));
  Object.values(stored).forEach((entry) => {
    assert.deepEqual(Object.keys(entry).sort(), [
      'appVersion', 'contentVersion', 'deviceLabel', 'history', 'note',
      'observedLearner', 'promptId', 'recordedAt', 'result', 'testedBy',
    ]);
    // A Test Lab row observed no child, so it names none.
    assert.equal(entry.observedLearner, '');
  });
});

test('re-checking a row keeps the earlier result visible', () => {
  const storage = createStorageFake();
  recordCheckResult(storage, { promptId: 'ipad.microphone', result: 'problem', note: 'permission prompt never appeared', recordedAt: '2026-09-09T10:00:00.000Z' });
  const after = recordCheckResult(storage, { promptId: 'ipad.microphone', result: 'pass', recordedAt: '2026-09-10T10:00:00.000Z' });
  assert.equal(after['ipad.microphone'].result, 'pass');
  assert.equal(after['ipad.microphone'].history.length, 1);
  assert.equal(after['ipad.microphone'].history[0].result, 'problem');
  assert.match(after['ipad.microphone'].history[0].note, /never appeared/);
  // Clearing the current answer leaves the history behind rather than erasing the finding.
  const cleared = clearCheckResult(storage, 'ipad.microphone');
  assert.equal(cleared['ipad.microphone'].result, undefined);
  assert.equal(cleared['ipad.microphone'].history.length, 2);
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
  const contrast = findCheck('check.listening.contrast');
  const results = {
    [contrast.prompts[0].id]: { result: 'problem', note: 'ship and sheep sound identical', testedBy: 'Parent', recordedAt: '2026-09-09T10:00:00.000Z' },
    [contrast.prompts[1].id]: { result: 'pass', testedBy: 'Parent', recordedAt: '2026-09-09T10:01:00.000Z' },
  };
  const report = checkReportMarkdown(humanChecks, results, { today: '2026-09-09' });
  assert.match(report, /not mastery evidence and they do not release content/);
  assert.match(report, /\| .*ship \/ sheep.* \| Problem found \| Parent \| — \| ship and sheep sound identical \|/);
  assert.match(report, /Technical Test Lab · Status: Problem found \(2 of 16 recorded\)/);
  // The report has to say which half of the page a row came from.
  assert.match(report, /Test Lab rows ran against an isolated test record and changed no learning progress/);
  assert.match(report, /Family Pilot rows were real learner sessions/);
  assert.match(report, /Nothing recorded yet\./, 'untouched checks are reported as untouched');
  // A note containing a table separator cannot break the table it is written into.
  const escaped = checkReportMarkdown([contrast], { [contrast.prompts[0].id]: { result: 'pass', note: 'a | b' } });
  assert.match(escaped, /\| a \/ b \|/);
});

test('an observation is attributed to the tester, never to whichever child is selected', () => {
  const storage = createStorageFake();
  const ipad = findCheck('check.ipad');
  // A Test Lab row: no child was involved, so none is named.
  let log = recordCheckResult(storage, { promptId: ipad.prompts[0].id, result: 'pass', deviceLabel: 'ipad-9' });
  assert.equal(log[ipad.prompts[0].id].testedBy, DEFAULT_TESTER);
  assert.equal(log[ipad.prompts[0].id].observedLearner, '');
  assert.equal(log[ipad.prompts[0].id].deviceLabel, 'ipad-9');
  // A Family Pilot row: a named child really used the app, and the log says so.
  const pilot = findCheck('check.lesson-journey');
  log = recordCheckResult(storage, { promptId: pilot.prompts[0].id, result: 'pass', observedLearner: 'jenn', deviceLabel: 'ipad-9' });
  assert.equal(log[pilot.prompts[0].id].testedBy, DEFAULT_TESTER, 'the parent ran the check');
  assert.equal(log[pilot.prompts[0].id].observedLearner, 'jenn', 'the child was observed, not the tester');
});

test('observations written by the earlier version still load and still count', () => {
  const storage = createStorageFake();
  const ipad = findCheck('check.ipad');
  // The shape the first release wrote: no tester, no device, and a learner id in recordedBy.
  const legacy = {
    [ipad.prompts[0].id]: { promptId: ipad.prompts[0].id, result: 'problem', note: 'silent', recordedAt: '2026-09-09T10:00:00.000Z', recordedBy: 'jenn' },
    [ipad.prompts[1].id]: { promptId: ipad.prompts[1].id, result: 'pass', recordedAt: '2026-09-09T10:05:00.000Z', recordedBy: 'jenn' },
  };
  storage.setItem(CHECK_LOG_KEY, JSON.stringify(legacy));

  const loaded = readCheckLog(storage);
  assert.deepEqual(loaded, legacy, 'nothing is rewritten on read');
  assert.equal(checkProgress(ipad, loaded).done, 2, 'old results still count toward the check');
  assert.equal(checkProgress(ipad, loaded).status, 'problem_found');
  // The export tolerates the missing fields rather than printing undefined.
  const report = checkReportMarkdown([ipad], loaded, { today: '2026-09-10' });
  assert.match(report, /\| Parent \| — \| silent \|/);
  assert.doesNotMatch(report, /undefined/);

  // Re-checking an old row keeps it as history and adds the new fields alongside.
  const updated = recordCheckResult(storage, { promptId: ipad.prompts[0].id, result: 'pass', deviceLabel: 'ipad-9', recordedAt: '2026-09-10T09:00:00.000Z' });
  assert.equal(updated[ipad.prompts[0].id].result, 'pass');
  assert.equal(updated[ipad.prompts[0].id].history[0].result, 'problem');
  assert.match(updated[ipad.prompts[0].id].history[0].note, /silent/);
  assert.equal(updated[ipad.prompts[1].id].result, 'pass', 'the other old row is untouched');
  assert.equal(updated[ipad.prompts[1].id].recordedBy, 'jenn', 'and is not silently rewritten');
});
