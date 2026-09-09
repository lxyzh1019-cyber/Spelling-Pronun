// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('source guard: home makes C0 spelling, sentence, punctuation, and grammar lessons primary actions', async () => {
  const source = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  for (const lessonId of ['pilot-sp-patterns', 'pilot-se-complete', 'pilot-pu-capitals', 'pilot-gr-pronouns']) {
    assert.match(source, new RegExp(`/lesson/${lessonId}`));
  }
  assert.match(source, /Start a language lesson/);
  assert.match(source, /Optional word games/);
  assert.match(source, /Word-game activity/);
});

test('source guard: header prioritizes learning, assessment, and progress over individual word games', async () => {
  const source = await readFile(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
  for (const route of ['/case', '/assessment', '/progress']) assert.match(source, new RegExp(`to: '${route}'`));
  assert.doesNotMatch(source, /to: '\/flashcards'/);
  assert.doesNotMatch(source, /to: '\/scramble'/);
});
