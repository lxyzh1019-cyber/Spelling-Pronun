// The R2 (M3) checklist on the checks page.
//
// What these tests hold:
// - the "from the app" numbers come only from pilot-track answers, never from released, draft or
//   technical-failure attempts, and never from a tick;
// - a 7-day review is a real answer on the same skill at least seven days after the first one;
// - ticks, notes and problem rows survive a reload and a blocked storage never throws;
// - a Critical or High problem keeps the exit check unticked until it is resolved, and a tick it
//   held back is cleared rather than coming back by itself;
// - nothing on the checklist moves a release gate, however much of it is ticked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createStorageFake } from './fakes/storageFake.js';
import { r2ChecklistItems, R2_CHECKLIST_GROUPS } from '../src/data/r2Checklist.js';
import { r2GateTracker } from '../src/data/r2GateTracker.js';
import { humanChecks } from '../src/data/humanChecks.js';
import { gateStateAfterChecks } from '../src/learning/humanChecks.js';
import { derivePilotExposure } from '../src/learning/pilotExposure.js';
import {
  CHECKLIST_COMPLETE_MESSAGE,
  DECISIONS,
  checklistProgress,
  decisionLabel,
  r2ChecklistFilename,
  r2ChecklistMarkdown,
  testLabLine,
} from '../src/learning/r2Checklist.js';
import {
  R2_CHECKLIST_KEY,
  addProblem,
  readR2Checklist,
  setChecklistTick,
  updateProblem,
} from '../src/persistence/r2ChecklistStore.js';
import { CHECK_LOG_KEY } from '../src/persistence/checkLog.js';

const learners = [
  { id: 'p1', name: 'First child' },
  { id: 'p2', name: 'Second child' },
];

const DAY = 24 * 60 * 60 * 1000;
function at(iso, days = 0, hours = 0) {
  return new Date(new Date(iso).getTime() + (days * DAY) + (hours * 60 * 60 * 1000)).toISOString();
}

let counter = 0;
function attempt({ learnerId = 'p1', eventTime, edmontonDate, skill = 'SP.patterns', itemId = 'item-1', contentStatus = 'pilot_approved', technicalFailure = false, noSkill = false }) {
  counter += 1;
  return {
    attemptId: `a${counter}`,
    learnerId,
    sessionId: 's1',
    itemId,
    skillIds: noSkill ? undefined : [skill],
    eventTime,
    edmontonDate: edmontonDate || eventTime.slice(0, 10),
    contentStatus,
    technicalFailure,
  };
}

const START = '2026-10-01T16:00:00.000Z';

test('two pilot days read 2 of 2, with the first and latest day', () => {
  const attempts = [
    attempt({ eventTime: START }),
    attempt({ eventTime: at(START, 0, 1) }),
    attempt({ eventTime: at(START, 2) }),
  ];
  const [first] = derivePilotExposure(attempts, learners, '2026-10-05', { diagnosticItemCount: 48 });
  assert.equal(first.learnerId, 'p1');
  assert.equal(first.days, 2);
  assert.equal(first.daysTarget, 2);
  assert.equal(first.visitsMet, true);
  assert.equal(first.firstDay, '2026-10-01');
  assert.equal(first.latestDay, '2026-10-03');
});

test('released-track, unreleased and technical-failure answers are ignored, and so is the other child', () => {
  const attempts = [
    attempt({ eventTime: START }),
    attempt({ eventTime: at(START, 1), contentStatus: 'released' }),
    attempt({ eventTime: at(START, 2), contentStatus: 'not_released' }),
    attempt({ eventTime: at(START, 3), contentStatus: 'draft' }),
    attempt({ eventTime: at(START, 4), technicalFailure: true }),
    attempt({ eventTime: at(START, 8), contentStatus: 'released' }),
    attempt({ learnerId: 'p2', eventTime: at(START, 9) }),
  ];
  const [first, second] = derivePilotExposure(attempts, learners, '2026-10-20', { diagnosticItemCount: 48 });
  assert.equal(first.days, 1, 'only the one pilot-track answer counts');
  assert.equal(first.visitsMet, false);
  assert.equal(first.review.found, false, 'a released answer 8 days later is not a pilot review');
  assert.equal(second.days, 1, 'the other child keeps her own count');
  assert.equal(second.firstDay, '2026-10-10');
});

