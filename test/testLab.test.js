import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAudioRows, playbackDisclosure, rowsInGroup, ITEM_RATE, CHOICE_RATE, REQUESTED_LOCALE } from '../src/learning/testLabAudio.js';
import {
  TEST_LAB_ITEMS,
  TEST_LAB_LEARNER,
  answerTestRun,
  createTestRun,
  currentTestItem,
  deliverTestQueue,
  testRunProgress,
} from '../src/learning/testLabRun.js';
import { TEST_LAB_PREFIX, clearTestRun, isTestLabKey, readTestRun, resumeTestRun, testLabKey, writeTestRun } from '../src/persistence/testLabStore.js';
import {
  PREFLIGHT_REASONS,
  TEST_LAB_SESSION_COLLECTION,
  buildTestLabSession,
  testLabSessionId,
  twoDevicePreflight,
} from '../src/learning/testLabPreflight.js';
import { checkAvailability, checkProgress, pilotEntryAllowed } from '../src/learning/humanChecks.js';
import { findCheck, humanChecks } from '../src/data/humanChecks.js';
import { c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { c0AssessmentAudioAssets } from '../src/data/audio.c0.js';
import { deriveMastery } from '../src/learning/mastery.js';
import { slug } from '../src/learning/wordCatalogue.js';
import { createStorageFake } from './fakes/storageFake.js';
import { createFirestoreFake } from './fakes/firestoreFake.js';

const rows = buildAudioRows(c0AssessmentItems, c0AssessmentAudioAssets);

// A learner store with real work in it, so "nothing changed" means something.
function populatedLearnerStorage() {
  const storage = createStorageFake();
  const attempt = {
    attemptId: 'jenn-1', learnerId: 'jenn', itemId: 'c0.sp.patterns.01', skillId: 'SP.patterns',
    status: 'correct', ordinal: 1, independent: true, helped: false, revealed: false,
    contentStatus: 'pilot_approved', edmontonDate: '2026-09-08',
  };
  storage.setItem('spelling-learning-attempts:jenn', JSON.stringify([attempt]));
  storage.setItem('spelling-learning-attempts:jess', JSON.stringify([{ ...attempt, attemptId: 'jess-1', learnerId: 'jess' }]));
  storage.setItem('spelling-r1-progress:jenn', JSON.stringify({ 'grade-5-accident': { attempts: 4, correct: 3, streak: 2 } }));
  storage.setItem('spelling-r1-achievements:jenn', JSON.stringify([{ id: 'daily_champion', awardedAt: '2026-09-08' }]));
  storage.setItem('spelling-lesson-minutes:jenn', '15');
  storage.setItem('spelling-assessment:jenn:A', JSON.stringify({ mirrorVersion: 1, state: { index: 5 } }));
  storage.setItem('spelling-family-device-id', 'device-abc');
  return { storage, attempt };
}

function snapshotOrdinary(storage) {
  return Object.fromEntries([...storage.entries.entries()].filter(([key]) => !isTestLabKey(key)));
}

test('a full Test Lab practice run changes nothing that belongs to a learner', () => {
  const { storage, attempt } = populatedLearnerStorage();
  const before = snapshotOrdinary(storage);
  const masteryBefore = deriveMastery([attempt], { track: 'pilot' });

  // Run the whole scenario: answer every question, go offline, flush, reload, reset.
  let { state } = resumeTestRun(storage, 'practice');
  TEST_LAB_ITEMS.forEach((item, index) => {
    state = answerTestRun(state, item.acceptedAnswers[0], { attemptId: `a${index}`, online: index % 2 === 0 }).state;
    writeTestRun(storage, 'practice', state);
  });
  state = deliverTestQueue(state);
  writeTestRun(storage, 'practice', state);
  readTestRun(storage, 'practice');
  clearTestRun(storage, 'practice');

  assert.deepEqual(snapshotOrdinary(storage), before, 'no ordinary storage key may change');
  assert.deepEqual(deriveMastery([attempt], { track: 'pilot' }), masteryBefore, 'no mastery may change');
});

test('Test Lab storage is fenced by name and reset clears only the run it is given', () => {
  const { storage } = populatedLearnerStorage();
  assert.equal(isTestLabKey(testLabKey('practice')), true);
  assert.equal(isTestLabKey('spelling-learning-attempts:jenn'), false);
  assert.ok(testLabKey('practice').startsWith(TEST_LAB_PREFIX));

  resumeTestRun(storage, 'practice');
  resumeTestRun(storage, 'second');
  const ordinaryCount = Object.keys(snapshotOrdinary(storage)).length;
  clearTestRun(storage, 'practice');
  assert.equal(readTestRun(storage, 'practice'), null);
  assert.ok(readTestRun(storage, 'second'), 'the other run survives');
  assert.equal(Object.keys(snapshotOrdinary(storage)).length, ordinaryCount, 'reset touches nothing outside its run');
});

test('the practice run reuses the real rules: resume, idempotent delivery, no double submit', () => {
  const storage = createStorageFake();
  let { state, resumed } = resumeTestRun(storage, 'practice');
  assert.equal(resumed, false);

  const first = answerTestRun(state, 'sample', { attemptId: 'a1' });
  assert.equal(first.evaluation.status, 'correct');
  state = first.state;
  // Offline: held, not delivered.
  state = answerTestRun(state, 'wrong answer', { attemptId: 'a2', online: false }).state;
  assert.deepEqual(
    (({ answered, queued, delivered }) => ({ answered, queued, delivered }))(testRunProgress(state)),
    { answered: 2, queued: 1, delivered: 1 }
  );
  // The same attempt id twice is one answer.
  const repeat = answerTestRun(state, 'pocket', { attemptId: 'a2' });
  assert.equal(repeat.duplicate, true);
  assert.equal(repeat.state, state, 'a duplicate submit changes nothing');
  // Flushing twice still delivers each answer once.
  state = deliverTestQueue(deliverTestQueue(state));
  assert.equal(testRunProgress(state).delivered, 2);
  assert.equal(new Set(state.delivered).size, state.delivered.length);

  // The case the guard actually exists for: a flush that reached the far side but
  // whose acknowledgement was lost, so the same id is still sitting in the queue
  // when delivery is retried. It must still arrive exactly once.
  const retried = deliverTestQueue({ ...state, queue: [state.delivered[0], 'a-new-one'] });
  assert.equal(retried.delivered.filter((id) => id === state.delivered[0]).length, 1, 'a replayed id is not delivered twice');
  assert.equal(retried.delivered.length, 3);
  assert.deepEqual(retried.queue, []);

  writeTestRun(storage, 'practice', state);
  const reopened = resumeTestRun(storage, 'practice');
  assert.equal(reopened.resumed, true);
  assert.equal(reopened.state.answers.length, 2, 'a reload resumes where it stopped');
  assert.equal(currentTestItem(reopened.state).id, TEST_LAB_ITEMS[2].id);
});

test('the practice learner id can never belong to a real profile', () => {
  assert.equal(slug(TEST_LAB_LEARNER), 'testlab');
  assert.notEqual(slug(TEST_LAB_LEARNER), TEST_LAB_LEARNER, 'no slug can contain underscores');
  assert.equal(TEST_LAB_ITEMS.every((item) => item.id.startsWith('testlab.')), true);
});

test('every audio row comes from a real assessment item at its current version', () => {
  assert.equal(rows.length, 44);
  const itemById = new Map(c0AssessmentItems.map((item) => [item.id, item]));
  rows.forEach((row) => {
    const item = itemById.get(row.itemId);
    assert.ok(item, `${row.rowId} points at an unknown item`);
    assert.equal(row.itemVersion, item.version, `${row.rowId} is pinned to the wrong version`);
    assert.equal(row.form, item.form);
    assert.equal(row.playback.lang || REQUESTED_LOCALE, REQUESTED_LOCALE);
  });
});

test('dictation and contrast rows call playback exactly as the assessment does', () => {
  const dictation = rowsInGroup(rows, 'dictation');
  assert.equal(dictation.length, 16);
  dictation.forEach((row) => {
    const item = c0AssessmentItems.find((entry) => entry.id === row.itemId);
    assert.equal(row.playback.text, item.spokenText, 'the row speaks the item’s own spoken text');
    assert.equal(row.playback.rate, ITEM_RATE);
  });
  // Decoding candidates are choice audio, so they use the choice rate.
  rowsInGroup(rows, 'decoding').forEach((row) => assert.equal(row.playback.rate, CHOICE_RATE));
});

test('both sides of all eight contrast pairs are playable and reported separately', () => {
  const contrast = rowsInGroup(rows, 'contrast');
  assert.equal(contrast.length, 16, 'eight pairs, two utterances each');
  const byItem = new Map();
  contrast.forEach((row) => byItem.set(row.itemId, [...(byItem.get(row.itemId) || []), row]));
  assert.equal(byItem.size, 8);
  for (const [itemId, pair] of byItem) {
    const item = c0AssessmentItems.find((entry) => entry.id === itemId);
    const target = pair.find((row) => !row.comparisonOnly);
    const compare = pair.find((row) => row.comparisonOnly);
    assert.ok(target && compare, `${itemId} needs a target and a comparison`);
    assert.equal(target.playback.text, item.spokenText);
    // The comparison is the distractor the assessment never speaks.
    const distractor = item.choices.find((choice) => choice.text !== item.spokenText);
    assert.equal(compare.playback.text, distractor.text);
    assert.notEqual(target.playback.text, compare.playback.text);
    // Same rate, or the comparison would not be fair.
    assert.equal(compare.playback.rate, target.playback.rate);
    assert.notEqual(target.rowId, compare.rowId, 'each side records its own result');
  }
});

test('all twelve decoding candidates are playable and keep the item’s own metadata', () => {
  const decoding = rowsInGroup(rows, 'decoding');
  assert.equal(decoding.length, 12);
  const byItem = new Map();
  decoding.forEach((row) => byItem.set(row.itemId, [...(byItem.get(row.itemId) || []), row]));
  assert.equal(byItem.size, 4);
  for (const [itemId, candidates] of byItem) {
    const item = c0AssessmentItems.find((entry) => entry.id === itemId);
    assert.equal(candidates.length, 3);
    assert.equal(candidates.filter((row) => row.expected).length, 1, `${itemId} must have exactly one expected reading`);
    const expected = candidates.find((row) => row.expected);
    assert.equal(item.acceptedAnswers.includes(expected.rowId.split(':')[1]), true);
    candidates.forEach((row) => {
      const choice = item.choices.find((entry) => row.rowId.endsWith(`:${entry.id}`));
      assert.equal(row.playback.text, choice.spokenText);
      assert.equal(row.detail, choice.checkerNote, 'the row shows the item’s own checker note');
      assert.equal(row.printedWord, item.printedWord);
    });
  }
});

test('playback is described truthfully, and a comparison is never called assessment audio', () => {
  const compare = rows.find((row) => row.comparisonOnly);
  const target = rows.find((row) => row.group === 'contrast' && !row.comparisonOnly);
  assert.match(playbackDisclosure(compare, { ok: true, usedRequestedLocale: true }), /Test Lab comparison/);
  assert.doesNotMatch(playbackDisclosure(target, { ok: true, usedRequestedLocale: true }), /Test Lab comparison/);
  // No en-CA voice must never be reported as Canadian.
  const fallback = playbackDisclosure(target, { ok: true, usedRequestedLocale: false });
  assert.match(fallback, /No en-CA voice is installed/);
  assert.doesNotMatch(fallback, /Canadian/);
  // A failure is a technical problem, never a learner result.
  assert.match(playbackDisclosure(target, { ok: false }), /not as anything about a learner/);
});

test('the two-device check is blocked until a real preflight passes, and blocked again when it fails', async () => {
  const check = findCheck('check.two-device');
  assert.equal(check.requiresPreflight, 'twoDevice');
  assert.equal(checkAvailability(check, {}).runnable, false, 'blocked before any preflight');
  // There is no hand-set override: the old escape hatch must stay gone.
  assert.equal(checkAvailability(check, { setupComplete: true }).runnable, false);

  const parent = { uid: 'parent-1', email: 'p@example.com', isAnonymous: false };
  // Driven through the Firestore fake exactly as the page drives the real one.
  const cloud = createFirestoreFake();
  const write = async (collection, id, data) => cloud.api.setDoc(cloud.api.doc(cloud.db, collection, id), data);
  const read = async (collection, id) => (await cloud.api.getDoc(cloud.api.doc(cloud.db, collection, id))).data() || null;

  const passed = await twoDevicePreflight({ user: parent, testRunId: 'practice', deviceLabel: 'ipad', write, read });
  assert.equal(passed.ok, true);
  assert.equal(checkAvailability(check, { preflight: { twoDevice: passed } }).runnable, true);

  // Signed out, anonymous, rules missing and unreachable each block it with their own reason.
  assert.equal((await twoDevicePreflight({ user: null, testRunId: 'x', write, read })).reason, PREFLIGHT_REASONS.signedOut);
  assert.equal((await twoDevicePreflight({ user: { uid: 'a', isAnonymous: true }, testRunId: 'x', write, read })).reason, PREFLIGHT_REASONS.anonymous);
  const denied = async () => { const error = new Error('nope'); error.code = 'permission-denied'; throw error; };
  const refused = await twoDevicePreflight({ user: parent, testRunId: 'x', write: denied, read });
  assert.equal(refused.reason, PREFLIGHT_REASONS.rulesMissing);
  assert.equal(checkAvailability(check, { preflight: { twoDevice: refused } }).runnable, false);
  const offline = async () => { const error = new Error('down'); error.code = 'unavailable'; throw error; };
  assert.equal((await twoDevicePreflight({ user: parent, testRunId: 'x', write: offline, read })).reason, PREFLIGHT_REASONS.unreachable);
  // Written but not readable back as the owner is not proof of ownership.
  const wrongOwner = await twoDevicePreflight({ user: parent, testRunId: 'x', write, read: async () => ({ userId: 'someone-else', purpose: 'human_check' }) });
  assert.equal(wrongOwner.reason, PREFLIGHT_REASONS.readback);
});

test('the preflight writes only to the Test Lab collection, marked as a test', async () => {
  const parent = { uid: 'parent-1', isAnonymous: false };
  const written = [];
  await twoDevicePreflight({
    user: parent,
    testRunId: 'practice',
    deviceLabel: 'ipad',
    write: async (collection, id, data) => { written.push({ collection, id, data }); },
    read: async () => ({ userId: parent.uid, purpose: 'human_check' }),
  });
  assert.equal(written.length, 1);
  assert.equal(written[0].collection, TEST_LAB_SESSION_COLLECTION);
  assert.equal(written[0].id, testLabSessionId(parent.uid, 'practice'));
  assert.equal(written[0].data.purpose, 'human_check');
  assert.equal(written[0].data.userId, parent.uid);
  assert.ok(written[0].data.expiresAt > written[0].data.createdAt, 'a test record expires');
  // No ordinary collection is ever named.
  ['spelling-attempts', 'spelling-progress', 'spelling-sessions', 'spelling-achievements'].forEach((collection) => {
    assert.notEqual(written[0].collection, collection);
  });
  const record = buildTestLabSession({ uid: 'u', testRunId: 'r', deviceLabel: 'd', now: new Date('2026-09-10T00:00:00.000Z') });
  assert.equal(record.expiresAt, '2026-09-10T02:00:00.000Z');
});

test('a Family Pilot check cannot open until a learner is chosen and the parent confirms', () => {
  const pilot = findCheck('check.lesson-journey');
  assert.equal(pilot.area, 'pilot');
  assert.equal(pilotEntryAllowed(pilot, {}).allowed, false);
  assert.match(pilotEntryAllowed(pilot, {}).reason, /Choose which child/);
  assert.equal(pilotEntryAllowed(pilot, { observedLearner: 'jenn' }).allowed, false, 'choosing is not confirming');
  assert.match(pilotEntryAllowed(pilot, { observedLearner: 'jenn' }).reason, /Confirm that answers will be saved/);
  assert.equal(pilotEntryAllowed(pilot, { observedLearner: 'jenn', confirmed: true }).allowed, true);
  // A Test Lab check has no such gate, because it opens nothing.
  assert.equal(pilotEntryAllowed(findCheck('check.resume'), {}).allowed, true);
});

test('no Technical Test Lab check routes the tester into a learner session', () => {
  const testlab = humanChecks.filter((check) => check.area === 'testlab');
  const pilot = humanChecks.filter((check) => check.area === 'pilot');
  assert.ok(testlab.length > 0 && pilot.length > 0);
  const learnerRoutes = ['/case', '/lesson', '/assessment', '/review', '/test', '/flashcards'];
  testlab.forEach((check) => {
    assert.equal(check.where, undefined, `${check.id} must not link anywhere a learner session starts`);
    const text = [check.purpose, ...check.steps].join(' ').toLowerCase();
    assert.doesNotMatch(text, /start a lesson|take the assessment/, `${check.id} still tells the tester to use the real app`);
  });
  // Every pilot check does link into the real app, and that is the point.
  pilot.forEach((check) => {
    assert.ok(check.where && learnerRoutes.some((route) => check.where.to.startsWith(route)), `${check.id} should open the real app`);
  });
});

test('progress and recording still work on a derived audio check', () => {
  const check = findCheck('check.listening.dictation');
  assert.equal(check.prompts.length, 16);
  assert.equal(checkProgress(check, {}).status, 'not_started');
  const results = Object.fromEntries(check.prompts.map((prompt) => [prompt.id, { result: 'pass' }]));
  assert.equal(checkProgress(check, results).status, 'complete');
  results[check.prompts[3].id] = { result: 'problem' };
  assert.equal(checkProgress(check, results).status, 'problem_found');
});

test('source guard: playback is scoped so leaving a row or the page stops it', async () => {
  // This one reads the files as text and does not execute them: cancellation is a
  // browser behaviour, and the wiring that triggers it is what can regress. The
  // page keys useCancellableSpeech on the row being played, and the hook aborts
  // the previous utterance whenever that key changes or the page unmounts.
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/hooks/useCancellableSpeech.js', import.meta.url), 'utf8'));
  assert.match(source, /useEffect\(\(\) => cancel, \[cancel, scopeKey\]\)/, 'the hook must cancel on scope change and unmount');

  const page = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/pages/ChecksPage.jsx', import.meta.url), 'utf8'));
  assert.match(page, /useCancellableSpeech\(playState\?\.rowId \|\| 'idle'\)/, 'the scope key must be the row being played');
  assert.match(page, /if \(result\.reason === 'cancelled'\) return;/, 'a cancelled playback must not overwrite the newer row’s message');
});
