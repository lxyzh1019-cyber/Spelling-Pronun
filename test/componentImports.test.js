// source guard: this test does not execute any component. It reads the .jsx
// files as text and checks that a helper they call is actually imported.
//
// It exists because of DEF-30: extracting `withIds` and `slug` out of
// WordProvider removed their definitions and did not add the import, and the
// app failed to render at all. `npm run build` does not catch a free identifier
// — a bundler treats an unknown name as a global — and no test renders a
// provider, so the whole app was broken with 192 tests passing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..', 'src');

function filesUnder(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, extension);
    return entry.name.endsWith(extension) ? [full] : [];
  });
}

// The pure modules a component is expected to call rather than redefine.
const helperDirs = ['learning', 'persistence', 'utils'].map((name) => path.join(root, name));

async function exportedNames() {
  const names = new Map();
  for (const dir of helperDirs) {
    for (const file of filesUnder(dir, '.js')) {
      const module = await import(`file://${file}`);
      Object.keys(module).forEach((name) => {
        if (name !== 'default') names.set(name, path.relative(root, file));
      });
    }
  }
  return names;
}

// Names the file brings in or defines itself; anything else it calls is free.
function namesAvailableIn(source) {
  const available = new Set();
  for (const match of source.matchAll(/import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/g)) {
    match[1].replace(/[{}]/g, ' ').split(',').forEach((part) => {
      const name = part.trim().split(/\s+as\s+/).pop().replace('*', '').trim();
      if (name) available.add(name);
    });
  }
  for (const match of source.matchAll(/(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    available.add(match[1]);
  }
  // Destructured declarations, such as the setter from a useState pair.
  for (const match of source.matchAll(/(?:const|let|var)\s*([[{][^=]*?[\]}])\s*=/g)) {
    (match[1].match(/[A-Za-z_$][\w$]*/g) || []).forEach((name) => available.add(name));
  }
  return available;
}

test('source guard: every shared helper a component calls is imported by it', async () => {
  const helpers = await exportedNames();
  const problems = [];
  for (const file of filesUnder(root, '.jsx')) {
    const source = readFileSync(file, 'utf8');
    const available = namesAvailableIn(source);
    for (const [name, home] of helpers) {
      if (available.has(name)) continue;
      // Only call sites, so a word appearing in prose or a property name is not a false alarm.
      if (new RegExp(`(^|[^\\w$.'"\`])${name}\\s*\\(`).test(source)) {
        problems.push(`${path.relative(root, file)} calls ${name}() but never imports it (it lives in ${home})`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