test('a review 7 days after a skill was first practised is found; one at 6 days is not', () => {
  const sixDays = [
    attempt({ eventTime: START, skill: 'SP.patterns' }),
    attempt({ eventTime: at(START, 6, 23), skill: 'SP.patterns' }),
    // Seven days later, but on a different skill: not a review of the first one.
    attempt({ eventTime: at(START, 7, 1), skill: 'PU.dialogue' }),
  ];
  const [notYet] = derivePilotExposure(sixDays, learners, '2026-10-09', { diagnosticItemCount: 48 });
  assert.equal(notYet.review.found, false);
  assert.equal(notYet.review.earliestDay, '2026-10-08');

  const sevenDays = [...sixDays, attempt({ eventTime: at(START, 7), skill: 'SP.patterns' })];
  const [found] = derivePilotExposure(sevenDays, learners, '2026-10-09', { diagnosticItemCount: 48 });
  assert.equal(found.review.found, true);
  assert.equal(found.review.skill, 'SP.patterns');
  assert.equal(found.review.firstDay, '2026-10-01');
  assert.equal(found.review.reviewDay, '2026-10-08');
});

test('an attempt without a skill is matched by its item instead', () => {
  const attempts = [
    attempt({ eventTime: START, itemId: 'x.1', noSkill: true }),
    attempt({ eventTime: at(START, 7), itemId: 'x.2', noSkill: true }),
  ];
  assert.equal(derivePilotExposure(attempts, learners, '2026-10-09', { diagnosticItemCount: 48 })[0].review.found, false);
  attempts.push(attempt({ eventTime: at(START, 8), itemId: 'x.1', noSkill: true }));
  assert.equal(derivePilotExposure(attempts, learners, '2026-10-09', { diagnosticItemCount: 48 })[0].review.found, true);
});

test('the starting result is done by a finished assessment or diagnostic, otherwise it lists what is pending', () => {
  const withBaselines = [
    { ...learners[0], assessments: [{ form: 'A', completedAt: '2026-09-30T10:00:00.000Z' }] },
    { ...learners[1], diagnosticRun: { answers: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`d${i}`, {}])) } },
    { id: 'p3', name: 'Third', diagnosticRun: { answers: Object.fromEntries(Array.from({ length: 48 }, (_, i) => [`d${i}`, {}])) } },
  ];
  const [a, b, c] = derivePilotExposure([], withBaselines, '2026-10-01', { diagnosticItemCount: 48 });
  assert.equal(a.baseline.done, true);
  assert.match(a.baseline.summary, /form A/);
  assert.equal(b.baseline.done, false);
  assert.deepEqual(b.baseline.pending, ['the assessment (form A or B)', 'the below-grade diagnostic (12 of 48 answered)']);
  assert.equal(c.baseline.done, true);
  assert.match(c.baseline.summary, /diagnostic/);
  // An unfinished assessment in the history is not a baseline.
  const [d] = derivePilotExposure([], [{ id: 'p4', name: 'D', assessments: [{ form: 'B', completedAt: null }] }], '2026-10-01', { diagnosticItemCount: 48 });
  assert.equal(d.baseline.done, false);
});

test('the children come from the profiles given, in that order, with no names built in', async () => {
  const rows = derivePilotExposure([], [{ id: 'z', name: 'Zed' }, { id: 'a', name: 'Ay' }], '2026-10-01', { diagnosticItemCount: 48 });
  assert.deepEqual(rows.map((row) => row.name), ['Zed', 'Ay']);
  for (const file of ['../src/data/r2Checklist.js', '../src/learning/r2Checklist.js', '../src/learning/pilotExposure.js', '../src/components/R2Checklist.jsx']) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bJenn\b|\bJess\b/, `${file} names a child instead of reading the profiles`);
  }
});

