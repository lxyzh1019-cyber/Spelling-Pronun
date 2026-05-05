export function speak(text, { rate = 0.9, pitch = 1, lang = 'en-US' } = {}) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return;
  synth.cancel();
  const u = new window.SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  u.lang = lang;
  synth.speak(u);
}
