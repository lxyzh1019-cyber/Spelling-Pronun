import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateContent } from '../src/learning/contentValidator.js';

const data = JSON.parse(await readFile(new URL('../src/data/skills.json', import.meta.url), 'utf8'));

test('curriculum inventory contains exactly 42 unique skills across seven tracks', () => {
  assert.equal(data.skills.length, 42);
  assert.equal(new Set(data.skills.map(({ id }) => id)).size, 42);
  assert.deepEqual([...new Set(data.skills.map(({ track }) => track))].sort(), ['editing', 'grammar', 'phonics', 'pronunciation', 'punctuation', 'sentences', 'spelling']);
  assert.equal(validateContent({ skills: data.skills }).valid, true);
});
