// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageNames = ['AssessmentRunner', 'CasePage', 'Flashcards', 'SpellingTest'];

test('source guard: every learner-facing speech screen uses scoped cancellable playback', async () => {
  for (const pageName of pageNames) {
    const source = await readFile(new URL(`../src/pages/${pageName}.jsx`, import.meta.url), 'utf8');
    assert.match(source, /useCancellableSpeech\(/, `${pageName} does not scope speech playback`);
    assert.doesNotMatch(source, /from ['"]\.\.\/utils\/speech['"]/, `${pageName} bypasses cancellable playback`);
  }
});

test('copy guard: flashcards reports audio failure with a visible retry and a truthful locale status', async () => {
  const source = await readFile(new URL('../src/pages/Flashcards.jsx', import.meta.url), 'utf8');
  assert.match(source, /lang: 'en-CA'/);
  assert.match(source, /Tap Listen to retry/);
  assert.match(source, /role="status"/);
});

test('source guard: delayed spelling playback is cleared when the owned session changes', async () => {
  const source = await readFile(new URL('../src/pages/SpellingTest.jsx', import.meta.url), 'utf8');
  assert.match(source, /speechTimerRef/);
  assert.match(source, /useEffect\(\(\) => \(\) => clearTimeout\(speechTimerRef\.current\), \[sessionKey\]\)/);
});
