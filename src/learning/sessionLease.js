export const SESSION_LEASE_TTL_MS = 45_000;

export function sessionLeaseKey(sessionKey) {
  return `spelling-session-lease:${sessionKey}`;
}

export function readSessionLease(storage, sessionKey) {
  try {
    return JSON.parse(storage.getItem(sessionLeaseKey(sessionKey))) || null;
  } catch {
    return null;
  }
}

function writeLease(storage, sessionKey, lease) {
  storage.setItem(sessionLeaseKey(sessionKey), JSON.stringify(lease));
  return lease;
}

export function claimSessionLease(storage, sessionKey, holderId, now = Date.now(), ttlMs = SESSION_LEASE_TTL_MS) {
  const current = readSessionLease(storage, sessionKey);
  if (current && current.expiresAt > now && current.holderId !== holderId) return { writable: false, lease: current };
  const lease = {
    holderId,
    revision: (current?.revision || 0) + 1,
    claimedAt: current?.holderId === holderId ? current.claimedAt : now,
    updatedAt: now,
    expiresAt: now + ttlMs,
  };
  writeLease(storage, sessionKey, lease);
  const confirmed = readSessionLease(storage, sessionKey);
  return { writable: confirmed?.holderId === holderId && confirmed.revision === lease.revision, lease: confirmed };
}

export function takeOverSessionLease(storage, sessionKey, holderId, now = Date.now(), ttlMs = SESSION_LEASE_TTL_MS) {
  const current = readSessionLease(storage, sessionKey);
  const lease = { holderId, revision: (current?.revision || 0) + 1, claimedAt: now, updatedAt: now, expiresAt: now + ttlMs };
  writeLease(storage, sessionKey, lease);
  return lease;
}

export function renewSessionLease(storage, sessionKey, holderId, revision, now = Date.now(), ttlMs = SESSION_LEASE_TTL_MS) {
  const current = readSessionLease(storage, sessionKey);
  if (!current || current.holderId !== holderId || current.revision !== revision || current.expiresAt <= now) return { writable: false, lease: current };
  const lease = { ...current, updatedAt: now, expiresAt: now + ttlMs };
  writeLease(storage, sessionKey, lease);
  return { writable: true, lease };
}

export function ownsSessionLease(storage, sessionKey, holderId, revision, now = Date.now()) {
  const current = readSessionLease(storage, sessionKey);
  return Boolean(current && current.holderId === holderId && current.revision === revision && current.expiresAt > now);
}
