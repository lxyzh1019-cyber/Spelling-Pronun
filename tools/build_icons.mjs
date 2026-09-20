// Render the home-screen icon candidates, and install the chosen one.
//
// There is no image library in this project and none is added for four PNGs: the headless Chromium
// that is already on the machine renders the same HTML the app is built from, so the icon cannot
// drift from the design. Each candidate is drawn once at 512 and screenshotted at each size.
//
//   node tools/build_icons.mjs                 # render both candidates into docs/icons/
//   node tools/build_icons.mjs --install dot   # …and install that one into public/
//
// CHROMIUM=/path/to/chrome overrides the browser.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, resize } from './png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const CANDIDATES = ['dot', 'tile'];
// 180 is what Safari asks for on the home screen; 192 and 512 are the manifest's two icons.
export const SIZES = [180, 192, 512];

export function previewPath(candidate, size) {
  return resolve(root, 'docs/icons', `candidate-${candidate}-${size}.png`);
}

// The browser is asked for one size only. Headless Chromium refuses to open a window much under
// 500px, so a 180px screenshot comes back as a crop of the full-size artwork rather than a small
// picture of it — which is how this went wrong the first time.
function renderFullSize(candidate) {
  const out = previewPath(candidate, 512);
  const page = resolve(here, 'icons', `${candidate}.html`);
  const result = spawnSync(CHROMIUM, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=3000',
    '--window-size=512,512',
    `--screenshot=${out}`,
    `file://${page}`,
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${CHROMIUM} exited ${result.status}: ${result.stderr}`);
  return out;
}

export function renderCandidate(candidate) {
  const full = decodePng(readFileSync(renderFullSize(candidate)));
  // Re-encoded rather than left as Chromium wrote it, so all three sizes are opaque RGB.
  writeFileSync(previewPath(candidate, 512), encodePng(full));
  const written = [previewPath(candidate, 512)];
  for (const size of SIZES.filter((value) => value !== 512)) {
    const path = previewPath(candidate, size);
    writeFileSync(path, encodePng(resize(full, size)));
    written.push(path);
  }
  return written;
}

function install(candidate) {
  const targets = [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']];
  for (const [size, name] of targets) copyFileSync(previewPath(candidate, size), resolve(root, 'public', name));
  return targets.map(([, name]) => name);
}

if (process.argv[1] && process.argv[1].endsWith('build_icons.mjs')) {
  mkdirSync(resolve(root, 'docs/icons'), { recursive: true });
  for (const candidate of CANDIDATES) {
    for (const path of renderCandidate(candidate)) console.log('rendered', path);
  }
  const flag = process.argv.indexOf('--install');
  if (flag !== -1) {
    const candidate = process.argv[flag + 1];
    if (!CANDIDATES.includes(candidate)) throw new Error(`--install needs one of: ${CANDIDATES.join(', ')}`);
    console.log('installed', candidate, '→', install(candidate).join(', '));
  }
}
