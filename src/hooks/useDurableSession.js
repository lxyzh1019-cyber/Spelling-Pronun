import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { createSessionSnapshot, selectSessionState } from '../persistence/durableSession';
import { getOrCreateDeviceId } from '../persistence/deviceIdentity';
import { claimRemoteSession, saveRemoteSession } from '../persistence/firebaseSessionStore';
import { loadSession, saveSession } from '../persistence/indexedDb';
import { useSessionLease } from './useSessionLease';

function readLocalRaw(storageKey) {
  try { return localStorage.getItem(storageKey); } catch { return null; }
}

function stateStatus(state) {
  return state.stage === 'complete' || state.completedAt ? 'complete' : 'active';
}

export function useDurableSession({ storageKey, learnerId, mode, contentVersion, orderedItemIds, initialState, account = null }) {
  const lease = useSessionLease(storageKey);
  const deviceId = useRef(getOrCreateDeviceId()).current;
  const cloudEnabled = Boolean(account && !account.isAnonymous);
  const cloudKey = cloudEnabled ? `${account.uid}:${storageKey}` : null;
  const [state, setState] = useState(() => selectSessionState({
    localRaw: readLocalRaw(storageKey),
    durableSnapshot: null,
    expected: { id: storageKey, learnerId, mode, contentVersion },
    fallback: initialState,
  }).state);
  const [readyKey, setReadyKey] = useState(null);
  const [localSaveStatus, setLocalSaveStatus] = useState('restoring');
  const [remoteSaveStatus, setRemoteSaveStatus] = useState('idle');
  const [cloudOwnership, setCloudOwnership] = useState({ key: null, ready: true, writable: true, error: null });
  const [hydrateRequest, setHydrateRequest] = useState(0);
  const ownerKeyRef = useRef(storageKey);
  const revisionRef = useRef(0);
  const cloudRecordRef = useRef(null);
  const cloudQueueRef = useRef(Promise.resolve());
  const cloudWriteSequenceRef = useRef(0);
  const cloudGenerationRef = useRef(0);
  const forceRemoteTakeoverRef = useRef(null);
  const canWriteLocalRef = useRef(lease.canWrite);
  const configRef = useRef(null);
  canWriteLocalRef.current = lease.canWrite;
  configRef.current = { storageKey, learnerId, mode, contentVersion, orderedItemIds, initialState, account, cloudEnabled, cloudKey, deviceId };

  const localReady = readyKey === storageKey;
  const cloudReady = !cloudEnabled || (cloudOwnership.key === cloudKey && cloudOwnership.ready);
  const ready = localReady && cloudReady;
  const remoteBlocksWrite = cloudEnabled && !cloudOwnership.error && !cloudOwnership.writable;
  const writable = ready && lease.writable && !remoteBlocksWrite;

  useEffect(() => {
    let cancelled = false;
    const config = configRef.current;
    const cloudGeneration = cloudGenerationRef.current + 1;
    cloudGenerationRef.current = cloudGeneration;
    setLocalSaveStatus('restoring');
    setReadyKey(null);
    if (config.cloudEnabled) setCloudOwnership({ key: config.cloudKey, ready: false, writable: false, error: null });
    else {
      cloudRecordRef.current = null;
      setCloudOwnership({ key: null, ready: true, writable: true, error: null });
      setRemoteSaveStatus('idle');
    }
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

      let selectedState = selected.state;
      if (config.cloudEnabled && lease.writable) {
        try {
          const takeOver = forceRemoteTakeoverRef.current === config.cloudKey;
          forceRemoteTakeoverRef.current = null;
          const decision = await claimRemoteSession(db, {
            userId: config.account.uid,
            learnerId: config.learnerId,
            sessionId: config.storageKey,
            deviceId: config.deviceId,
            mode: config.mode,
            contentVersion: config.contentVersion,
            orderedItemIds: config.orderedItemIds,
            state: selectedState,
            status: stateStatus(selectedState),
          }, { takeOver });
          if (cancelled || configRef.current.cloudKey !== config.cloudKey || cloudGenerationRef.current !== cloudGeneration) return;
          cloudRecordRef.current = decision.record;
          selectedState = decision.record.state;
          setCloudOwnership({ key: config.cloudKey, ready: true, writable: decision.writable, error: null });
          setRemoteSaveStatus(decision.writable ? 'synced' : 'read-only');
        } catch (error) {
          if (cancelled || configRef.current.cloudKey !== config.cloudKey || cloudGenerationRef.current !== cloudGeneration) return;
          cloudRecordRef.current = null;
          setCloudOwnership({ key: config.cloudKey, ready: true, writable: true, error: error?.code || error?.message || 'cloud-session-unavailable' });
          setRemoteSaveStatus('sync-error');
        }
      } else if (config.cloudEnabled) {
        cloudRecordRef.current = null;
        setCloudOwnership({ key: config.cloudKey, ready: true, writable: false, error: null });
        setRemoteSaveStatus('deferred');
      }

      if (cancelled || configRef.current.storageKey !== config.storageKey) return;
      ownerKeyRef.current = config.storageKey;
      revisionRef.current = selected.revision;
      setState(selectedState);
      setReadyKey(config.storageKey);
      setLocalSaveStatus(selected.source === 'indexeddb' ? 'restored' : 'saved');
    })();
    return () => { cancelled = true; };
  }, [storageKey, learnerId, mode, contentVersion, cloudKey, cloudEnabled, lease.writable, hydrateRequest]);

  useEffect(() => {
    if (!localReady || ownerKeyRef.current !== storageKey || !lease.writable || !canWriteLocalRef.current()) return;
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
    setLocalSaveStatus('saving');
    saveSession(snapshot).then(() => {
      if (ownerKeyRef.current === storageKey && revisionRef.current === revision) setLocalSaveStatus('saved');
    }).catch(() => {
      if (ownerKeyRef.current === storageKey && revisionRef.current === revision) setLocalSaveStatus(localSaved ? 'saved-locally' : 'save-error');
    });

    if (!config.cloudEnabled || config.cloudKey !== cloudOwnership.key || cloudOwnership.error || !cloudOwnership.writable || !cloudRecordRef.current) return;
    const sequence = cloudWriteSequenceRef.current + 1;
    cloudWriteSequenceRef.current = sequence;
    const cloudGeneration = cloudGenerationRef.current;
    const desiredState = state;
    setRemoteSaveStatus('syncing');
    cloudQueueRef.current = cloudQueueRef.current.catch(() => {}).then(async () => {
      if (configRef.current.cloudKey !== config.cloudKey || cloudGenerationRef.current !== cloudGeneration) return;
      const current = cloudRecordRef.current;
      if (!current || current.deviceId !== config.deviceId) throw new Error('stale_session_owner');
      const saved = await saveRemoteSession(db, {
        userId: config.account.uid,
        learnerId: config.learnerId,
        sessionId: config.storageKey,
        deviceId: config.deviceId,
        mode: config.mode,
        contentVersion: config.contentVersion,
        orderedItemIds: config.orderedItemIds,
        ownerEpoch: current.ownerEpoch,
        expectedRevision: current.revision,
        state: desiredState,
        status: stateStatus(desiredState),
      });
      if (configRef.current.cloudKey !== config.cloudKey || cloudGenerationRef.current !== cloudGeneration) return;
      cloudRecordRef.current = saved;
      if (cloudWriteSequenceRef.current === sequence) setRemoteSaveStatus('synced');
    }).catch((error) => {
      if (configRef.current.cloudKey !== config.cloudKey || cloudGenerationRef.current !== cloudGeneration) return;
      const stale = String(error?.code || error?.message || '').includes('stale_session');
      if (stale) {
        cloudGenerationRef.current += 1;
        setCloudOwnership({ key: config.cloudKey, ready: true, writable: false, error: null });
      }
      setRemoteSaveStatus(stale ? 'read-only' : 'sync-error');
    });
  }, [cloudOwnership.error, cloudOwnership.key, cloudOwnership.writable, contentVersion, learnerId, lease.writable, localReady, mode, state, storageKey]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== storageKey || canWriteLocalRef.current()) return;
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

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    const retryCloud = () => setHydrateRequest((current) => current + 1);
    window.addEventListener('online', retryCloud);
    return () => window.removeEventListener('online', retryCloud);
  }, [cloudEnabled, cloudKey]);

  const takeOverHere = useCallback(() => {
    if (cloudEnabled) forceRemoteTakeoverRef.current = cloudKey;
    cloudGenerationRef.current += 1;
    lease.takeOver();
    setReadyKey(null);
    setHydrateRequest((current) => current + 1);
  }, [cloudEnabled, cloudKey, lease.takeOver]);

  const canWrite = useCallback(() => readyKey === storageKey && lease.canWrite() && !remoteBlocksWrite, [lease.canWrite, readyKey, remoteBlocksWrite, storageKey]);
  let sessionSaveStatus = localSaveStatus;
  if (!ready) sessionSaveStatus = 'restoring';
  else if (cloudEnabled && cloudOwnership.error) sessionSaveStatus = localSaveStatus === 'saving' ? 'saving' : 'saved-locally';
  else if (remoteSaveStatus === 'syncing') sessionSaveStatus = 'syncing';
  else if (remoteSaveStatus === 'sync-error') sessionSaveStatus = 'saved-locally';
  else if (remoteSaveStatus === 'read-only') sessionSaveStatus = 'read-only';

  return { state, setState, ready, writable, canWrite, takeOverHere, ownerKeyRef, sessionSaveStatus, cloudError: cloudOwnership.error };
}
