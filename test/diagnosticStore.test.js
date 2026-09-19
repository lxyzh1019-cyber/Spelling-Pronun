// The diagnostic's own storage, and the promise it makes by having its own storage.
//
// The diagnostic claims, in its own data, that its answers can never be mastery evidence. Before
// 2026-09-19 that claim rested entirely on `attemptIsInTrack` filtering out `not_released` content —
// one filter, in a module the diagnostic does not own, between a locator and a child's permanent
// record. `submitAttempt` itself refuses nothing: no role check, no release check.
//
// Keeping the answers in a fenced namespace makes the claim structural. These tests hold the fence,
// and hold that there is no path from here into the learning record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticForm, diagnosticItems } from '../src/data/diagnostic.k4.draft.js';
import { buildDiagnosticReport } from '../src/learning/diagnosticReport.js';
import {
  DIAGNOSTIC_PREFIX,
  answerDiagnostic,
  attemptsFrom,
  clearDiagnosticRun,
  createDiagnosticRun,
  diagnosticKey,
  isDiagnosticKey,
  readDiagnosticRun,
  resumeDiagnosticRun,
  writeDiagnosticRun,
} from '../src/persistence/diagnosticStore.js';

// A localStorage that records every key it is asked to touch, so a stray write is visible.
function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('every key it writes is inside its own namespace', () => {
  const storage = fakeStorage();
  const { run } = resumeDiagnosticRun(storage, 'jenn', diagnosticForm.id);
  writeDiagnosticRun(storage, run);
  assert.ok(storage.data.size > 0, 'nothing was written at all');
  for (const key of storage.data.keys()) {
    assert.ok(key.startsWith(DIAGNOSTIC_PREFIX), `${key} is outside the diagnostic namespace`);
    assert.ok(isDiagnosticKey(key));
  }
  // Nothing it writes can collide with the learner record or the Test Lab.
  for (const key of storage.data.keys()) {
    assert.ok(!key.startsWith('spelling-attempts'), `${key} would land in the learner record`);
    assert.ok(!key.startsWith('spelling-testlab-'), `${key} would land in Test Lab storage`);
    assert.ok(!key.startsWith('spelling-lesson-'), `${key} would land in lesson storage`);
  }
});

// The fence, stated honestly about what it does and does not prove. `diagnosticKey` prefixes every
// key it builds, so `writeDiagnosticRun` cannot currently be made to write outside the namespace —
// the throw inside it is a backstop against a future change to the key function, not a live branch.
// What IS worth testing is that the key is namespaced for any input at all, including hostile ones,
// and that the predicate the backstop consults actually rejects foreign keys.
test('the key is namespaced whatever it is given, and the predicate rejects foreign keys', () => {
  for (const learnerId of ['jenn', '', '../escape', 'spelling-attempts', 'a:b:c']) {
    const key = diagnosticKey(learnerId, diagnosticForm.id);
    assert.ok(key.startsWith(DIAGNOSTIC_PREFIX), `${learnerId} produced ${key}`);
    assert.ok(isDiagnosticKey(key));
  }
  for (const foreign of ['spelling-attempts:jenn', 'spelling-testlab-run:practice', 'spelling-lesson-complete:jenn', '', null, undefined, 42]) {
    assert.equal(isDiagnosticKey(foreign), false, `${foreign} was accepted as diagnostic storage`);
  }
});

// The first answer stands, in the store as well as in the report. If only the report enforced it,
// a resumed run would show one answer and record another.
test('a second answer never replaces the first', () => {
  const item = diagnosticItems[0];
  let run = createDiagnosticRun(diagnosticForm.id, 'jenn');
  const first = answerDiagnostic(run, item.id, 'a', false);
  assert.equal(first.recorded, true);
  const second = answerDiagnostic(first.run, item.id, 'b', true);
  assert.equal(second.recorded, false, 'a retry was recorded');
  assert.equal(second.run.answers[item.id].choiceId, 'a');
  assert.equal(second.run.answers[item.id].correct, false);
  assert.equal(attemptsFrom(second.run).length, 1);
  // And the report agrees with the store rather than disagreeing about which answer counted.
  const report = buildDiagnosticReport(diagnosticForm, attemptsFrom(second.run), {});
  const skill = report.skills.find((entry) => entry.skillId === item.skillId);
  assert.equal(skill.answered, 1);
  assert.equal(skill.correct, 0);
});

