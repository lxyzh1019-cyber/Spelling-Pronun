let voicesReady;

function ensureVoices() {
  if (voicesReady) return voicesReady;
  const synth = window.speechSynthesis;
  voicesReady = new Promise((resolve) => {
    const v = synth.getVoices();
    if (v.length) return resolve(v);
    const handler = () => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
  });
  return voicesReady;
}

export async function speak(
  text,
  { rate = 0.9, pitch = 1, lang = 'en-US' } = {}
) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return;

  const voices = await ensureVoices();
  const voice =
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang?.startsWith(lang.split('-')[0]));

  synth.cancel();
  const u = new window.SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  u.lang = lang;
  if (voice) u.voice = voice;
  synth.speak(u);
}
