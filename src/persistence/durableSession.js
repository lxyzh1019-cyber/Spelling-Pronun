export function parseLocalSession(raw, expected) {
  if (typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw);
    return value?.mirrorVersion === 1 && isCompatibleSession(value, expected) ? value.state : null;
  } catch {
    return null;
  }
}

export function isCompatibleSession(snapshot, { id, learnerId, mode, contentVersion, orderedItemIds }) {
  return Boolean(
    snapshot
    && snapshot.id === id
    && snapshot.learnerId === learnerId
    && snapshot.mode === mode
    && snapshot.contentVersion === contentVersion
    && (!orderedItemIds || JSON.stringify(snapshot.orderedItemIds || []) === JSON.stringify(orderedItemIds))
    && snapshot.state
    && typeof snapshot.state === 'object',
  );
}

export function selectSessionState({ localRaw, durableSnapshot, expected, fallback }) {
  const localState = parseLocalSession(localRaw, expected);
  const durableCompatible = isCompatibleSession(durableSnapshot, expected);
  if (localState) return { state: localState, source: 'local', revision: durableCompatible ? durableSnapshot.revision || 0 : 0 };
  if (durableCompatible) return { state: durableSnapshot.state, source: 'indexeddb', revision: durableSnapshot.revision || 0 };
  return { state: fallback(), source: 'new', revision: 0 };
}

export function createLocalSessionMirror({ id, learnerId, mode, contentVersion, orderedItemIds = [], state }) {
  return { mirrorVersion: 1, id, learnerId, mode, contentVersion, orderedItemIds: [...orderedItemIds], state };
}

export function createSessionSnapshot({ id, learnerId, mode, contentVersion, orderedItemIds = [], state, revision }) {
  return {
    id,
    learnerId,
    mode,
    contentVersion,
    orderedItemIds: [...orderedItemIds],
    state,
    revision,
    status: state.stage === 'complete' || state.completedAt ? 'complete' : 'active',
    updatedAt: new Date().toISOString(),
  };
}

export function shouldStoreSession(existing, incoming) {
  return !existing || (existing.revision ?? -1) < (incoming.revision ?? 0);
}
