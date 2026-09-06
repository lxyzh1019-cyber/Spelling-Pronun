import { useCallback, useEffect, useRef, useState } from 'react';
import { createSessionSnapshot, selectSessionState } from '../persistence/durableSession';
import { loadSession, saveSession } from '../persistence/indexedDb';
import { useSessionLease } from './useSessionLease';

function readLocalRaw(storageKey) {
  try { return localStorage.getItem(storageKey); } catch { return null; }
}

export function useDurableSession({ storageKey, learnerId, mode, contentVersion, orderedItemIds, initialState }) {
  const lease = useSessionLease(storageKey);
  const [state, setState] = useState(() => selectSessionState({
    localRaw: readLocalRaw(storageKey),
    durableSnapshot: null,
    expected: { id: storageKey, learnerId, mode, contentVersion },
    fallback: initialState,
  }).state);
  const [readyKey, setReadyKey] = useState(null);
  const [sessionSaveStatus, setSessionSaveStatus] = useState('restoring');
  const [hydrateRequest, setHydrateRequest] = useState(0);
  const ownerKeyRef = useRef(storageKey);
  const revisionRef = useRef(0);
  const canWriteRef = useRef(lease.canWrite);
  const configRef = useRef(null);
  canWriteRef.current = lease.canWrite;
  configRef.current = { storageKey, learnerId, mode, contentVersion, orderedItemIds, initialState };
  const ready = readyKey === storageKey;

  useEffect(() => {
    let cancelled = false;
    const config = configRef.current;
    setSessionSaveStatus('restoring');
    setReadyKey(null);
    (async () => {
      let durableSnapshot = null;
      try { durableSnapshot = await loadSession(config.storageKey); } catch { /* local fallback remains usable */ }
      if (cancelled || configRef.current.storageKey !== config.storageKey) return;
      const selected = selectSessionState({
        localRaw: readLocalRaw(config.storageKey),
        durableSnapshot,
        expected: { id: config.storageKey, learnerId: config.learnerId, mode: config.mode, contentVersion: config.contentVersion },
        fallback: config.initialState,
      });
      ownerKeyRef.current = config.storageKey;
      revisionRef.current = selected.revision;
      setState(selected.state);
      setReadyKey(config.storageKey);
      setSessionSaveStatus(selected.source === 'indexeddb' ? 'restored' : 'saved');
    })();
    return () => { cancelled = true; };
  }, [storageKey, learnerId, mode, contentVersion, hydrateRequest]);

  useEffect(() => {
    if (!ready || ownerKeyRef.current !== storageKey || !lease.writable || !canWriteRef.current()) return;
    let localSaved = true;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { localSaved = false; }
    const revision = revisionRef.current + 1;
    revisionRef.current = revision;
    const config = configRef.current;
    const snapshot = createSessionSnapshot({
      id: storageKey,
      learnerId,
      mode,
      contentVersion,
      orderedItemIds: config.orderedItemIds,
      state,
      revision,
    });
    setSessionSaveStatus('saving');
    saveSession(snapshot).then(() => {
      if (ownerKeyRef.current === storageKey && revisionRef.current === revision) setSessionSaveStatus('saved');
    }).catch(() => {
      if (ownerKeyRef.current === storageKey && revisionRef.current === revision) setSessionSaveStatus(localSaved ? 'saved-locally' : 'save-error');
    });
  }, [contentVersion, learnerId, lease.writable, mode, ready, state, storageKey]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== storageKey || canWriteRef.current()) return;
      const selected = selectSessionState({
        localRaw: readLocalRaw(storageKey),
        durableSnapshot: null,
        expected: { id: storageKey, learnerId, mode, contentVersion },
        fallback: initialState,
      });
      setState(selected.state);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [contentVersion, initialState, learnerId, mode, storageKey]);

  const takeOverHere = useCallback(() => {
    lease.takeOver();
    setReadyKey(null);
    setHydrateRequest((current) => current + 1);
  }, [lease.takeOver]);

  const canWrite = useCallback(() => readyKey === storageKey && lease.canWrite(), [lease.canWrite, readyKey, storageKey]);
  return { state, setState, ready, writable: ready && lease.writable, canWrite, takeOverHere, ownerKeyRef, sessionSaveStatus };
}
