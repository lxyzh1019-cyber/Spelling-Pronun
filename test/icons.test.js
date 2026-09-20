// The home-screen icons. A PNG header is enough to hold the two things that go wrong silently: a file
// that is not the size it claims, and an icon with transparency, which iOS composites on black.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OPAQUE_COLOUR_TYPES = [0, 2, 3];

async function header(path) {
  const file = await readFile(new URL(path, import.meta.url));
  assert.ok(file.subarray(0, 8).equals(SIGNATURE), `${path} is not a PNG`);
  assert.equal(file.toString('ascii', 12, 16), 'IHDR', `${path} has no header chunk`);
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20), colourType: file[25] };
}

test('the installed icons are real PNGs, at the sizes Apple and the manifest ask for, with no transparency', async () => {
  const expected = [
    ['../public/apple-touch-icon.png', 180],
    ['../public/icon-192.png', 192],
    ['../public/icon-512.png', 512],
  ];
  for (const [path, size] of expected) {
    const { width, height, colourType } = await header(path);
    assert.deepEqual([width, height], [size, size], `${path} is ${width}x${height}, not ${size}`);
    assert.ok(
      OPAQUE_COLOUR_TYPES.includes(colourType),
      `${path} carries an alpha channel; iOS ignores it and composites the icon on black`,
    );
  }
});

test('both candidates are rendered at every size, so the parent can compare them', async () => {
  for (const candidate of ['dot', 'tile']) {
    for (const size of [180, 192, 512]) {
      const { width } = await header(`../docs/icons/candidate-${candidate}-${size}.png`);
      assert.equal(width, size);
    }
  }
});

test('source guard: the install colours and the cache name moved together with the icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.theme_color, '#FFF6E3');
  assert.equal(manifest.background_color, '#FFF6E3');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /name="theme-color" content="#FFF6E3"/);
  // A cache-first service worker would keep handing back the old icons after a deploy.
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /CACHE_NAME = 'spelling-tutor-v3'/);
});
