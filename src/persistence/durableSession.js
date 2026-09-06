export function parseLocalSession(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export function isCompatibleSession(snapshot, { id, learnerId, mode, contentVersion }) {
  return Boolean(
    snapshot
    && snapshot.id === id
    && snapshot.learnerId === learnerId
    && snapshot.mode === mode
    && snapshot.contentVersion === contentVersion
    && snapshot.state
    && typeof snapshot.state === 'object',
  );
}

export function selectSessionState({ localRaw, durableSnapshot, expected, fallback }) {
  const localState = parseLocalSession(localRaw);
  const durableCompatible = isCompatibleSession(durableSnapshot, expected);
  if (localState) return { state: localState, source: 'local', revision: durableCompatible ? durableSnapshot.revision || 0 : 0 };
  if (durableCompatible) return { state: durableSnapshot.state, source: 'indexeddb', revision: durableSnapshot.revision || 0 };
  return { state: fallback(), source: 'new', revision: 0 };
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
