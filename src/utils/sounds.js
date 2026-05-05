// Audio Web API for sound effects
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
let soundEnabled = true;

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

export function getSoundEnabled() {
  return soundEnabled;
}

// Simple synth-based sounds (no external files needed)
export function playCorrectSound() {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
  osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playIncorrectSound() {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(196, now); // G3
  osc.frequency.setValueAtTime(165.41, now + 0.15); // E3

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}

export function playMilestoneSound() {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.25, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
}

export function playHintSound() {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(440, now); // A4
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}
