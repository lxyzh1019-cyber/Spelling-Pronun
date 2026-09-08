// Pure helpers for the parent-account import preview (master plan §9). Nothing here writes; the
// preview tells the parent exactly what would be added to the cloud record before they decide.

export function buildLearnerImportPreview({ learnerId, localAttempts = [], remoteAttempts = [], localProgress = {}, remoteProgress = {} }) {
  const remoteAttemptIds = new Set(remoteAttempts.map(({ attemptId }) => attemptId));
  const newAttemptIds = localAttempts.filter(({ attemptId }) => attemptId && !remoteAttemptIds.has(attemptId)).map(({ attemptId }) => attemptId);
  const localWordIds = Object.keys(localProgress);
  const newWordIds = localWordIds.filter((wordId) => !(wordId in remoteProgress));
  return {
    learnerId,
    newAttemptIds,
    newWordIds,
    counts: {
      localAttempts: localAttempts.length,
      remoteAttempts: remoteAttempts.length,
      newAttempts: newAttemptIds.length,
      alreadyInCloudAttempts: localAttempts.length - newAttemptIds.length,
      localWords: localWordIds.length,
      remoteWords: Object.keys(remoteProgress).length,
      newWords: newWordIds.length,
      alreadyInCloudWords: localWordIds.length - newWordIds.length,
    },
  };
}

export function buildImportPreview(learners) {
  const perLearner = learners.map(buildLearnerImportPreview);
  const totals = perLearner.reduce((sum, entry) => ({
    newAttempts: sum.newAttempts + entry.counts.newAttempts,
    newWords: sum.newWords + entry.counts.newWords,
    alreadyInCloud: sum.alreadyInCloud + entry.counts.alreadyInCloudAttempts + entry.counts.alreadyInCloudWords,
  }), { newAttempts: 0, newWords: 0, alreadyInCloud: 0 });
  return { learners: perLearner, totals, nothingToImport: totals.newAttempts === 0 && totals.newWords === 0 };
}

// Whether local history may be pushed to the cloud without an explicit parent decision.
// Anonymous guests own their cloud record outright; an account with no cloud history for the
// learner is the create path; otherwise the parent must have confirmed (or skipped) the import.
export function canAutoPush({ isAnonymous = false, remoteAttemptCount = 0, remoteWordCount = 0, importDecision = null }) {
  if (isAnonymous) return true;
  if (importDecision?.decision === 'imported') return true;
  return remoteAttemptCount === 0 && remoteWordCount === 0;
}

export function importDecisionRecord(decision, preview, now = new Date()) {
  return {
    decision,
    decidedAt: now.toISOString(),
    attempts: preview?.counts?.newAttempts ?? 0,
    words: preview?.counts?.newWords ?? 0,
  };
}
