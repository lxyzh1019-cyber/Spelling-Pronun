// The words a child chose to keep. It replaces a claim the app used to make and could not back:
// "Skips are saved for later practice", with nothing saving them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELL_AGAIN_CAP, addSpellAgain, removeSpellAgain, spellAgainWords } from '../src/persistence/spellAgain.js';

const word = (id) => ({ id, word: id.replace('w-', ''), definition: `${id} means something`, hint: `${id} hint` });

test('saving the same word twice keeps one copy, at the end', () => {
  const first = addSpellAgain([], [word('w-bicycle'), word('w-ancient')], { savedAt: '2026-09-20' });
  assert.deepEqual(first.map((entry) => entry.id), ['w-bicycle', 'w-ancient']);
  const again = addSpellAgain(first, [word('w-bicycle')], { savedAt: '2026-09-21' });
  assert.deepEqual(again.map((entry) => entry.id), ['w-ancient', 'w-bicycle'], 'the word moves rather than doubling');
  assert.equal(again.at(-1).savedAt, '2026-09-21', 'the latest save is the one kept');
  assert.equal(addSpellAgain([], [{ word: 'no id' }]).length, 0, 'a word with no id is not storable');
});

test('the list is capped, and the oldest words fall off it', () => {
  const many = [...new Array(SPELL_AGAIN_CAP + 5)].map((_, index) => word(`w-${index}`));
  const list = addSpellAgain([], many);
  assert.equal(list.length, SPELL_AGAIN_CAP);
  assert.equal(list[0].id, 'w-5', 'the first five saved are the five dropped');
  assert.equal(list.at(-1).id, `w-${SPELL_AGAIN_CAP + 4}`);
});

test('a word is removed once it is spelled, and the list reads back as words', () => {
  const list = addSpellAgain([], [word('w-a'), word('w-b'), word('w-c')]);
  assert.deepEqual(removeSpellAgain(list, ['w-b']).map((entry) => entry.id), ['w-a', 'w-c']);
  assert.deepEqual(removeSpellAgain(list, []).map((entry) => entry.id), ['w-a', 'w-b', 'w-c']);
  assert.deepEqual(spellAgainWords(list)[0], { id: 'w-a', word: 'a', definition: 'w-a means something', hint: 'w-a hint' });
  assert.equal(spellAgainWords(null).length, 0, 'unreadable storage is an empty list, not a crash');
  assert.equal(spellAgainWords([{ id: 'broken' }]).length, 0, 'a half-written entry is skipped');
});
