import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveWordRow, deriveWordRows, orderedWordAttempts, planProgressWrites } from '../src/learning/progressAggregate.js';

const attempt = (id, correct, clientTime, wordId = 'w1') => ({ attemptId: id, wordId, correct, clientTime, learnerId: 'jenn', evidenceType: 'independent_spelling' });

test('a device with fewer attempts can never lower a total another device recorded', () => {
  // The cloud row was built from ten attempts; this device can only see three of them.
  const existing = { attempts: 10, correct: 7, streak: 2, bestStreak: 4 };
  const visible = [attempt('a1', true, '2026-09-01T10:00:00Z'), attempt('a2', false, '2026-09-01T10:01:00Z'), attempt('a3', true, '2026-09-01T10:02:00Z')];
  const { derived, heldBack } = deriveWordRow(existing, visible, 'w1');
  assert.equal(heldBack, true, 'the write is held back rather than overwriting 10 with 3');
  assert.equal(derived.attempts, 3, 'the derivation itself is honest about what this device can see');

  const { rows, heldBack: blocked } = deriveWordRows({ existingRows: { w1: existing }, attempts: visible, wordIds: ['w1'] });
  assert.deepEqual(rows, {}, 'nothing is written for a held-back word');
  assert.deepEqual(blocked, ['w1']);
});

test('totals are derived from the whole attempt record and a repeated flush is identical', () => {
  const attempts = [attempt('a1', true, '2026-09-01T10:00:00Z'), attempt('a2', true, '2026-09-01T10:01:00Z'), attempt('a3', false, '2026-09-01T10:02:00Z')];
  const first = deriveWordRow({}, attempts, 'w1').derived;
  assert.equal(first.attempts, 3);
  assert.equal(first.correct, 2);
  assert.equal(first.streak, 0, 'the last answer was wrong');
  assert.equal(first.bestStreak, 2);
  assert.equal(first.derivedFromAttempts, 3);

  // Re-running against the row it just produced yields the same numbers: the write is idempotent.
  const second = deriveWordRow(first, attempts, 'w1').derived;
  assert.equal(second.attempts, 3);
  assert.equal(second.correct, 2);
  // A duplicate copy of an attempt (re-read or replayed) is deduplicated by ID.
  const withDuplicate = deriveWordRow({}, [...attempts, attempt('a1', true, '2026-09-01T10:00:00Z')], 'w1').derived;
  assert.equal(withDuplicate.attempts, 3, 'a repeated attempt ID is counted once');
});

test('legacy imported counts are kept as a base and attempts are added on top', () => {
  const legacy = { attempts: 12, correct: 9, streak: 3, importedFromLocal: true };
  const { derived, heldBack } = deriveWordRow(legacy, [attempt('a1', true, '2026-09-02T10:00:00Z'), attempt('a2', true, '2026-09-02T10:01:00Z')], 'w1');
  assert.equal(heldBack, false);
  assert.equal(derived.attempts, 14, 'imported practice is preserved, not replaced');
  assert.equal(derived.correct, 11);
  assert.equal(derived.baseAttempts, 12);
  // Re-deriving uses the recorded base rather than double-counting the previous total.
  assert.equal(deriveWordRow(derived, [attempt('a1', true, '2026-09-02T10:00:00Z'), attempt('a2', true, '2026-09-02T10:01:00Z')], 'w1').derived.attempts, 14);
  // A row the app wrote itself has one attempt per increment, so it carries no base.
  assert.equal(deriveWordRow({ attempts: 2, correct: 2 }, [attempt('a1', true, '2026-09-02T10:00:00Z'), attempt('a2', true, '2026-09-02T10:01:00Z')], 'w1').derived.baseAttempts, 0);
});

test('best streak never decreases and attempts are ordered by client time', () => {
  const out = orderedWordAttempts([attempt('b', false, '2026-09-01T10:05:00Z'), attempt('a', true, '2026-09-01T10:00:00Z')], 'w1');
  assert.deepEqual(out.map(({ attemptId }) => attemptId), ['a', 'b']);
  const derived = deriveWordRow({ bestStreak: 6 }, [attempt('a1', true, '2026-09-01T10:00:00Z')], 'w1').derived;
  assert.equal(derived.bestStreak, 6, 'a historical maximum survives a shorter derived streak');
});

test('progress writes are fully derived merges, never increments', () => {
  const writes = planProgressWrites('u1', 'jenn', { w1: { attempts: 3, correct: 2 } });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, 'u1_jenn_w1');
  assert.equal(writes[0].mode, 'merge');
  assert.deepEqual(writes[0].data, { userId: 'u1', profileId: 'jenn', wordId: 'w1', attempts: 3, correct: 2 });
});
