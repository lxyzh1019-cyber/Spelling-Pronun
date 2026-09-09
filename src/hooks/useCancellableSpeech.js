import { useCallback, useEffect, useRef } from 'react';
import { speak, stopSpeech } from '../utils/speech.js';
import { playRecordedAudio } from '../utils/audioPlayback.js';

export function useCancellableSpeech(scopeKey) {
  const controllerRef = useRef(null);
  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    stopSpeech();
  }, []);

  useEffect(() => cancel, [cancel, scopeKey]);

  const play = useCallback(async (text, options = {}) => {
    cancel();
    const controller = new AbortController();
    controllerRef.current = controller;
    const result = await speak(text, { ...options, signal: controller.signal });
    if (controllerRef.current !== controller || controller.signal.aborted) return { ok: false, reason: 'cancelled' };
    return result;
  }, [cancel]);

  const playRecorded = useCallback(async (url) => {
    cancel();
    const controller = new AbortController();
    controllerRef.current = controller;
    const result = await playRecordedAudio(url, { signal: controller.signal });
    if (controllerRef.current !== controller || controller.signal.aborted) return { ok: false, reason: 'cancelled' };
    return result;
  }, [cancel]);

  return { play, playRecorded, cancel };
}