test('a part-finished form resumes where it was left', () => {
  const storage = fakeStorage();
  const { run, resumed } = resumeDiagnosticRun(storage, 'jess', diagnosticForm.id);
  assert.equal(resumed, false);
  const answered = answerDiagnostic(run, diagnosticItems[0].id, 'a', true).run;
  writeDiagnosticRun(storage, answered);
  const again = resumeDiagnosticRun(storage, 'jess', diagnosticForm.id);
  assert.equal(again.resumed, true);
  assert.equal(Object.keys(again.run.answers).length, 1);
  // Clearing removes that one run and nothing else.
  const other = resumeDiagnosticRun(storage, 'jenn', diagnosticForm.id);
  writeDiagnosticRun(storage, other.run);
  clearDiagnosticRun(storage, 'jess', diagnosticForm.id);
  assert.equal(readDiagnosticRun(storage, 'jess', diagnosticForm.id), null);
  assert.ok(readDiagnosticRun(storage, 'jenn', diagnosticForm.id), 'clearing one run removed another');
});

// One child's answers are never read as another's, even if a key were reused.
test('a run belongs to one learner and one form', () => {
  const storage = fakeStorage();
  const { run } = resumeDiagnosticRun(storage, 'jenn', diagnosticForm.id);
  writeDiagnosticRun(storage, run);
  assert.ok(readDiagnosticRun(storage, 'jenn', diagnosticForm.id));
  assert.equal(readDiagnosticRun(storage, 'jess', diagnosticForm.id), null);
  assert.equal(readDiagnosticRun(storage, 'jenn', 'another.form'), null);
  // A record whose contents disagree with its key is not trusted.
  storage.setItem(diagnosticKey('jenn', diagnosticForm.id), JSON.stringify({ formId: 'other', learnerId: 'jenn', answers: {} }));
  assert.equal(readDiagnosticRun(storage, 'jenn', diagnosticForm.id), null, 'a mismatched record was trusted');
});

test('unreadable or absent storage yields no run rather than throwing', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
  assert.equal(readDiagnosticRun(broken, 'jenn', diagnosticForm.id), null);
  assert.equal(writeDiagnosticRun(broken, createDiagnosticRun(diagnosticForm.id, 'jenn')), false);
  assert.equal(readDiagnosticRun(undefined, 'jenn', diagnosticForm.id), null);
  assert.deepEqual(attemptsFrom(null), []);
  assert.deepEqual(attemptsFrom({}), []);
});

// The whole form, answered, produces the answer the parent asked for.
test('a completed form answers the separate-app question', () => {
  const storage = fakeStorage();
  let { run } = resumeDiagnosticRun(storage, 'jenn', diagnosticForm.id);
  const weak = new Set(['PU.apostrophes', 'SP.confusables']);
  for (const item of diagnosticItems) {
    run = answerDiagnostic(run, item.id, item.acceptedAnswers[0], !weak.has(item.skillId)).run;
  }
  writeDiagnosticRun(storage, run);
  const report = buildDiagnosticReport(diagnosticForm, attemptsFrom(run), {});
  assert.equal(report.separateAppQuestion.answer, 'build_packs_here');
  assert.deepEqual(report.separateAppQuestion.needing.sort(), [...weak].sort());
  assert.equal(report.producesMasteryEvidence, false);
  assert.equal(attemptsFrom(run).length, diagnosticItems.length);
});
