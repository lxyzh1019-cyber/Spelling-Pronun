import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateContent } from '../src/learning/contentValidator.js';

const data = JSON.parse(await readFile(new URL('../src/data/skills.json', import.meta.url), 'utf8'));

// The count is pinned so a skill cannot be added without someone deciding it belongs. `vocabulary`
// and `reading` joined on 2026-09-18, when the Alberta mapping showed that Vocabulary (26 outcomes)
// and Comprehension (39) were the two largest things the app did not measure at all.
test('curriculum inventory contains exactly 50 unique skills across nine tracks', () => {
  assert.equal(data.skills.length, 50);
  assert.equal(new Set(data.skills.map(({ id }) => id)).size, 50);
  assert.deepEqual(
    [...new Set(data.skills.map(({ track }) => track))].sort(),
    ['editing', 'grammar', 'phonics', 'pronunciation', 'punctuation', 'reading', 'sentences', 'spelling', 'vocabulary'],
  );
  // A track with no skills in it is a track someone meant to fill and did not.
  for (const track of new Set(data.skills.map(({ track: name }) => name))) {
    assert.ok(data.skills.some((skill) => skill.track === track), `${track} has no skills`);
  }
  assert.equal(validateContent({ skills: data.skills }).valid, true);
});
