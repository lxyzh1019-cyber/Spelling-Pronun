export async function playRecordedAudio(url, { signal } = {}) {
  if (signal?.aborted) return { ok: false, reason: 'cancelled' };
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return { ok: false, reason: 'unavailable' };
  let audio;
  let detach = () => {};
  try {
    audio = new window.Audio(url);
    const stop = () => {
      audio.pause?.();
      try { audio.currentTime = 0; } catch { /* Some implementations expose a read-only currentTime. */ }
      detach();
    };
    detach = () => signal?.removeEventListener('abort', stop);
    signal?.addEventListener('abort', stop, { once: true });
    audio.addEventListener?.('ended', detach, { once: true });
    await audio.play();
    if (signal?.aborted) return { ok: false, reason: 'cancelled' };
    return { ok: true, usedRecordedAudio: true };
  } catch {
    detach();
    return { ok: false, reason: 'playback-failed' };
  }
}