test('ticks, notes and problems survive a reload, in their own key only', () => {
  const storage = createStorageFake();
  let result = setChecklistTick(storage, 'setup.ipad', { done: true, note: 'Worked on the real iPad', at: '2026-10-01T10:00:00.000Z' });
  assert.equal(result.saved, true);
  result = addProblem(storage, { where: 'PU.dialogue question 4', learnerId: 'p1', what: 'Marked wrong for a right answer', severity: 'high', decision: 'open', date: '2026-10-01' }, { id: 'problem-1' });
  assert.equal(result.saved, true);
  assert.equal(result.added, true);
  updateProblem(storage, 'problem-1', { decision: 'fix' });

  const reloaded = readR2Checklist(storage);
  assert.equal(reloaded.ticks['setup.ipad'].done, true);
  assert.equal(reloaded.ticks['setup.ipad'].note, 'Worked on the real iPad');
  assert.equal(reloaded.problems.length, 1);
  assert.equal(reloaded.problems[0].decision, 'fix');
  assert.equal(reloaded.problems[0].severity, 'high');
  assert.deepEqual([...storage.entries.keys()], [R2_CHECKLIST_KEY]);
  assert.equal(storage.entries.has(CHECK_LOG_KEY), false, 'the check log is not touched');
});

test('a problem needs a place and a description, and only known severities and decisions are kept', () => {
  const storage = createStorageFake();
  assert.equal(addProblem(storage, { where: '', what: 'something' }).added, false);
  assert.equal(addProblem(storage, { where: 'Lesson 2', what: '  ' }).added, false);
  const { state } = addProblem(storage, { where: 'Lesson 2', what: 'Stuck on the last screen', severity: 'catastrophic', decision: 'ignore' }, { id: 'p', at: '2026-10-02T18:00:00.000Z' });
  assert.equal(state.problems[0].severity, '', 'an unknown severity is left unset, not guessed');
  assert.equal(state.problems[0].decision, 'open', 'an unknown decision stays open');
  assert.equal(state.problems[0].date, '2026-10-02');
  updateProblem(storage, 'p', { severity: 'nonsense', decision: 'quarantine' });
  assert.equal(readR2Checklist(storage).problems[0].severity, '');
  assert.equal(readR2Checklist(storage).problems[0].decision, 'quarantine');
});

test('blocked or broken storage never throws and says it did not save', () => {
  const blocked = createStorageFake({ failOnWrite: true });
  let result;
  assert.doesNotThrow(() => { result = setChecklistTick(blocked, 'setup.ipad', { done: true }); });
  assert.equal(result.saved, false);
  assert.equal(result.state.ticks['setup.ipad'].done, true, 'the page can still show what was ticked this visit');
  assert.doesNotThrow(() => { result = addProblem(blocked, { where: 'x', what: 'y' }); });
  assert.equal(result.saved, false);
  assert.deepEqual(readR2Checklist(null), { ticks: {}, problems: [] });
  const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  assert.deepEqual(readR2Checklist(throwing), { ticks: {}, problems: [] });
  assert.doesNotThrow(() => setChecklistTick(throwing, 'setup.ipad', { done: true }));
  const garbage = createStorageFake();
  garbage.entries.set(R2_CHECKLIST_KEY, 'not json');
  assert.deepEqual(readR2Checklist(garbage), { ticks: {}, problems: [] });
  garbage.entries.set(R2_CHECKLIST_KEY, JSON.stringify({ ticks: [], problems: 'no' }));
  assert.deepEqual(readR2Checklist(garbage), { ticks: {}, problems: [] });
});

test('every item has a group, a real gate and a source; setup items name real Test Lab checks', () => {
  const gateIds = new Set(r2GateTracker.map((gate) => gate.id));
  const groupIds = new Set(R2_CHECKLIST_GROUPS.map((group) => group.id));
  const checkIds = new Set(humanChecks.map((check) => check.id));
  const ids = r2ChecklistItems.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  r2ChecklistItems.forEach((item) => {
    assert.ok(groupIds.has(item.group), `${item.id} has no group`);
    assert.ok(gateIds.has(item.gateId), `${item.id} points at an unknown gate`);
    assert.ok(['app', 'parent'].includes(item.source), `${item.id} has no source`);
    (item.testLabChecks || []).forEach((id) => assert.ok(checkIds.has(id), `${item.id} names unknown check ${id}`));
  });
  assert.deepEqual(r2ChecklistItems.filter((item) => item.group === 'setup').map((item) => item.gateId), ['shared-identity', 'ipad-check', 'c0-audio-review']);
  assert.deepEqual(r2ChecklistItems.filter((item) => item.group === 'exit').length, 4);
});

