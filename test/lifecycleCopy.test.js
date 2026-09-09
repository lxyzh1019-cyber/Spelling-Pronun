// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { C0_ASSESSMENT_NOTICE } from '../src/data/assessment.c0.draft.js';

test('copy guard: assessment routes use the truthful partial-integration notice', async () => {
  const page = await readFile(new URL('../src/pages/AssessmentPage.jsx', import.meta.url), 'utf8');
  const runner = await readFile(new URL('../src/pages/AssessmentRunner.jsx', import.meta.url), 'utf8');
  assert.match(C0_ASSESSMENT_NOTICE, /28 Part-B prompts/);
  assert.match(C0_ASSESSMENT_NOTICE, /40 Part-A prompts remain blocked/);
  assert.match(C0_ASSESSMENT_NOTICE, /No result can affect placement or mastery/);
  assert.doesNotMatch(page, /PILOT_FIXTURE_NOTICE/);
  assert.doesNotMatch(runner, /PILOT_FIXTURE_NOTICE/);
});
