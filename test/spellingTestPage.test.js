// Source and copy guards for the spelling test. They do not run the page; they hold two things the
// page must not lose: the iPad layout rule that rules out a text input, and wording that only
// describes what the app actually does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (name) => readFile(new URL(`../src/pages/${name}`, import.meta.url), 'utf8');

test('source guard: the spelling test answers with slots, never a text box, and builds the round from the pure module', async () => {
  const page = await read('SpellingTest.jsx');
  // An <input> summons the iOS keyboard, which resizes the viewport and destroys the landscape
  // layout. The in-app keyboard exists for exactly this reason, so a text box would undo it.
  assert.doesNotMatch(page, /<input/, 'the answer is typed into a text box again');
  assert.match(page, /from '\.\.\/learning\/spellingRound'/);
  assert.match(page, /from '\.\.\/components\/Dot'/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Incorrect\. The correct spelling is/);
  assert.match(page, /<MultiplayerWrapper>/);
  assert.match(page, /to="\/"/);
});

test('source guard: a retry round never re-records the daily challenge answer', async () => {
  const page = await read('SpellingTest.jsx');
  assert.match(
    page,
    /mode === 'daily' && round\?\.kind !== 'retry'/,
    'a retry after the daily challenge would overwrite the answer the child first gave it',
  );
});

test('copy guard: nothing claims a skipped word was saved unless the learner saved it', async () => {
  const page = await read('SpellingTest.jsx');
  const home = await read('Home.jsx');
  for (const [name, source] of [['SpellingTest.jsx', page], ['Home.jsx', home]]) {
    assert.doesNotMatch(source, /saved for later practice/i, `${name} claims skips are saved, and nothing saves them`);
  }
  assert.match(page, /Save for later/, 'saving for later is the learner’s own choice, so the control must exist');
  assert.match(page, /Spell again/);
});

test('copy guard: the greeting counts what the record holds and invents no daily streak', async () => {
  const home = await read('Home.jsx');
  // The app tracks a same-word streak and has never tracked days in a row. "4 days in a row" is in
  // the design mock; putting it on the page would be a number nothing can produce.
  assert.doesNotMatch(home, /days in a row/i, 'Home claims a daily streak the app does not record');
  assert.match(home, /words practised so far/, 'the greeting should say something the record can back');
  assert.match(home, /Best Same-Word Streak/, 'the streak the app does record keeps its honest name');
});

test('source guard: a word kept for later is only released when it is spelled unaided', async () => {
  const page = await read('SpellingTest.jsx');
  assert.match(page, /usingSaved && correct && !showHintContent/, 'a helped answer would clear a word off the practice list');
  assert.match(page, /removeSpellAgain\(/);
});
