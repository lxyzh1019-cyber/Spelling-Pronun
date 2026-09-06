let voicesReady;

function ensureVoices() {
  if (voicesReady) return voicesReady;
  const synth = window.speechSynthesis;
  voicesReady = new Promise((resolve) => {
    const v = synth.getVoices();
    if (v.length) return resolve(v);
    let settled = false;
    const finish = (voices) => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };
    const handler = () => {
      finish(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => finish(synth.getVoices()), 1200);
  });
  return voicesReady;
}

export async function speak(
  text,
  { rate = 0.9, pitch = 1, lang = 'en-US' } = {}
) {
  if (typeof window === 'undefined') return { ok: false, reason: 'unavailable' };
  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return { ok: false, reason: 'unsupported' };

  let voices;
  try {
    voices = await ensureVoices();
  } catch {
    return { ok: false, reason: 'voice-load-failed' };
  }
  const voice =
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang?.startsWith(lang.split('-')[0]));

  synth.cancel();
  const u = new window.SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  u.lang = lang;
  if (voice) u.voice = voice;
  try {
    synth.speak(u);
    return { ok: true, usedRequestedLocale: voice?.lang === lang };
  } catch {
    return { ok: false, reason: 'playback-failed' };
  }
}
