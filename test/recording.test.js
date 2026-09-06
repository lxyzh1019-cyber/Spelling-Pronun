import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRecordingMimeType, recordingSupport } from '../src/utils/recording.js';

test('recording MIME selection prefers Opus and falls back without inventing support', () => {
  const Recorder = { isTypeSupported: (type) => type === 'audio/webm' };
  assert.equal(chooseRecordingMimeType(Recorder), 'audio/webm');
  assert.equal(chooseRecordingMimeType(null), '');
});

test('server-side recording support reports an explicit technical limitation', () => {
  assert.deepEqual(recordingSupport(), { supported: false, reason: 'microphone_api_unavailable' });
});
