// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { learnerLessonTiles } from '../src/data/lessonCatalog.js';

// The contract: the four approved C0 lessons are the primary actions on the home screen, and the
// word games are secondary. The routes are asserted against the catalog the page renders from rather
// than against the page's source text — Home.jsx used to hold them as four hardcoded literals, and
// pinning those literals would have blocked deriving the tiles, which is what let an approved pack
// finally appear without a code change. The wording assertions stay a source guard, because wording
// is what a source guard is for.
test('home makes the approved C0 lessons primary actions', async () => {
  const routes = learnerLessonTiles().map((tile) => tile.to);
  for (const lessonId of ['pilot-sp-patterns', 'pilot-se-complete', 'pilot-pu-capitals', 'pilot-gr-pronouns']) {
    assert.ok(routes.includes(`/lesson/${lessonId}`), `home does not offer /lesson/${lessonId}`);
  }
  const source = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
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
