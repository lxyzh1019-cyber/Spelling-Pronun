// An in-memory stand-in for the slice of Firestore this app uses, so the real persistence
// functions can be executed in a test. It is a plain document store: a path maps to a value.
//
// Not a Firestore implementation. It models what the code depends on: document references,
// transactional read-then-write, merge writes, simple equality queries, batches, and the three
// field sentinels. Anything the app does not use is deliberately absent.

const SERVER_TIMESTAMP = Symbol('serverTimestamp');

function isIncrement(value) { return value && value.__op === 'increment'; }
function isArrayUnion(value) { return value && value.__op === 'arrayUnion'; }

function resolveValue(previous, next, now) {
  if (next === SERVER_TIMESTAMP) return now;
  if (isIncrement(next)) return (previous || 0) + next.by;
  if (isArrayUnion(next)) {
    const existing = Array.isArray(previous) ? previous : [];
    const additions = next.values.filter((entry) => !existing.some((held) => JSON.stringify(held) === JSON.stringify(entry)));
    return [...existing, ...additions];
  }
  return next;
}

function applyWrite(existing, data, { merge = false } = {}, now) {
  const base = merge && existing ? { ...existing } : {};
  for (const [key, value] of Object.entries(data)) base[key] = resolveValue(existing?.[key], value, now);
  return base;
}

export function createFirestoreFake({ now = () => '2026-09-09T00:00:00.000Z', failWrites = false } = {}) {
  const documents = new Map();
  const writeLog = [];
  const db = { __fakeFirestore: true };

  const doc = (_db, collectionName, id) => ({ __ref: true, path: `${collectionName}/${id}`, collection: collectionName, id });
  const collection = (_db, name) => ({ __collection: true, name });
  const where = (field, op, value) => ({ field, op, value });
  const query = (source, ...clauses) => ({ ...source, clauses });

  const snapshotFor = (ref) => ({
    exists: () => documents.has(ref.path),
    data: () => documents.get(ref.path),
    id: ref.id,
  });

  const write = (ref, data, options) => {
    if (failWrites) throw new Error('permission_denied');
    const next = applyWrite(documents.get(ref.path), data, options, now());
    documents.set(ref.path, next);
    writeLog.push({ path: ref.path, merge: Boolean(options?.merge) });
    return next;
  };

  const matches = (data, clauses = []) => clauses.every((clause) => {
    if (clause.op !== '==') throw new Error(`fake firestore only supports == , got ${clause.op}`);
    return data?.[clause.field] === clause.value;
  });

  const getDocs = async (q) => {
    const rows = [...documents.entries()]
      .filter(([path]) => path.startsWith(`${q.name}/`))
      .filter(([, data]) => matches(data, q.clauses))
      .map(([path, data]) => ({ id: path.split('/').slice(1).join('/'), data: () => data }));
    return { docs: rows, empty: rows.length === 0, forEach: (fn) => rows.forEach(fn), size: rows.length };
  };

  // Serialized transactions: reads see every write committed before this one began, which is what
  // lets a test show one device observing another device's total.
  let chain = Promise.resolve();
  const runTransaction = (_db, updateFunction) => {
    const run = chain.then(() => updateFunction({
      get: async (ref) => snapshotFor(ref),
      set: (ref, data, options) => write(ref, data, options),
      update: (ref, data) => write(ref, data, { merge: true }),
    }));
    chain = run.catch(() => {});
    return run;
  };

  const writeBatch = () => {
    const queued = [];
    return {
      set: (ref, data, options) => queued.push([ref, data, options]),
      commit: async () => { for (const [ref, data, options] of queued) write(ref, data, options); },
    };
  };

  return {
    db,
    ops: { doc, runTransaction, serverTimestamp: () => SERVER_TIMESTAMP },
    api: {
      doc, collection, query, where, getDocs, writeBatch, runTransaction,
      getDoc: async (ref) => snapshotFor(ref),
      setDoc: async (ref, data, options) => write(ref, data, options),
      serverTimestamp: () => SERVER_TIMESTAMP,
      increment: (by) => ({ __op: 'increment', by }),
      arrayUnion: (...values) => ({ __op: 'arrayUnion', values }),
    },
    // Test-side inspection.
    read: (path) => documents.get(path),
    all: () => Object.fromEntries(documents),
    writeCount: () => writeLog.length,
    seed: (path, data) => documents.set(path, data),
  };
}
