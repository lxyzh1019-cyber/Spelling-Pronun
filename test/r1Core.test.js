import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_SCORE,
  applyAttempts,
  createAttempt,
  dailyChallengeComplete,
  edmontonDayKey,
  isPerfectScore,
  nextScore,
  restoreSessionSnapshot,
} from '../src/learning/r1Core.js';
import { generateCrossword, validateCrossword } from '../src/learning/crossword.js';

test('a skipped final word can never produce a perfect score', () => {
  const before = { correct: 4, incorrect: 0, skipped: 0 };
  const final = nextScore(before, 'skipped');
  assert.deepEqual(final, { correct: 4, incorrect: 0, skipped: 1 });
  assert.equal(isPerfectScore(final), false);
});

test('fresh session score is isolated from a completed score', () => {
  const completed = { correct: 5, incorrect: 0, skipped: 0 };
  assert.notDeepEqual(completed, EMPTY_SCORE);
  assert.deepEqual({ ...EMPTY_SCORE }, { correct: 0, incorrect: 0, skipped: 0 });
});

test('daily challenge depends on current challenge attempts, not lifetime success', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  assert.equal(dailyChallengeComplete(ids, { a: true, b: true, c: true, d: true }), false);
  assert.equal(dailyChallengeComplete(ids, Object.fromEntries(ids.map((id) => [id, true]))), true);
});

test('batched attempts preserve every distinct crossword result', () => {
  const attempts = ['a', 'b', 'c', 'd', 'e'].map((wordId, index) => createAttempt({
    attemptId: `attempt-${index}`,
    wordId,
    learnerId: 'jenn',
    correct: index % 2 === 0,
    evidenceType: 'crossword_practice',
  }));
  const progress = applyAttempts({}, attempts, new Date('2026-09-05T12:00:00Z'));
  assert.equal(Object.keys(progress).length, 5);
  assert.equal(Object.values(progress).reduce((sum, entry) => sum + entry.attempts, 0), 5);
});

test('self-report evidence remains explicitly labelled', () => {
  const attempt = createAttempt({ attemptId: 'self-1', wordId: 'word', learnerId: 'jess', correct: true, evidenceType: 'self_report' });
  assert.equal(attempt.evidenceType, 'self_report');
});

test('session restore rejects a different learner', () => {
  const words = [{ id: 'a' }, { id: 'b' }];
  const snapshot = { version: 1, learnerId: 'jenn', mode: 'practice', category: 'Grade 5', wordIds: ['a', 'b'], index: 1, score: { correct: 1, incorrect: 0, skipped: 0 } };
  assert.equal(restoreSessionSnapshot(snapshot, { learnerId: 'jess', mode: 'practice', category: 'Grade 5', words }), null);
  assert.equal(restoreSessionSnapshot(snapshot, { learnerId: 'jenn', mode: 'practice', category: 'Grade 5', words }).index, 1);
});

test('Edmonton day key follows the configured family timezone across midnight', () => {
  assert.equal(edmontonDayKey(new Date('2026-03-08T06:59:59Z')), '2026-03-07');
  assert.equal(edmontonDayKey(new Date('2026-03-08T07:00:00Z')), '2026-03-08');
});

test('crossword generator never truncates a long supported word', () => {
  const words = [
    { id: 'a', word: 'acknowledgement', definition: 'recognition' },
    { id: 'b', word: 'knowledge', definition: 'understanding' },
    { id: 'c', word: 'edge', definition: 'border' },
    { id: 'd', word: 'gentle', definition: 'soft' },
    { id: 'e', word: 'mental', definition: 'of the mind' },
  ];
  const puzzle = generateCrossword(words);
  assert.ok(puzzle.size >= 'acknowledgement'.length);
  assert.equal(validateCrossword(puzzle), true);
  const long = puzzle.entries.find(({ word }) => word === 'acknowledgement');
  assert.ok(long);
  assert.equal(long.word.length, 15);
});
