import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRecordingQuality, chooseRecordingMimeType, isAudiblePeak, recordingSupport } from '../src/utils/recording.js';
import { speak, stopSpeech } from '../src/utils/speech.js';

test('recording MIME selection prefers Opus and falls back without inventing support', () => {
  const Recorder = { isTypeSupported: (type) => type === 'audio/webm' };
  assert.equal(chooseRecordingMimeType(Recorder), 'audio/webm');
  assert.equal(chooseRecordingMimeType(null), '');
});

test('server-side recording support reports an explicit technical limitation', () => {
  assert.deepEqual(recordingSupport(), { supported: false, reason: 'microphone_api_unavailable' });
});

test('recording quality rejects empty, too-short, and silent captures without scoring them', () => {
  assert.deepEqual(assessRecordingQuality({ blob: { size: 0 }, durationMs: 1000, audible: true }), { usable: false, reason: 'recording_empty' });
  assert.deepEqual(assessRecordingQuality({ blob: { size: 100 }, durationMs: 200, audible: true }), { usable: false, reason: 'recording_too_short' });
  assert.deepEqual(assessRecordingQuality({ blob: { size: 100 }, durationMs: 1000, audible: false }), { usable: false, reason: 'recording_silent' });
  assert.deepEqual(assessRecordingQuality({ blob: { size: 100 }, durationMs: 1000, audible: undefined }), { usable: true, reason: null });
  assert.equal(isAudiblePeak(0.019), false);
  assert.equal(isAudiblePeak(0.02), true);
});

test('speech cancellation is safe when no browser synthesizer exists', () => {
  assert.equal(stopSpeech(), false);
});

test('speech playback can be aborted when the learner or route changes', async () => {
  const originalWindow = globalThis.window;
  let cancellations = 0;
  const synth = {
    cancel: () => { cancellations += 1; },
    getVoices: () => [{ lang: 'en-CA' }],
    speak: () => {},
  };
  globalThis.window = {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
  };
  try {
    const controller = new AbortController();
    const result = await speak('A two-sentence recap.', { lang: 'en-CA', signal: controller.signal });
    assert.equal(result.ok, true);
    assert.equal(result.usedRequestedLocale, true);
    controller.abort();
    assert.equal(cancellations, 2);
    assert.deepEqual(await speak('Do not play.', { signal: AbortSignal.abort() }), { ok: false, reason: 'cancelled' });
  } finally {
    globalThis.window = originalWindow;
  }
});
