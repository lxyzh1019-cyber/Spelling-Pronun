// Some tests in this file are SOURCE GUARDS or COPY GUARDS: they read a source file as text and
// assert on its wording or structure. They do NOT execute the component, so they cannot prove it
// behaves correctly. They exist to protect truthful learner-facing wording and to stop a known
// defect being reintroduced. Behaviour lives in the pure modules under src/learning and is tested
// by executing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEED_MODES, buildSpeedRoundList, evidenceTypeForMode, recordSpeedOutcome } from '../src/learning/speedRound.js';
import { readFile } from 'node:fs/promises';

test('the untimed option is labelled as practice and recorded as untimed practice, not timed retrieval', () => {
  assert.equal(SPEED_MODES.practice.timeLimit, 0);
  assert.match(SPEED_MODES.practice.label, /Practice/);
  assert.match(SPEED_MODES.practice.label, /untimed/);
  assert.equal(evidenceTypeForMode('practice'), 'untimed_practice');
  assert.equal(evidenceTypeForMode('quick'), 'timed_retrieval_practice');
});

test('a round never repeats a word when the pool is smaller than the requested count', () => {
  const pool = Array.from({ length: 7 }, (_, index) => ({ id: `w${index}`, word: `word${index}` }));
  const list = buildSpeedRoundList(pool, 200);
  assert.equal(list.length, 7);
  assert.equal(new Set(list.map(({ id }) => id)).size, 7);
  assert.equal(buildSpeedRoundList(pool, 3).length, 3);
});

test('misses and passes are kept with what was typed so the round can be reviewed', () => {
  let misses = recordSpeedOutcome([], { id: 'w1', word: 'accident', definition: 'an unplanned event' }, { typed: ' acident ' });
  misses = recordSpeedOutcome(misses, { id: 'w2', word: 'careful', definition: 'taking care' }, { passed: true });
  assert.deepEqual(misses, [
    { wordId: 'w1', word: 'accident', definition: 'an unplanned event', typed: 'acident', passed: false },
    { wordId: 'w2', word: 'careful', definition: 'taking care', typed: '', passed: true },
  ]);
});

test('source guard: the speed round page guards double submission and lists misses on the finish screen', async () => {
  const source = await readFile(new URL('../src/pages/SpeedRound.jsx', import.meta.url), 'utf8');
  assert.match(source, /advancingRef\.current\) return;/);
  assert.match(source, /Words to review/);
  assert.doesNotMatch(source, /pool\[i % pool\.length\]/);
});
