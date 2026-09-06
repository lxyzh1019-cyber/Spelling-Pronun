import { useEffect, useRef, useState } from 'react';
import { saveRecording } from '../persistence/indexedDb';
import { recordingSupport, startAudioRecording } from '../utils/recording';

export default function RecordingAnswer({ itemId, learnerId, sessionId, onReady }) {
  const controllerRef = useRef(null);
  const urlRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const support = recordingSupport();

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setPlaybackUrl('');
    return () => {
      controllerRef.current?.cancel();
      controllerRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [itemId, learnerId, sessionId]);

  const start = async () => {
    setMessage('');
    try {
      controllerRef.current = await startAudioRecording();
      setStatus('recording');
    } catch (error) {
      setStatus('error');
      setMessage(error.message === 'microphone_permission_denied' ? 'Microphone permission was not granted. Record this as a technical issue, not a wrong answer.' : 'Recording could not start. Record this as a technical issue, not a wrong answer.');
    }
  };

  const stop = async () => {
    setStatus('saving');
    try {
      const result = await controllerRef.current.stop();
      const recordingId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      await saveRecording({ id: recordingId, itemId, learnerId, sessionId, ...result });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(result.blob);
      setPlaybackUrl(urlRef.current);
      setStatus('ready');
      setMessage('Recording saved on this device. Play it back before submitting. A human review is still required.');
      onReady({ recordingId, durationMs: result.durationMs, mimeType: result.mimeType });
    } catch {
      setStatus('error');
      setMessage('Recording could not be saved. Record this as a technical issue, not a wrong answer.');
    } finally {
      controllerRef.current = null;
    }
  };

  if (!support.supported) return <p role="status">Microphone recording is unavailable in this browser. Continue as a technical issue; this is not a wrong answer.</p>;
  return <div>
    <div>
      {status !== 'recording' && status !== 'saving' && <button type="button" onClick={start}>{status === 'ready' ? 'Record again' : 'Start recording'}</button>}
      {status === 'recording' && <button type="button" onClick={stop}>Stop recording</button>}
      {status === 'saving' && <button type="button" disabled>Saving recording…</button>}
    </div>
    {playbackUrl && <audio controls src={playbackUrl}>Audio playback is not supported.</audio>}
    {message && <p role={status === 'error' ? 'alert' : 'status'}>{message}</p>}
  </div>;
}