test('the Test Lab line counts what was recorded for the linked checks', () => {
  const ipad = humanChecks.find((check) => check.id === 'check.ipad');
  const results = {
    [ipad.prompts[0].id]: { result: 'pass' },
    [ipad.prompts[1].id]: { result: 'pass' },
    [ipad.prompts[2].id]: { result: 'pass' },
    [ipad.prompts[3].id]: { result: 'problem' },
  };
  assert.equal(testLabLine(['check.ipad', 'check.resume'], humanChecks, results), 'Test Lab: 3 passed, 1 problem');
  assert.equal(testLabLine(['check.ipad'], humanChecks, {}), 'Test Lab: nothing recorded yet');
});

function fullExposure() {
  const attempts = learners.flatMap((learner) => [
    attempt({ learnerId: learner.id, eventTime: START }),
    attempt({ learnerId: learner.id, eventTime: at(START, 7) }),
  ]);
  const withBaseline = learners.map((learner) => ({ ...learner, assessments: [{ form: 'A', completedAt: START }] }));
  return derivePilotExposure(attempts, withBaseline, '2026-10-09', { diagnosticItemCount: 48 });
}

function tickEverything(storage) {
  r2ChecklistItems.filter((item) => item.source === 'parent').forEach((item) => {
    if (item.perLearner) learners.forEach((learner) => setChecklistTick(storage, `${item.id}:${learner.id}`, { done: true }));
    else setChecklistTick(storage, item.id, { done: true });
  });
  return readR2Checklist(storage);
}

test('N of M done counts app items from the numbers and parent items from the ticks', () => {
  const storage = createStorageFake();
  const empty = checklistProgress({ items: r2ChecklistItems, learners, state: readR2Checklist(storage), exposure: derivePilotExposure([], learners, '2026-10-01', { diagnosticItemCount: 48 }) });
  // 3 setup + (3 from the app + 1 ticked) per child + 4 exit.
  assert.equal(empty.total, 3 + (4 * learners.length) + 4);
  assert.equal(empty.done, 0);
  assert.equal(empty.complete, false);

  // A tick stored against an app item is not how an app item gets done.
  setChecklistTick(storage, 'pilot.visits:p1', { done: true });
  const forged = checklistProgress({ items: r2ChecklistItems, learners, state: readR2Checklist(storage), exposure: derivePilotExposure([], learners, '2026-10-01', { diagnosticItemCount: 48 }) });
  assert.equal(forged.done, 0, 'an app number cannot be ticked by hand');

  const state = tickEverything(storage);
  const done = checklistProgress({ items: r2ChecklistItems, learners, state, exposure: fullExposure() });
  assert.equal(done.done, done.total);
  assert.equal(done.complete, true);
  assert.equal(CHECKLIST_COMPLETE_MESSAGE, 'Everything on this list is done — you can decide R2 is complete.');
});

const exitIds = () => r2ChecklistItems.filter((item) => item.group === 'exit').map((item) => item.id);
const tickExit = (storage) => exitIds().forEach((id) => setChecklistTick(storage, id, { done: true, note: `note for ${id}` }));
const progressOf = (storage) => checklistProgress({ items: r2ChecklistItems, learners, state: readR2Checklist(storage), exposure: fullExposure() });

test('a Critical or High problem blocks the exit check while its decision is open or fix', () => {
  for (const severity of ['critical', 'high']) {
    for (const decision of ['open', 'fix']) {
      const storage = createStorageFake();
      tickEverything(storage);
      addProblem(storage, { where: 'Lesson 1', learnerId: 'p1', what: 'Progress lost after reload', severity, decision }, { id: 'c1' });
      const progress = progressOf(storage);
      const exitRows = progress.rows.filter((row) => row.item.group === 'exit');
      assert.ok(exitRows.every((row) => !row.done && row.blockedReason), `${severity}/${decision} did not hold every exit row back`);
      assert.equal(progress.complete, false);
      // Once the problem is resolved nothing is blocked, and nothing is done until re-ticked.
      tickExit(storage);
      assert.ok(exitIds().every((id) => !readR2Checklist(storage).ticks[id]), 'a held-back row could be ticked');
    }
  }
});

