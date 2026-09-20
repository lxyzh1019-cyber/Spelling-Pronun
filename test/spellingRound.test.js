// One round of the spelling test. Both input modes run through the same entry, so these tests are
// what stops the tile path and the keyboard path drifting into two different games.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerFrom, backspace, checkAnswer, clearEntry, createEntry, distractorCount, feedbackCopy,
  hintLabel, hintText, isComplete, makeResult, makeTileBank, placeTile, removeSlot, resultBadge,
  resultNote, resultsSummary, retryQueue, slotStates, spentTileIds, typeLetter, undoLast,
} from '../src/learning/spellingRound.js';

const BICYCLE = { id: 'g5-bicycle', word: 'bicycle', definition: 'Two wheels', hint: 'Sounds like by-sick-le' };
const EMBARRASS = { id: 'g5-embarrass', word: 'embarrass', definition: 'Awkward', hint: 'Double r, double s' };
// A deterministic "shuffle" so a bank can be asserted on. Returning 0 every time leaves the order alone
// in a Fisher-Yates pass, which is also the worst case for a shuffle that must not lose a letter.
const steady = () => 0;

test('a tile bank holds the word and only letters the word does not use', () => {
  const bank = makeTileBank(BICYCLE.word, steady);
  assert.equal(bank.length, BICYCLE.word.length + 3, 'a short word gets three distractors');
  assert.deepEqual(
    bank.filter((tile) => !tile.distractor).map((tile) => tile.letter).sort(),
    [...BICYCLE.word].sort(),
    'every letter of the word is on the table',
  );
  for (const tile of bank.filter((tile) => tile.distractor)) {
    assert.ok(!BICYCLE.word.includes(tile.letter), `${tile.letter} is in the word, so it is not a distractor`);
  }
  assert.equal(distractorCount(EMBARRASS.word), 2, 'a long word gets fewer distractors so the row still fits');
  assert.equal(makeTileBank(EMBARRASS.word, steady).length, EMBARRASS.word.length + 2);
  assert.deepEqual(makeTileBank(BICYCLE.word, steady), makeTileBank(BICYCLE.word, steady), 'the same rng gives the same bank');
});

test('a capital letter is kept on the tile and ignored when the answer is checked', () => {
  const february = { id: 'g5-february', word: 'February', hint: 'Two r sounds' };
  const bank = makeTileBank(february.word, steady);
  assert.ok(bank.some((tile) => tile.letter === 'F'), 'the capital survives onto its tile');
  for (const tile of bank.filter((tile) => tile.distractor)) {
    assert.ok(!february.word.toLowerCase().includes(tile.letter), 'a distractor is compared in lower case');
  }
  assert.equal(checkAnswer(february, 'february').correct, true);
  assert.equal(checkAnswer(february, ' February ').correct, true, 'stray spaces are not a spelling mistake');
  assert.equal(checkAnswer(february, 'febuary').correct, false);
});

test('tiles fill the next empty slot, come back when tapped, and cannot be spent twice', () => {
  let entry = createEntry(BICYCLE, { rng: steady });
  const first = entry.bank[0];
  entry = placeTile(entry, first.id);
  assert.equal(entry.slots[0].letter, first.letter);
  assert.deepEqual([...spentTileIds(entry)], [first.id]);
  assert.equal(placeTile(entry, first.id).slots.filter(Boolean).length, 1, 'a spent tile does nothing');
  assert.equal(placeTile(entry, 'nope'), entry, 'an unknown tile does nothing');
  entry = removeSlot(entry, 0);
  assert.equal(entry.slots[0], null);
  assert.equal(spentTileIds(entry).size, 0, 'removing a letter frees its tile');
  assert.equal(removeSlot(entry, 0), entry, 'removing an empty slot does nothing');
  let full = createEntry(BICYCLE, { rng: steady });
  for (const tile of full.bank) full = placeTile(full, tile.id);
  assert.equal(isComplete(full), true);
  assert.equal(full.slots.filter(Boolean).length, BICYCLE.word.length, 'the row never takes more than the word');
});

test('typing fills the same slots, and only letters count', () => {
  let entry = createEntry(BICYCLE, { inputMode: 'keyboard' });
  assert.deepEqual(entry.bank, [], 'the keyboard needs no tiles');
  entry = typeLetter(entry, 'b');
  entry = typeLetter(entry, 'i');
  assert.equal(answerFrom(entry), 'bi');
  assert.equal(typeLetter(entry, '4'), entry, 'a digit is not a spelling');
  assert.equal(typeLetter(entry, 'Enter'), entry);
  entry = backspace(entry);
  assert.equal(answerFrom(entry), 'b');
  const emptied = backspace(backspace(entry));
  assert.equal(answerFrom(emptied), '');
  assert.equal(backspace(emptied), emptied, 'backspace on an empty row does nothing');
});

test('undo steps back one placement and clear empties the row', () => {
  let entry = createEntry(BICYCLE, { rng: steady });
  entry = placeTile(entry, entry.bank[0].id);
  entry = placeTile(entry, entry.bank[1].id);
  const two = answerFrom(entry);
  entry = undoLast(entry);
  assert.equal(answerFrom(entry).length, two.length - 1);
  const cleared = clearEntry(entry);
  assert.equal(answerFrom(cleared), '');
  assert.equal(spentTileIds(cleared).size, 0, 'clearing hands every tile back');
  assert.equal(clearEntry(cleared), cleared, 'clearing an empty row does nothing');
  const fresh = createEntry(BICYCLE, { rng: steady });
  assert.equal(undoLast(fresh), fresh, 'undo with nothing to undo does nothing');
});

