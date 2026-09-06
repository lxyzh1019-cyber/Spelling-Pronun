const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
const MIN_RECORDING_MS = 500;
const AUDIBLE_PEAK_THRESHOLD = 0.02;

export function assessRecordingQuality({ blob, durationMs, audible }) {
  if (!blob?.size) return { usable: false, reason: 'recording_empty' };
  if (!Number.isFinite(durationMs) || durationMs < MIN_RECORDING_MS) return { usable: false, reason: 'recording_too_short' };
  if (audible === false) return { usable: false, reason: 'recording_silent' };
  return { usable: true, reason: null };
}

export function isAudiblePeak(peak) {
  return Number.isFinite(peak) && peak >= AUDIBLE_PEAK_THRESHOLD;
}

async function createSignalMonitor(stream) {
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;
  let context;
  try {
    context = new AudioContextCtor();
    if (context.state === 'suspended') await context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let peak = 0;
    const sample = () => {
      analyser.getByteTimeDomainData(samples);
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128) / 128);
    };
    const timer = setInterval(sample, 100);
    return {
      stop: () => {
        sample();
        clearInterval(timer);
        source.disconnect();
        void context.close();
        return isAudiblePeak(peak);
      },
    };
  } catch {
    if (context) void context.close();
    return null;
  }
}

export function chooseRecordingMimeType(MediaRecorderCtor = globalThis.MediaRecorder) {
  if (!MediaRecorderCtor) return '';
  return MIME_CANDIDATES.find((type) => typeof MediaRecorderCtor.isTypeSupported !== 'function' || MediaRecorderCtor.isTypeSupported(type)) || '';
}

export function recordingSupport() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return { supported: false, reason: 'microphone_api_unavailable' };
  if (typeof MediaRecorder === 'undefined') return { supported: false, reason: 'recorder_unavailable' };
  return { supported: true, mimeType: chooseRecordingMimeType() };
}

export async function startAudioRecording() {
  const support = recordingSupport();
  if (!support.supported) throw new Error(support.reason);
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const reason = error?.name === 'NotAllowedError' ? 'microphone_permission_denied' : 'microphone_start_failed';
    throw new Error(reason, { cause: error });
  }
  const chunks = [];
  const options = support.mimeType ? { mimeType: support.mimeType } : undefined;
  const release = () => stream.getTracks().forEach((track) => track.stop());
  let recorder;
  let signalMonitor;
  try {
    recorder = new MediaRecorder(stream, options);
    signalMonitor = await createSignalMonitor(stream);
  } catch (error) {
    release();
    throw new Error('recorder_start_failed', { cause: error });
  }
  const startedAt = Date.now();
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
  let finished = false;
  let monitorFinished = false;
  const finishMonitor = () => {
    if (monitorFinished) return undefined;
    monitorFinished = true;
    return signalMonitor?.stop();
  };
  try {
    recorder.start();
  } catch (error) {
    finishMonitor();
    release();
    throw new Error('recorder_start_failed', { cause: error });
  }
  return {
    stop: () => new Promise((resolve, reject) => {
      if (finished) return reject(new Error('recording_already_finished'));
      finished = true;
      recorder.addEventListener('stop', () => {
        const audible = finishMonitor();
        release();
        const blob = new Blob(chunks, { type: recorder.mimeType || support.mimeType || 'audio/webm' });
        resolve({ blob, durationMs: Date.now() - startedAt, mimeType: blob.type, audible });
      }, { once: true });
      recorder.addEventListener('error', () => { finishMonitor(); release(); reject(new Error('recording_failed')); }, { once: true });
      recorder.stop();
    }),
    cancel: () => {
      if (finished) return;
      finished = true;
      if (recorder.state !== 'inactive') recorder.stop();
      finishMonitor();
      release();
    },
  };
}