test('a Critical or High problem stops blocking only when fixed and checked, accepted or quarantined', () => {
  for (const decision of ['fixed', 'accept', 'quarantine']) {
    const storage = createStorageFake();
    tickEverything(storage);
    addProblem(storage, { where: 'Lesson 1', what: 'Right answer marked wrong', severity: 'high' }, { id: 'h1' });
    updateProblem(storage, 'h1', { decision });
    tickExit(storage);
    const progress = progressOf(storage);
    assert.ok(progress.rows.filter((row) => row.item.group === 'exit').every((row) => row.done && !row.blockedReason), `${decision} still blocks`);
    assert.equal(progress.complete, true);
  }
});

test('Medium and Low problems never hold the exit check back, but still need a decision for their own row', () => {
  const storage = createStorageFake();
  tickEverything(storage);
  addProblem(storage, { where: 'Story 1', what: 'A word is misspelled', severity: 'low' }, { id: 'l1' });
  addProblem(storage, { where: 'Lesson 3', what: 'Confusing wording', severity: 'medium', decision: 'fix' }, { id: 'm1' });
  let progress = progressOf(storage);
  const decided = progress.rows.find((row) => row.item.id === 'exit.problems-decided');
  assert.equal(decided.done, false, 'a Low problem still marked open has no decision yet');
  assert.ok(progress.rows.filter((row) => row.item.group === 'exit' && row.item.id !== 'exit.problems-decided').every((row) => row.done), 'a Medium or Low problem held back another exit row');

  updateProblem(storage, 'l1', { decision: 'accept' });
  setChecklistTick(storage, 'exit.problems-decided', { done: true });
  progress = progressOf(storage);
  assert.equal(progress.complete, true, 'a Medium problem marked fix counts as decided');

  // A problem with no severity is not decided either.
  addProblem(storage, { where: 'Lesson 4', what: 'Stuck once', decision: 'accept' }, { id: 'n1' });
  assert.equal(progressOf(storage).rows.find((row) => row.item.id === 'exit.problems-decided').done, false);
});

test('an exit tick held back by a problem is cleared, note and all, and never comes back by itself', () => {
  const storage = createStorageFake();
  tickEverything(storage);
  tickExit(storage);
  assert.equal(progressOf(storage).complete, true);

  addProblem(storage, { where: 'Lesson 1', what: 'Progress lost after reload', severity: 'critical' }, { id: 'c1' });
  let state = readR2Checklist(storage);
  exitIds().forEach((id) => assert.equal(state.ticks[id], undefined, `${id} kept its tick while held back`));
  assert.doesNotMatch(JSON.stringify(state.ticks), /note for exit/, 'a held-back note was kept');
  // The setup and per-child ticks are not the exit check and are not touched.
  assert.equal(state.ticks['setup.ipad'].done, true);
  assert.equal(state.ticks['pilot.resumed:p1'].done, true);

  updateProblem(storage, 'c1', { decision: 'fixed' });
  let progress = progressOf(storage);
  assert.ok(progress.rows.filter((row) => row.item.group === 'exit').every((row) => !row.done && !row.blockedReason), 'resolving the problem brought the old ticks back');
  assert.equal(progress.complete, false);

  tickExit(storage);
  progress = progressOf(storage);
  assert.equal(progress.complete, true, 're-ticking after the problem is resolved completes the list');

  // An undecided Low problem clears only the row it holds back.
  addProblem(storage, { where: 'Story 1', what: 'A word is misspelled', severity: 'low' }, { id: 'l1' });
  state = readR2Checklist(storage);
  assert.equal(state.ticks['exit.problems-decided'], undefined);
  assert.equal(state.ticks['exit.no-lost-progress'].done, true);
});

test('"Fixed and checked" is a decision the form offers and the export prints', () => {
  const storage = createStorageFake();
  addProblem(storage, { where: 'Lesson 1', what: 'Stuck on the last screen', severity: 'high', decision: 'fixed', date: '2026-10-02' }, { id: 'f1' });
  assert.equal(readR2Checklist(storage).problems[0].decision, 'fixed');
  assert.ok(DECISIONS.includes('fixed'));
  assert.equal(decisionLabel('fixed'), 'Fixed and checked');
  const state = readR2Checklist(storage);
  const markdown = r2ChecklistMarkdown({ items: r2ChecklistItems, learners, state, exposure: fullExposure(), today: '2026-10-09' });
  assert.match(markdown, /\| Stuck on the last screen \| High \| Fixed and checked \|/);
});

