// A Map-backed stand-in for the small slice of IndexedDB that src/persistence/indexedDb.js uses:
// open, transaction, objectStore, and get / put / delete / getAll requests. It exists so the real
// storage functions can be executed in a test rather than only read as source text.
//
// It is deliberately not a general IndexedDB implementation. It models request objects with
// onsuccess/onerror and a transaction with oncomplete, because that is what `withStore` awaits.

function request(resolveWith, { fail = null } = {}) {
  const req = { result: undefined, error: null, onsuccess: null, onerror: null };
  queueMicrotask(() => {
    if (fail) {
      req.error = fail;
      req.onerror?.();
      return;
    }
    req.result = resolveWith();
    req.onsuccess?.();
  });
  return req;
}

export function createIndexedDbFake({ failOn = null } = {}) {
  const stores = new Map();
  const calls = { put: 0, get: 0, delete: 0, getAll: 0, opens: 0, closes: 0 };
  const dataFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };

  function objectStore(name) {
    const data = dataFor(name);
    return {
      get: (key) => { calls.get += 1; return request(() => data.get(key)); },
      getAll: () => { calls.getAll += 1; return request(() => [...data.values()]); },
      put: (record) => {
        calls.put += 1;
        const fail = failOn === name ? new Error(`write_failed:${name}`) : null;
        return request(() => { data.set(record.id, record); return record.id; }, { fail });
      },
      delete: (key) => { calls.delete += 1; return request(() => { data.delete(key); return undefined; }); },
    };
  }

  const db = {
    close: () => { calls.closes += 1; },
    transaction: () => {
      // The real API fires oncomplete after the caller has attached its handler. `withStore`
      // attaches it only after awaiting the store operation, so the fake signals completion when
      // the handler is set rather than when the transaction is created.
      let settled = false;
      const transaction = { onerror: null, onabort: null, error: null, objectStore };
      Object.defineProperty(transaction, 'oncomplete', {
        get() { return this._oncomplete; },
        set(handler) {
          this._oncomplete = handler;
          if (!handler || settled) return;
          queueMicrotask(() => { settled = true; handler(); });
        },
      });
      return transaction;
    },
  };

  return {
    open: async () => { calls.opens += 1; return db; },
    calls,
    // Test-side inspection, so an assertion can read what was stored without going through the API.
    contents: (name) => [...dataFor(name).values()],
    seed: (name, records) => { for (const record of records) dataFor(name).set(record.id, record); },
  };
}
