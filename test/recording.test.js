import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assessRecordingQuality, chooseRecordingMimeType, isAudiblePeak, recordingSupport } from '../src/utils/recording.js';
import { speak, stopSpeech } from '../src/utils/speech.js';
import { playRecordedAudio } from '../src/utils/audioPlayback.js';

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

test('reviewed recording playback is cancellable and reports browser limitations', async () => {
  assert.deepEqual(await playRecordedAudio('/audio/word.mp3'), { ok: false, reason: 'unavailable' });
  const originalWindow = globalThis.window;
  let pauses = 0;
  globalThis.window = {
    Audio: class {
      constructor(url) { this.url = url; this.currentTime = 4; }
      addEventListener() {}
      pause() { pauses += 1; }
      play() { return Promise.resolve(); }
    },
  };
  try {
    const controller = new AbortController();
    assert.deepEqual(await playRecordedAudio('/audio/word.mp3', { signal: controller.signal }), { ok: true, usedRecordedAudio: true });
    controller.abort();
    assert.equal(pauses, 1);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('recording controls use a large, touch-friendly visual treatment', async () => {
  const component = await readFile(new URL('../src/components/RecordingAnswer.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/components/RecordingAnswer.module.css', import.meta.url), 'utf8');
  assert.match(component, /styles\.recordButton/);
  assert.match(css, /min-height: 56px/);
  assert.match(css, /min-width: 190px/);
  assert.match(css, /font-size: 1\.125rem/);
});
