import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRecordingQuality, chooseRecordingMimeType, isAudiblePeak, recordingSupport } from '../src/utils/recording.js';
import { stopSpeech } from '../src/utils/speech.js';

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
