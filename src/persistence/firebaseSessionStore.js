import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { claimCloudSession, cloudSessionDocumentId, saveCloudSession } from './sessionSync.js';

// The Firestore operations are injectable. Passing a fake `db` alone is not enough, because
// `runTransaction` is imported rather than read off the database, so a test supplies both. The
// real SDK stays the default and no call site changes.
const firestoreOps = { doc, runTransaction, serverTimestamp };

export async function claimRemoteSession(db, candidate, options = {}, ops = firestoreOps) {
  const { doc, runTransaction, serverTimestamp } = ops;
  const reference = doc(db, 'spelling-sessions', cloudSessionDocumentId(candidate.userId, candidate.learnerId, candidate.sessionId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const decision = claimCloudSession(snapshot.exists() ? snapshot.data() : null, candidate, options);
    if (decision.changed) transaction.set(reference, { ...decision.record, serverUpdatedAt: serverTimestamp() });
    return decision;
  });
}

export async function saveRemoteSession(db, candidate, ops = firestoreOps) {
  const { doc, runTransaction, serverTimestamp } = ops;
  const reference = doc(db, 'spelling-sessions', cloudSessionDocumentId(candidate.userId, candidate.learnerId, candidate.sessionId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('session_not_found');
    const record = saveCloudSession(snapshot.data(), candidate);
    transaction.set(reference, { ...record, serverUpdatedAt: serverTimestamp() });
    return record;
  });
}
