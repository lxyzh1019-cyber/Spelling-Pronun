const DEVICE_KEY = 'spelling-family-device-id';
const PAGE_FALLBACK_ID = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export function getOrCreateDeviceId(storage = globalThis.localStorage, createId = () => globalThis.crypto?.randomUUID?.() || PAGE_FALLBACK_ID) {
  try {
    const existing = storage?.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = createId();
    storage?.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return PAGE_FALLBACK_ID;
  }
}
