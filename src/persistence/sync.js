export function mergeAttempts(localAttempts = [], remoteAttempts = []) {
  const byId = new Map();
  for (const attempt of [...remoteAttempts, ...localAttempts]) {
    if (attempt?.attemptId && !byId.has(attempt.attemptId)) byId.set(attempt.attemptId, attempt);
  }
  return [...byId.values()].sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
}

export function attemptDocumentId(userId, attempt) {
  return `${userId}_${attempt.learnerId}_${attempt.attemptId}`;
}
