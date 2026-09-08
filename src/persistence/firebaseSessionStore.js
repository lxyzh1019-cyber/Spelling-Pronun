import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { claimCloudSession, cloudSessionDocumentId, saveCloudSession } from './sessionSync.js';

export async function claimRemoteSession(db, candidate, options = {}) {
  const reference = doc(db, 'spelling-sessions', cloudSessionDocumentId(candidate.userId, candidate.learnerId, candidate.sessionId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const decision = claimCloudSession(snapshot.exists() ? snapshot.data() : null, candidate, options);
    if (decision.changed) transaction.set(reference, { ...decision.record, serverUpdatedAt: serverTimestamp() });
    return decision;
  });
}

export async function saveRemoteSession(db, candidate) {
  const reference = doc(db, 'spelling-sessions', cloudSessionDocumentId(candidate.userId, candidate.learnerId, candidate.sessionId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('session_not_found');
    const record = saveCloudSession(snapshot.data(), candidate);
    transaction.set(reference, { ...record, serverUpdatedAt: serverTimestamp() });
    return record;
  });
}
