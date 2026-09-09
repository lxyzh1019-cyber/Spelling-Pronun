import test from 'node:test';
import assert from 'node:assert/strict';
import { slug, shortGradeLabel, withIds, wordId } from '../src/learning/wordCatalogue.js';
import wordData from '../src/data/words.json' with { type: 'json' };

test('a word ID comes from its original category, so resectioning cannot reset progress', () => {
  const categories = [{ name: 'Grade 4 — Alberta Curriculum', words: Array.from({ length: 60 }, (_, index) => ({ word: `word${index}` })) }];
  const sections = withIds(categories);
  assert.equal(sections.length, 3, '60 words split into three sections of 25');
  assert.deepEqual(sections.map((section) => section.words.length), [25, 25, 10]);
  // Every id is derived from the category name, never the section name.
  const ids = sections.flatMap((section) => section.words.map((word) => word.id));
  assert.equal(new Set(ids).size, 60);
  assert.ok(ids.every((id) => id.startsWith('grade-4-alberta-curriculum__')));
  // Changing the section size moves words between sections but never changes an ID.
  const resectioned = withIds(categories, 10);
  assert.equal(resectioned.length, 6);
  assert.deepEqual(resectioned.flatMap((section) => section.words.map((word) => word.id)).sort(), [...ids].sort());
});

test('a small category is not split and keeps its own id', () => {
  const [only] = withIds([{ name: 'Tricky Words', words: [{ word: 'accident' }] }]);
  assert.equal(only.id, 'tricky-words');
  assert.equal(only.words[0].id, 'tricky-words__accident');
});

test('section names shorten the grade label and count the words they hold', () => {
  const sections = withIds([{ name: 'Grade 5 — Alberta Curriculum', words: Array.from({ length: 30 }, (_, index) => ({ word: `w${index}` })) }]);
  assert.equal(sections[0].name, 'Grade 5 — Section 1 (words 1-25)');
  assert.equal(sections[1].name, 'Grade 5 — Section 2 (words 26-30)');
  assert.equal(shortGradeLabel('Grade 5 — Alberta Curriculum'), 'Grade 5');
  assert.equal(shortGradeLabel('Tricky Words'), 'Tricky Words', 'a name with no grade is left alone');
  assert.equal(slug('Grade 4 — Alberta Curriculum'), 'grade-4-alberta-curriculum');
  assert.equal(wordId('Grade 4', "don't"), 'grade-4__don-t');
});

test('the real word list produces unique IDs across every section', () => {
  const sections = withIds(wordData.categories || []);
  const ids = sections.flatMap((section) => section.words.map((word) => word.id));
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'no two words share an ID');
  assert.ok(sections.every((section) => section.words.length <= 25));
});
