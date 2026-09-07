import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageNames = ['AssessmentRunner', 'CasePage', 'Flashcards', 'SpellingTest'];

test('every learner-facing speech screen uses scoped cancellable playback', async () => {
  for (const pageName of pageNames) {
    const source = await readFile(new URL(`../src/pages/${pageName}.jsx`, import.meta.url), 'utf8');
    assert.match(source, /useCancellableSpeech\(/, `${pageName} does not scope speech playback`);
    assert.doesNotMatch(source, /from ['"]\.\.\/utils\/speech['"]/, `${pageName} bypasses cancellable playback`);
  }
});

test('delayed spelling playback is cleared when the owned session changes', async () => {
  const source = await readFile(new URL('../src/pages/SpellingTest.jsx', import.meta.url), 'utf8');
  assert.match(source, /speechTimerRef/);
  assert.match(source, /useEffect\(\(\) => \(\) => clearTimeout\(speechTimerRef\.current\), \[sessionKey\]\)/);
});
