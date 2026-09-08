import { useCallback, useEffect, useMemo, useState } from 'react';
import { claimSessionLease, ownsSessionLease, readSessionLease, renewSessionLease, sessionLeaseKey, takeOverSessionLease } from '../learning/sessionLease';

// This value deliberately lives only in this page's JavaScript context. A duplicated
// browser tab may inherit sessionStorage, so storing the holder ID there can make two
// tabs look like the same writer.
const PAGE_CLIENT_ID = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export function useSessionLease(sessionKey) {
  const clientId = useMemo(() => PAGE_CLIENT_ID, []);
  const [lease, setLease] = useState(null);

  useEffect(() => {
    const claimed = claimSessionLease(localStorage, sessionKey, clientId);
    setLease(claimed.lease);
    const refresh = () => setLease(readSessionLease(localStorage, sessionKey));
    const onStorage = (event) => { if (event.key === sessionLeaseKey(sessionKey)) refresh(); };
    window.addEventListener('storage', onStorage);
    const timer = setInterval(() => {
      const current = readSessionLease(localStorage, sessionKey);
      if (current?.holderId === clientId) setLease(renewSessionLease(localStorage, sessionKey, clientId, current.revision).lease);
      else setLease(current);
    }, 10_000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [clientId, sessionKey]);

  const takeOver = useCallback(() => {
    const next = takeOverSessionLease(localStorage, sessionKey, clientId);
    setLease(next);
    return next;
  }, [clientId, sessionKey]);
  const canWrite = useCallback(() => Boolean(lease && ownsSessionLease(localStorage, sessionKey, clientId, lease.revision)), [clientId, lease, sessionKey]);
  return { lease, writable: canWrite(), takeOver, canWrite };
}
