import { useEffect, useRef, useState } from 'react';
import { deleteRecording, saveRecording } from '../persistence/indexedDb';
import { assessRecordingQuality, recordingSupport, startAudioRecording } from '../utils/recording';
import styles from './RecordingAnswer.module.css';

export default function RecordingAnswer({ itemId, learnerId, sessionId, onReady, onReset, disabled = false }) {
  const controllerRef = useRef(null);
  const urlRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [recordingId, setRecordingId] = useState(null);
  const support = recordingSupport();

  // Recordings stay on this device until the learner deletes them; nothing is uploaded.
  const remove = async () => {
    if (disabled || !recordingId) return;
    try {
      await deleteRecording(recordingId);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setPlaybackUrl('');
      setRecordingId(null);
      setStatus('idle');
      setMessage('Recording deleted from this device. You can record again or continue as a technical issue.');
      onReady(null);
    } catch {
      setMessage('The recording could not be deleted. It remains only on this device.');
    }
  };

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setPlaybackUrl('');
    setRecordingId(null);
    return () => {
      controllerRef.current?.cancel();
      controllerRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [itemId, learnerId, sessionId]);

  useEffect(() => {
    if (!disabled || !controllerRef.current) return;
    controllerRef.current.cancel();
    controllerRef.current = null;
    setStatus('idle');
    setMessage('Recording stopped because this session became read-only.');
    onReady(null);
  }, [disabled, onReady]);

  const start = async () => {
    if (disabled) return;
    if (onReset) onReset();
    else onReady(null);
    setMessage('');
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPlaybackUrl('');
    try {
      controllerRef.current = await startAudioRecording();
      setStatus('recording');
    } catch (error) {
      setStatus('error');
      setMessage(error.message === 'microphone_permission_denied' ? 'Microphone permission was not granted. Record this as a technical issue, not a wrong answer.' : 'Recording could not start. Record this as a technical issue, not a wrong answer.');
    }
  };

  const stop = async () => {
    if (disabled) return;
    setStatus('saving');
    try {
      const result = await controllerRef.current.stop();
      const quality = assessRecordingQuality(result);
      if (!quality.usable) {
        setStatus('error');
        setMessage(quality.reason === 'recording_silent' ? 'No clear voice was detected. Try recording again, or continue as a technical issue; this is not a wrong answer.' : quality.reason === 'recording_too_short' ? 'That recording was too short. Try again, or continue as a technical issue; this is not a wrong answer.' : 'The recording was empty. Try again, or continue as a technical issue; this is not a wrong answer.');
        return;
      }
      const recordingId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      await saveRecording({ id: recordingId, itemId, learnerId, sessionId, ...result });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(result.blob);
      setPlaybackUrl(urlRef.current);
      setRecordingId(recordingId);
      setStatus('ready');
      setMessage('Recording saved on this device only, until you delete it. Nothing is uploaded. Play it back before submitting; a human review is still required.');
      onReady({ recordingId, durationMs: result.durationMs, mimeType: result.mimeType });
    } catch {
      setStatus('error');
      setMessage('Recording could not be saved. Record this as a technical issue, not a wrong answer.');
    } finally {
      controllerRef.current = null;
    }
  };

  if (!support.supported) return <p role="status">Microphone recording is unavailable in this browser. Continue as a technical issue; this is not a wrong answer.</p>;
  return <div className={styles.recordingAnswer}>
    <div className={styles.controls}>
      {status !== 'recording' && status !== 'saving' && <button className={`${styles.recordButton} ${styles.startButton}`} type="button" disabled={disabled} onClick={start}>{status === 'ready' ? 'Record again' : 'Start recording'}</button>}
      {status === 'recording' && <button className={`${styles.recordButton} ${styles.stopButton}`} type="button" disabled={disabled} onClick={stop}>Stop recording</button>}
      {status === 'saving' && <button className={`${styles.recordButton} ${styles.savingButton}`} type="button" disabled>Saving recording…</button>}
    </div>
    {playbackUrl && <audio className={styles.playback} controls src={playbackUrl}>Audio playback is not supported.</audio>}
    {status === 'ready' && recordingId && <button className={styles.deleteButton} type="button" disabled={disabled} onClick={remove}>Delete this recording</button>}
    {message && <p className={styles.message} role={status === 'error' ? 'alert' : 'status'}>{message}</p>}
  </div>;
}
