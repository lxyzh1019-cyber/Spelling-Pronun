import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { C0_ASSESSMENT_NOTICE } from '../src/data/assessment.c0.draft.js';

test('assessment routes use the truthful partial-integration notice', async () => {
  const page = await readFile(new URL('../src/pages/AssessmentPage.jsx', import.meta.url), 'utf8');
  const runner = await readFile(new URL('../src/pages/AssessmentRunner.jsx', import.meta.url), 'utf8');
  assert.match(C0_ASSESSMENT_NOTICE, /28 Part-B prompts/);
  assert.match(C0_ASSESSMENT_NOTICE, /40 Part-A prompts remain blocked/);
  assert.match(C0_ASSESSMENT_NOTICE, /No result can affect placement or mastery/);
  assert.doesNotMatch(page, /PILOT_FIXTURE_NOTICE/);
  assert.doesNotMatch(runner, /PILOT_FIXTURE_NOTICE/);
});
