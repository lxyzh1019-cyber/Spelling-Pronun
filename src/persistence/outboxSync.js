// Pure planning for outbox delivery. Every queued entry becomes a list of idempotent Firestore
// writes so that a retried flush (after a lost connection, page reload, or duplicate tap) can never
// double-count an attempt or award. Attempt documents are created only when missing; aggregate
// progress rows are rewritten from the device's local totals with a merge instead of `increment`.

export function attemptDocId(uid, learnerId, attemptId) {
  return `${uid}_${learnerId}_${attemptId}`;
}

export function progressDocId(uid, learnerId, wordId) {
  return `${uid}_${learnerId}_${wordId}`;
}

export function planOutboxWrites(entry, { uid, readLocalProgress = () => ({}) } = {}) {
  if (!uid || !entry?.payload) return [];
  const { kind, payload } = entry;
  if (kind === 'attempt') {
    return [{
      collection: 'spelling-attempts',
      id: attemptDocId(uid, payload.learnerId, payload.attemptId),
      data: { ...payload, userId: uid },
      mode: 'create-if-missing',
    }];
  }
  if (kind === 'word-attempt') {
    const local = readLocalProgress(payload.learnerId)?.[payload.wordId] || {};
    return [
      {
        collection: 'spelling-attempts',
        id: attemptDocId(uid, payload.learnerId, payload.attemptId),
        data: { ...payload, userId: uid, queuedOffline: true },
        mode: 'create-if-missing',
      },
      {
        collection: 'spelling-progress',
        id: progressDocId(uid, payload.learnerId, payload.wordId),
        data: {
          userId: uid,
          profileId: payload.learnerId,
          wordId: payload.wordId,
          attempts: local.attempts || 0,
          correct: local.correct || 0,
          streak: local.streak || 0,
          lastEvidenceType: payload.evidenceType,
          reconciledFromDevice: true,
        },
        mode: 'merge',
      },
    ];
  }
  return [];
}

// Delivers queued entries one at a time. An entry is removed only after its writes succeed, so a
// failure leaves it (and everything after it) queued for the next flush. `send` and `remove` are
// injected so the loop can be tested without IndexedDB or Firestore.
export async function deliverOutbox(queued, { send, remove }) {
  const results = [];
  for (const entry of queued) {
    try {
      await send(entry);
      await remove(entry.id);
      results.push({ id: entry.id, status: 'sent' });
    } catch (error) {
      results.push({ id: entry.id, status: 'failed', error: String(error?.message || error) });
    }
  }
  return results;
}
