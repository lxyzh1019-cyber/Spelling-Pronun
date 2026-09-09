// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportPreview, buildLearnerImportPreview, canAutoPush, importDecisionRecord } from '../src/learning/importPreview.js';

const local = [{ attemptId: 'a1' }, { attemptId: 'a2' }, { attemptId: 'a3' }];
const remote = [{ attemptId: 'a1' }, { attemptId: 'r9' }];
const localProgress = { w1: { attempts: 2 }, w2: { attempts: 1 } };
const remoteProgress = { w1: { attempts: 5 } };

test('an existing parent account sees exact counts before anything is written', () => {
  const preview = buildLearnerImportPreview({ learnerId: 'jenn', localAttempts: local, remoteAttempts: remote, localProgress, remoteProgress });
  assert.deepEqual(preview.newAttemptIds, ['a2', 'a3']);
  assert.deepEqual(preview.newWordIds, ['w2']);
  assert.equal(preview.counts.alreadyInCloudAttempts, 1);
  assert.equal(preview.counts.alreadyInCloudWords, 1);
  const combined = buildImportPreview([
    { learnerId: 'jenn', localAttempts: local, remoteAttempts: remote, localProgress, remoteProgress },
    { learnerId: 'jess', localAttempts: [], remoteAttempts: [{ attemptId: 'z' }], localProgress: {}, remoteProgress: { w1: {} } },
  ]);
  assert.deepEqual(combined.totals, { newAttempts: 2, newWords: 1, alreadyInCloud: 2 });
  assert.equal(combined.nothingToImport, false);
});

test('repeating the import yields nothing new and never touches existing cloud rows', () => {
  const afterImport = buildLearnerImportPreview({
    learnerId: 'jenn',
    localAttempts: local,
    remoteAttempts: [...remote, { attemptId: 'a2' }, { attemptId: 'a3' }],
    localProgress,
    remoteProgress: { ...remoteProgress, w2: { attempts: 1 } },
  });
  assert.deepEqual(afterImport.newAttemptIds, []);
  assert.deepEqual(afterImport.newWordIds, []);
  assert.equal(buildImportPreview([{ learnerId: 'jenn', localAttempts: local, remoteAttempts: [...remote, { attemptId: 'a2' }, { attemptId: 'a3' }], localProgress, remoteProgress: { ...remoteProgress, w2: {} } }]).nothingToImport, true);
  // The preview never proposes changing a row that already exists in the cloud (w1 keeps 5 attempts).
  assert.equal(afterImport.counts.alreadyInCloudWords, 2);
});

test('local history is pushed automatically only for guests, empty accounts, or a confirmed import', () => {
  assert.equal(canAutoPush({ isAnonymous: true, remoteAttemptCount: 40 }), true);
  assert.equal(canAutoPush({ isAnonymous: false, remoteAttemptCount: 0, remoteWordCount: 0 }), true);
  assert.equal(canAutoPush({ isAnonymous: false, remoteAttemptCount: 3 }), false);
  assert.equal(canAutoPush({ isAnonymous: false, remoteAttemptCount: 0, remoteWordCount: 12 }), false);
  assert.equal(canAutoPush({ isAnonymous: false, remoteAttemptCount: 3, importDecision: { decision: 'imported' } }), true);
  assert.equal(canAutoPush({ isAnonymous: false, remoteAttemptCount: 3, importDecision: { decision: 'skipped' } }), false);
  const record = importDecisionRecord('imported', { counts: { newAttempts: 2, newWords: 1 } }, new Date('2026-09-08T12:00:00Z'));
  assert.deepEqual(record, { decision: 'imported', decidedAt: '2026-09-08T12:00:00.000Z', attempts: 2, words: 1 });
});

test('source guard: the parent page reviews an existing account before writing and keeps the create path additive', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/pages/ParentPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /previewImport\(credential\.user\)/);
  assert.match(source, /Nothing has been written yet/);
  assert.match(source, /Skip for now/);
  const signInBranch = source.slice(source.indexOf("} else {\n        // Existing account"), source.indexOf('setPreview(proposed)'));
  assert.doesNotMatch(signInBranch, /confirmImport\(/, 'signing into an existing account never imports before the preview');
  const provider = await readFile(new URL('../src/context/LearningProvider.jsx', import.meta.url), 'utf8');
  assert.match(provider, /canAutoPush\(/, 'automatic sync respects the import decision');
});
