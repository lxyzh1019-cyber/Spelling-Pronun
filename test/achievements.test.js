import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, achievementRecord, checkAchievements, mergeAchievements } from '../src/utils/achievements.js';
import { dailyChallengeComplete } from '../src/learning/r1Core.js';

test('stat-based awards are idempotent against the existing record', () => {
  const stats = { totalCorrect: 12, bestStreak: 5 };
  const first = checkAchievements(stats, []);
  assert.deepEqual(first.map(({ id }) => id).sort(), ['first_correct', 'five_streak', 'ten_correct']);
  assert.ok(first.every((record) => typeof record.unlockedAt === 'string'), 'records serialize for local storage');
  assert.deepEqual(checkAchievements(stats, first), [], 'a second check with the same record awards nothing');
});

test('merging awards by ID never duplicates or re-dates a badge', () => {
  const existing = [{ id: 'first_correct', unlockedAt: '2026-09-01T00:00:00.000Z' }];
  const incoming = [{ id: 'first_correct', unlockedAt: '2026-09-08T00:00:00.000Z' }, { id: 'ten_correct', unlockedAt: '2026-09-08T00:00:00.000Z' }];
  const merged = mergeAchievements(existing, incoming);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(({ id }) => id === 'first_correct').unlockedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(mergeAchievements(merged, merged).length, 2);
});

test('daily champion is a defined badge awarded only when every challenge word is attempted', () => {
  assert.ok(ACHIEVEMENTS.daily_champion);
  assert.equal(achievementRecord('daily_champion').name, ACHIEVEMENTS.daily_champion.name);
  assert.equal(achievementRecord('not_a_badge'), null);
  const words = ['a', 'b', 'c', 'd', 'e'];
  assert.equal(dailyChallengeComplete(words, { a: {}, b: {}, c: {}, d: {} }), false);
  assert.equal(dailyChallengeComplete(words, { a: {}, b: {}, c: {}, d: {}, e: {} }), true);
});