test('slot states read the row before a check, and letter by letter after a wrong one', () => {
  let entry = createEntry(BICYCLE, { inputMode: 'keyboard' });
  assert.deepEqual(slotStates(BICYCLE, entry), ['next', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
  for (const letter of 'bic') entry = typeLetter(entry, letter);
  assert.deepEqual(slotStates(BICYCLE, entry), ['filled', 'filled', 'filled', 'next', 'empty', 'empty', 'empty']);
  let wrong = createEntry(BICYCLE, { inputMode: 'keyboard' });
  for (const letter of 'bycicle') wrong = typeLetter(wrong, letter);
  assert.deepEqual(
    slotStates(BICYCLE, wrong, 'incorrect'),
    ['kept', 'wrong', 'kept', 'wrong', 'kept', 'kept', 'kept'],
    'a letter in the right place inside a wrong spelling stays dark, never green',
  );
  assert.deepEqual(slotStates(BICYCLE, wrong, 'correct'), new Array(7).fill('right'));
  // Green is reserved for a word that was spelled right. Nothing inside a wrong answer earns it.
  assert.ok(!slotStates(BICYCLE, wrong, 'incorrect').includes('right'), 'a wrong answer showed a green letter');
});

test('the feedback names the word, and says when a hint was used', () => {
  assert.deepEqual(feedbackCopy(BICYCLE, true, false), { tone: 'green', title: 'Yes!', body: 'bicycle — spelled right first try.' });
  assert.match(feedbackCopy(BICYCLE, true, true).body, /used a hint/);
  assert.doesNotMatch(feedbackCopy(BICYCLE, true, true).body, /first try/, 'a helped answer is never called a first try');
  assert.equal(feedbackCopy(BICYCLE, false).body, 'It’s bicycle. Sounds like by-sick-le.');
  assert.equal(feedbackCopy({ word: 'plain' }, false).body, 'It’s plain.', 'a word with no hint still gets a sentence');
});

test('a round is summarised without ever calling the child anything', () => {
  const results = [
    makeResult({ word: BICYCLE, outcome: 'correct', attempt: 'bicycle' }),
    makeResult({ word: EMBARRASS, outcome: 'incorrect', attempt: 'embarass' }),
  ];
  assert.deepEqual(resultsSummary([]), { total: 0, correct: 0, missed: 0, skipped: 0, pct: 0, title: 'Round done', dot: 'idle' });
  const half = resultsSummary(results);
  assert.deepEqual([half.total, half.correct, half.missed, half.pct, half.title, half.dot], [2, 1, 1, 50, 'Round done', 'idle']);
  const seven = resultsSummary([...new Array(7)].map(() => makeResult({ word: BICYCLE, outcome: 'correct' }))
    .concat([...new Array(3)].map(() => makeResult({ word: EMBARRASS, outcome: 'incorrect' }))));
  assert.deepEqual([seven.pct, seven.title, seven.dot], [70, 'Good round', 'happy']);
  const all = resultsSummary([...new Array(10)].map(() => makeResult({ word: BICYCLE, outcome: 'correct' })));
  assert.deepEqual([all.pct, all.title], [100, 'Every one right!']);
  const skipped = resultsSummary([makeResult({ word: BICYCLE, outcome: 'skipped' })]);
  assert.equal(skipped.skipped, 1, 'a skip is a real outcome, not a rounding error');
});

test('each result says what happened in words a child can read', () => {
  assert.equal(resultNote(makeResult({ word: BICYCLE, outcome: 'correct' })), 'Right, on your own');
  assert.equal(resultNote(makeResult({ word: BICYCLE, outcome: 'correct', assisted: true })), 'Right — with a hint');
  assert.equal(resultNote(makeResult({ word: BICYCLE, outcome: 'incorrect', attempt: 'bycicle' })), 'You wrote "bycicle"');
  assert.equal(resultNote(makeResult({ word: BICYCLE, outcome: 'skipped' })), 'Skipped — not tried yet');
  assert.deepEqual(
    ['correct', 'incorrect', 'skipped'].map((outcome) => resultBadge(makeResult({ word: BICYCLE, outcome }))),
    ['✓', '✗', '↷'],
  );
});

test('a retry round holds the missed and the skipped, in the order they were asked', () => {
  const words = [BICYCLE, EMBARRASS, { id: 'g5-ancient', word: 'ancient', hint: 'ci not ti' }];
  const results = [
    makeResult({ word: words[0], outcome: 'incorrect', attempt: 'bycicle' }),
    makeResult({ word: words[1], outcome: 'correct' }),
    makeResult({ word: words[2], outcome: 'skipped' }),
  ];
  const queue = retryQueue(results, words);
  assert.deepEqual(queue.words.map((word) => word.id), ['g5-bicycle', 'g5-ancient']);
  assert.equal(queue.label, 'Try those 2 again');
  const perfect = retryQueue(words.map((word) => makeResult({ word, outcome: 'correct' })), words);
  assert.deepEqual(perfect.words.map((word) => word.id), words.map((word) => word.id), 'a clean round can still go again');
  assert.equal(perfect.label, 'Go again');
});

test('the hint button says what is left, and the hint never spells the word', () => {
  assert.equal(hintLabel(0, false), 'Ask Dot (3 left)');
  assert.equal(hintLabel(2, false), 'Ask Dot (1 left)');
  assert.equal(hintLabel(3, false), 'No hints left today');
  assert.equal(hintLabel(9, false), 'No hints left today', 'the count never goes negative');
  assert.equal(hintLabel(1, true), 'Hint showing');
  assert.equal(hintText(BICYCLE), 'Hint: Sounds like by-sick-le · 7 letters');
  assert.ok(!hintText(BICYCLE).includes('bicycle'), 'the hint is not the answer');
  assert.equal(hintText({ word: 'plain' }), 'Hint: 5 letters');
});
