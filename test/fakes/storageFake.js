// A Map-backed stand-in for localStorage, with an optional failure mode so the
// "storage is full or blocked" path can be exercised.
export function createStorageFake({ failOnWrite = false } = {}) {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      if (failOnWrite) throw new Error('QuotaExceededError');
      entries.set(key, String(value));
    },
    removeItem: (key) => { entries.delete(key); },
  };
}