test('test lock: ticking the whole checklist leaves every release gate exactly where it was', async () => {
  const before = JSON.stringify(r2GateTracker);
  const storage = createStorageFake();
  const state = tickEverything(storage);
  const progress = checklistProgress({ items: r2ChecklistItems, learners, state, exposure: fullExposure() });
  assert.equal(progress.complete, true);
  r2ChecklistMarkdown({ items: r2ChecklistItems, learners, state, exposure: fullExposure(), progress, checkReport: '', today: '2026-10-09' });
  assert.equal(JSON.stringify(r2GateTracker), before, 'the tracker itself changed');
  r2GateTracker.forEach((gate) => assert.equal(gateStateAfterChecks(gate, humanChecks, {}).state, gate.state));
  assert.ok(r2GateTracker.every((gate) => gate.state !== 'ready'));
  assert.equal(Object.prototype.hasOwnProperty.call(progress, 'ready'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(progress, 'released'), false);
  // Nothing on the checklist reads or writes mastery, the review queue, attempts or the cloud.
  for (const file of ['../src/learning/r2Checklist.js', '../src/learning/pilotExposure.js', '../src/persistence/r2ChecklistStore.js', '../src/data/r2Checklist.js']) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    const imports = [...source.matchAll(/^import[^;]+;/gm)].map((match) => match[0]).join('\n');
    assert.doesNotMatch(imports, /mastery|reviewScheduler|reviewQueue|firebase|LearningProvider|r2GateTracker|indexedDb|outbox/i, `${file} reaches into learning, the gates or the cloud`);
    assert.doesNotMatch(source, /spelling-learning-attempts|spelling-attempts/, `${file} names the attempt record`);
  }
});

test('the export carries all four groups, each child, the problems and the Test Lab table', () => {
  const storage = createStorageFake();
  setChecklistTick(storage, 'setup.ipad', { done: true, note: 'Checked on the real iPad' });
  addProblem(storage, { where: 'PU.dialogue question 4', learnerId: 'p2', what: 'Answer | marked wrong', severity: 'high', decision: 'fix', date: '2026-10-02' }, { id: 'x' });
  const state = readR2Checklist(storage);
  const exposure = fullExposure();
  const progress = checklistProgress({ items: r2ChecklistItems, learners, state, exposure });
  const checkReport = '# Human check log\n\n| Row | Result | Tester | Observed | Device | Note |';
  const markdown = r2ChecklistMarkdown({ items: r2ChecklistItems, learners, state, exposure, progress, checkReport, today: '2026-10-09' });
  assert.match(markdown, /^# R2 \(M3\) checklist/);
  assert.match(markdown, /Exported 2026-10-09\./);
  assert.match(markdown, new RegExp(`${progress.done} of ${progress.total} done`));
  for (const group of R2_CHECKLIST_GROUPS) assert.match(markdown, new RegExp(`## ${group.title.replace(/[()]/g, '\\$&')}`));
  assert.match(markdown, /\| First child \| Second child \|/);
  assert.match(markdown, /2 of 2 days/);
  assert.match(markdown, /Checked on the real iPad/);
  assert.match(markdown, /Test Lab: nothing recorded yet/);
  assert.match(markdown, /\| 2026-10-02 \| PU\.dialogue question 4 \| Second child \| Answer \/ marked wrong \| High \| Fix \|/);
  assert.match(markdown, /Observed/);
  assert.match(markdown, /never changes a release gate/);
  assert.doesNotMatch(markdown, /undefined|NaN/);
  assert.equal(r2ChecklistFilename('2026-10-09'), 'r2-checklist-2026-10-09.md');
});

test('source guard: the checks page exports through the shared component and keeps no copy box', async () => {
  const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');
  const page = await read('../src/pages/ChecksPage.jsx');
  const panel = await read('../src/components/R2Checklist.jsx');
  assert.match(page, /<R2Checklist/);
  assert.doesNotMatch(page, /Copy the log|Send the findings back|clipboard/);
  assert.match(panel, /<ReportShare/);
  assert.match(panel, /r2ChecklistFilename\(/);
  assert.match(panel, /checkReportMarkdown\(/);
  assert.match(panel, /from the app/);
  const diagnostic = await read('../src/components/DiagnosticShare.jsx');
  assert.match(diagnostic, /<ReportShare/);
  // One print stylesheet, owned by the shared component.
  const shared = await read('../src/components/ReportShare.module.css');
  assert.match(shared, /@media print/);
});
