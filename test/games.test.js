import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_WRONG, applyGuess, createHangmanState, isRevealed } from '../src/learning/hangman.js';
import { scrambleWord, scrambleAttemptsLeft } from '../src/learning/wordScramble.js';
import { accuracyPercent, aggregateProgressByProfile, medalFor, rankLeaderboard } from '../src/learning/leaderboard.js';

test('a hangman guess is ignored when it repeats or the game is over', () => {
  const started = applyGuess(createHangmanState(), 'c', 'cat').state;
  const repeat = applyGuess(started, 'c', 'cat');
  assert.equal(repeat.changed, false);
  assert.equal(repeat.outcome, null);
  assert.deepEqual(repeat.state.guessed, ['c'], 'a repeated guess costs nothing');
  const finished = applyGuess({ ...started, gameOver: true }, 'z', 'cat');
  assert.equal(finished.changed, false, 'no guess counts after the game ends');
});

test('a wrong guess only ends the game on the seventh', () => {
  let state = createHangmanState();
  const wrong = 'zyxwvus'.split('');  // none of these appear in cat
  for (let index = 0; index < MAX_WRONG - 1; index++) {
    const result = applyGuess(state, wrong[index], 'cat');
    state = result.state;
    assert.equal(result.outcome, 'wrong');
    assert.equal(state.gameOver, false, `guess ${index + 1} of ${MAX_WRONG} does not end it`);
  }
  const final = applyGuess(state, wrong[MAX_WRONG - 1], 'cat');
  assert.equal(final.outcome, 'lost');
  assert.equal(final.state.wrongGuesses, MAX_WRONG);
  assert.equal(final.state.gameOver, true);
  assert.equal(final.state.won, false);
});

test('the game is won only when every distinct letter is guessed', () => {
  let state = createHangmanState();
  for (const letter of ['l', 'e', 't', 't']) state = applyGuess(state, letter, 'letter').state;
  assert.equal(state.won, false, 'letter still needs its r');
  const win = applyGuess(state, 'r', 'letter');
  assert.equal(win.outcome, 'won');
  assert.equal(win.state.won, true);
  assert.equal(win.state.gameOver, true);
  assert.equal(win.state.wrongGuesses, 0, 'a win never records a wrong guess');
  assert.equal(isRevealed('letter', ['l', 'e', 't', 'r']), true);
});

test('a scramble never hands back the original spelling', () => {
  // A shuffle that refuses to shuffle is the worst case the rule exists for.
  const identity = (letters) => [...letters];
  assert.equal(scrambleWord('cat', identity).join(''), 'act');
  assert.equal(scrambleWord('planned', identity).join(''), 'lpanned');
  // Two letters cannot be scrambled into anything but themselves reversed, so the rule leaves them.
  assert.equal(scrambleWord('at', identity).join(''), 'at');
  // A genuine shuffle is passed through untouched.
  assert.equal(scrambleWord('cat', () => ['t', 'a', 'c']).join(''), 'tac');
  assert.equal(scrambleAttemptsLeft(1), 2);
  assert.equal(scrambleAttemptsLeft(5), 0, 'attempts never go negative');
});

test('the leaderboard ranks every profile and survives a row with no owner', () => {
  const rows = [
    { profileId: 'jenn', correct: 3, attempts: 4 },
    { profileId: 'jenn', correct: 2, attempts: 2 },
    { profileId: 'jess', correct: 9, attempts: 10 },
    { correct: 99, attempts: 99 },
  ];
  assert.deepEqual(aggregateProgressByProfile(rows), {
    jenn: { correct: 5, totalAttempts: 6 },
    jess: { correct: 9, totalAttempts: 10 },
  });
  const board = rankLeaderboard(rows, [{ id: 'jenn', name: 'Jenn' }, { id: 'jess', name: 'Jess' }, { id: 'sam', name: 'Sam' }]);
  assert.deepEqual(board.map(({ name, correct }) => [name, correct]), [['Jess', 9], ['Jenn', 5], ['Sam', 0]]);
  assert.equal(board.length, 3, 'a learner who has not played still appears');
  assert.equal(accuracyPercent(5, 6), 83);
  assert.equal(accuracyPercent(0, 0), 0, 'no division by zero');
  assert.deepEqual([medalFor(0), medalFor(2), medalFor(3)], ['🥇', '🥉', '·']);
});
