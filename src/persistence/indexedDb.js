const DB_NAME = 'spelling-pronun-learning';
const DB_VERSION = 1;
const STORES = ['sessions', 'attempts', 'outbox', 'meta'];

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openLearningDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexeddb_unavailable'));
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
  };
  return requestResult(request);
}

async function withStore(storeName, mode, operation) {
  const db = await openLearningDb();
  try {
    const transaction = db.transaction(storeName, mode);
    const result = await operation(transaction.objectStore(storeName));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('transaction_aborted'));
    });
    return result;
  } finally {
    db.close();
  }
}

export function saveSession(session) {
  return withStore('sessions', 'readwrite', (store) => requestResult(store.put({ ...session, id: session.id, locallySavedAt: new Date().toISOString() })));
}

export function loadSession(sessionId) {
  return withStore('sessions', 'readonly', (store) => requestResult(store.get(sessionId)));
}

export function saveAttempt(attempt) {
  return withStore('attempts', 'readwrite', (store) => requestResult(store.put({ ...attempt, id: attempt.attemptId })));
}

export async function queueAttempt(attempt) {
  await saveAttempt(attempt);
  return withStore('outbox', 'readwrite', (store) => requestResult(store.put({ id: attempt.attemptId, kind: 'attempt', payload: attempt, queuedAt: new Date().toISOString() })));
}

export function listOutbox() {
  return withStore('outbox', 'readonly', (store) => requestResult(store.getAll()));
}

export function removeOutboxItem(id) {
  return withStore('outbox', 'readwrite', (store) => requestResult(store.delete(id)));
}

export async function flushOutbox(send) {
  const queued = await listOutbox();
  const results = [];
  for (const entry of queued) {
    try {
      await send(entry);
      await removeOutboxItem(entry.id);
      results.push({ id: entry.id, status: 'sent' });
    } catch (error) {
      results.push({ id: entry.id, status: 'failed', error: String(error?.message || error) });
    }
  }
  return results;
}
