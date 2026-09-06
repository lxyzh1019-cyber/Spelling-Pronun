const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];

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
  const recorder = new MediaRecorder(stream, options);
  const startedAt = Date.now();
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
  recorder.start();
  let finished = false;
  const release = () => stream.getTracks().forEach((track) => track.stop());
  return {
    stop: () => new Promise((resolve, reject) => {
      if (finished) return reject(new Error('recording_already_finished'));
      finished = true;
      recorder.addEventListener('stop', () => {
        release();
        const blob = new Blob(chunks, { type: recorder.mimeType || support.mimeType || 'audio/webm' });
        resolve({ blob, durationMs: Date.now() - startedAt, mimeType: blob.type });
      }, { once: true });
      recorder.addEventListener('error', () => { release(); reject(new Error('recording_failed')); }, { once: true });
      recorder.stop();
    }),
    cancel: () => {
      if (finished) return;
      finished = true;
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}
