import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

test('legacy progress collection remains available under owner checks', () => {
  assert.match(rules, /match \/spelling-progress\/\{document=\*\*\}/);
  assert.match(rules, /request\.auth\.uid == resource\.data\.userId/);
});

test('attempt events are additive and immutable', () => {
  const attemptBlock = rules.match(/match \/spelling-attempts\/\{document\} \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(attemptBlock);
  assert.match(attemptBlock, /allow create:/);
  assert.match(attemptBlock, /allow get:.*document\.matches\(request\.auth\.uid \+ '_\.\*'\)/s);
  assert.match(attemptBlock, /allow list:.*resource\.data\.userId/s);
  assert.match(attemptBlock, /allow update, delete: if false/);
});
