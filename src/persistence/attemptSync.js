// The order in which a learner's answers reach the cloud.
//
// The decisions this sequence makes are already pure and tested elsewhere: whether a push is
// allowed (`canAutoPush`), what each queued entry becomes (`planOutboxWrites`), and how local and
// remote answers combine (`mergeAttempts`). What had no home was the SEQUENCE, and the sequence is
// where the risk lives: send this learner's queue and nobody else's, recompute word totals only
// after the attempts they derive from are written, then re-read so the device ends up agreeing
// with the account. Every side effect is injected, so the whole path runs in a test.

import { canAutoPush } from '../learning/importPreview.js';
import { planOutboxWrites } from './outboxSync.js';
import { mergeAttempts } from './sync.js';

export async function syncLearnerAttempts({ uid, learnerId, isAnonymous = false, push = 'auto', io }) {
  const remoteBefore = await io.loadRemoteAttempts(uid, learnerId);

  // An account that already holds history never absorbs a device's answers until the parent has
  // decided. A forced push is the parent acting on that decision.
  let allowPush = push === 'force';
  let importDecision = null;
  if (!allowPush) {
    importDecision = await io.readImportDecision(uid, learnerId);
    allowPush = canAutoPush({
      isAnonymous,
      remoteAttemptCount: remoteBefore.length,
      remoteWordCount: importDecision ? 0 : Object.keys(await io.loadRemoteProgress(uid, learnerId)).length,
      importDecision,
    });
  }

  const local = await io.readLocalAttempts(learnerId);
  const remoteIds = new Set(remoteBefore.map(({ attemptId }) => attemptId));
  const held = local.filter(({ attemptId }) => !remoteIds.has(attemptId)).length;

  if (!allowPush) {
    // Read-only reconciliation: the device learns what the account holds without contributing.
    const merged = mergeAttempts(local, remoteBefore);
    await io.writeLocalAttempts(learnerId, merged);
    return { pushed: false, held, merged, reconciledWords: [] };
  }

  const wordsToReconcile = new Map();
  await io.flushOutbox(async (entry) => {
    for (const write of planOutboxWrites(entry, { uid })) {
      if (write.mode === 'reconcile-progress') {
        const pending = wordsToReconcile.get(write.learnerId) || new Set();
        pending.add(write.wordId);
        wordsToReconcile.set(write.learnerId, pending);
        continue;
      }
      await io.writeDocument(write);
    }
    // Only this learner's queue is sent. Another learner may have declined the import, and their
    // answers stay on the device until their own sync is allowed to push.
  }, { accept: (entry) => entry.payload?.learnerId === learnerId });

  // Totals are recomputed only after the attempts they are derived from have been written.
  const reconciledWords = [];
  for (const [reconcileLearner, wordIds] of wordsToReconcile) {
    await io.reconcileWords(reconcileLearner, [...wordIds]);
    reconciledWords.push([reconcileLearner, [...wordIds]]);
  }

  const remoteAfter = await io.loadRemoteAttempts(uid, learnerId);
  const merged = mergeAttempts(await io.readLocalAttempts(learnerId), remoteAfter);
  await io.writeLocalAttempts(learnerId, merged);
  return { pushed: true, held: 0, merged, reconciledWords };
}
