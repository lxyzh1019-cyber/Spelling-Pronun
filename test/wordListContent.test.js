import test from 'node:test';
import assert from 'node:assert/strict';
import wordData from '../src/data/words.json' with { type: 'json' };
import { idForWord, levelOf, withIds, wordId } from '../src/learning/wordCatalogue.js';

const everyWord = wordData.categories.flatMap((category) => category.words.map((word) => ({ ...word, category })));
const byLevel = (level) => everyWord.filter((word) => word.level === level);
const meanLength = (words) => words.reduce((sum, word) => sum + word.word.length, 0) / words.length;

test('every word declares the level it is practised at', () => {
  const missing = everyWord.filter((word) => !word.level).map((word) => word.word);
  assert.deepEqual(missing, [], 'a word would fall back to the category it is stored under');
  assert.deepEqual([...new Set(everyWord.map((word) => word.level))].sort(), ['Challenge', 'Grade 4', 'Grade 5', 'Grade 6']);
});

// The defect: the Grade 6 category's last eighty entries were the strictly alphabetical continuation of
// the Grade 4 list. Grade 4 ended at `ocean` and they ran `offer` to `unusual`, so a Grade 6 session
// dictated `please`, `police` and `tomorrow`.
test('the Grade 4 words that were filed under Grade 6 are practised as Grade 4', () => {
  for (const word of ['offer', 'often', 'please', 'police', 'question', 'tomorrow', 'together', 'travel', 'unusual']) {
    const entry = everyWord.find((candidate) => candidate.word === word);
    assert.ok(entry, `${word} is missing from the list`);
    assert.equal(entry.level, 'Grade 4', `${word} is still practised as ${entry.level}`);
  }
});

test('the spelling-bee words that were filed under Grade 6 are practised as Challenge', () => {
  for (const word of ['bureaucracy', 'connoisseur', 'hypocrisy', 'lieutenant', 'parliament', 'phenomenon', 'xylophone']) {
    const entry = everyWord.find((candidate) => candidate.word === word);
    assert.ok(entry, `${word} is missing from the list`);
    assert.equal(entry.level, 'Challenge', `${word} is still practised as ${entry.level}`);
  }
});

// Word length is not difficulty, so this only guards the coarse failure the audit found: easy words
// being dictated at a higher level. Grade 5 and Grade 6 deliberately overlap, because the Grade 5 list
// is full of long -tion endings while Grade 6 holds short hard words such as `niece` and `rhythm`.
test('the Grade 4 words are plainly shorter than every level above them', () => {
  const grade4 = meanLength(byLevel('Grade 4'));
  for (const level of ['Grade 5', 'Grade 6', 'Challenge']) {
    assert.ok(meanLength(byLevel(level)) - grade4 > 2, `${level} words average within two letters of the Grade 4 words`);
  }
});

// A word's id comes from the category it is stored under, so a corrected spelling must pin the id it
// already had. Without that, correcting `center` to `centre` would silently orphan its progress row.
test('correcting a spelling never changes the word id', () => {
  for (const [stored, corrected] of [['center', 'centre'], ['favorite', 'favourite'], ['neighbor', 'neighbour'], ['diarrhoea', 'diarrhea']]) {
    const entry = everyWord.find((candidate) => candidate.word === corrected);
    assert.ok(entry, `${corrected} is not in the list`);
    assert.equal(idForWord(entry.category.name, entry), wordId(entry.category.name, stored), `${corrected} was given a new id`);
  }
});

test('the list uses the Canadian form the lesson pack teaches', () => {
  const spellings = new Set(everyWord.map((word) => word.word));
  for (const american of ['center', 'favorite', 'neighbor', 'color', 'honor', 'meter', 'theater', 'traveled']) {
    assert.ok(!spellings.has(american), `the list dictates ${american} while the pack teaches the Canadian form`);
  }
});

test('a definition explains the word instead of restating it', () => {
  const restated = everyWord.filter((word) => {
    const stem = word.word.slice(0, Math.max(4, word.word.length - 2));
    return new RegExp(`\\b${stem}`, 'i').test(word.definition);
  }).map((word) => `${word.word}: ${word.definition}`);
  assert.deepEqual(restated, [], 'these definitions give the word away');
});

test('no word is practised twice', () => {
  const spellings = everyWord.map((word) => word.word.toLowerCase());
  const duplicates = spellings.filter((word, index) => spellings.indexOf(word) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test('regrouping by level keeps every id unique and every word reachable', () => {
  const sections = withIds(wordData.categories);
  const ids = sections.flatMap((section) => section.words.map((word) => word.id));
  assert.equal(ids.length, everyWord.length, 'regrouping lost or duplicated a word');
  assert.equal(new Set(ids).size, ids.length, 'two words share an id');
  // Only the grade lists may carry the curriculum claim.
  const challenge = sections.filter((section) => section.level === 'Challenge');
  assert.ok(challenge.length > 0);
  challenge.forEach((section) => assert.ok(!/Alberta Curriculum/i.test(section.name), 'challenge words are labelled as Alberta curriculum'));
});

test('a list with no declared levels is grouped exactly as before', () => {
  const [only] = withIds([{ name: 'Tricky Words', words: [{ word: 'accident' }] }]);
  assert.equal(only.id, 'tricky-words');
  assert.equal(only.words[0].id, 'tricky-words__accident');
  assert.equal(levelOf({ name: 'Grade 5 — Alberta Curriculum' }, { word: 'x' }), 'Grade 5');
});
