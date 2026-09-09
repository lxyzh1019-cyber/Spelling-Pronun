// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('PWA manifest references real install icons and does not fake screenshots', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, '/Spelling-Pronun/');
  assert.equal(manifest.screenshots, undefined);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  for (const icon of manifest.icons) await access(new URL(`../public/${icon.src.split('/').at(-1)}`, import.meta.url));
  await access(new URL('../public/apple-touch-icon.png', import.meta.url));
});

test('source guard: iPad standalone metadata and service-worker registration are present', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.match(main, /serviceWorker\.register/);
  assert.match(main, /import\.meta\.env\.PROD\s*&&\s*'serviceWorker' in navigator/);
});
