function sessionError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function cloudSessionDocumentId(userId, learnerId, sessionId) {
  return [userId, learnerId, sessionId].map((value) => encodeURIComponent(value)).join('__');
}

function assertIdentity(record, expected) {
  if (!record || record.userId !== expected.userId || record.learnerId !== expected.learnerId || record.sessionId !== expected.sessionId) {
    throw sessionError('session_identity_mismatch');
  }
}

function assertPinnedContent(existing, candidate) {
  if (existing.contentVersion !== candidate.contentVersion) throw sessionError('session_content_version_mismatch');
  if (JSON.stringify(existing.orderedItemIds || []) !== JSON.stringify(candidate.orderedItemIds || [])) throw sessionError('session_content_order_mismatch');
}

export function claimCloudSession(existing, candidate, { takeOver = false } = {}) {
  if (!existing) {
    return {
      writable: true,
      changed: true,
      record: {
        userId: candidate.userId,
        learnerId: candidate.learnerId,
        sessionId: candidate.sessionId,
        deviceId: candidate.deviceId,
        mode: candidate.mode,
        contentVersion: candidate.contentVersion,
        orderedItemIds: [...(candidate.orderedItemIds || [])],
        state: candidate.state,
        status: candidate.status || 'active',
        ownerEpoch: 1,
        revision: 1,
      },
    };
  }
  assertIdentity(existing, candidate);
  assertPinnedContent(existing, candidate);
  if (existing.deviceId !== candidate.deviceId && !takeOver) return { writable: false, changed: false, record: existing };
  const ownerChanged = existing.deviceId !== candidate.deviceId;
  return {
    writable: true,
    changed: true,
    record: {
      ...existing,
      deviceId: candidate.deviceId,
      status: existing.status === 'complete' ? 'complete' : 'active',
      ownerEpoch: existing.ownerEpoch + (ownerChanged ? 1 : 0),
      revision: existing.revision + 1,
    },
  };
}

export function saveCloudSession(existing, candidate) {
  assertIdentity(existing, candidate);
  assertPinnedContent(existing, candidate);
  if (existing.deviceId !== candidate.deviceId || existing.ownerEpoch !== candidate.ownerEpoch) throw sessionError('stale_session_owner');
  if (existing.revision !== candidate.expectedRevision) throw sessionError('stale_session_revision');
  return {
    ...existing,
    state: candidate.state,
    status: candidate.status || existing.status,
    revision: existing.revision + 1,
  };
}
