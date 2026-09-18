import test from 'node:test';
import assert from 'node:assert/strict';
import { countSentences, readingGrade, syllablesIn } from '../src/learning/readability.js';

test('syllables are counted per vowel run, with a silent e ignored', () => {
  for (const [word, expected] of [['cat', 1], ['make', 1], ['making', 2], ['the', 1], ['she', 1], ['bicycle', 3], ['table', 2], ['archivist', 3], ['reproduction', 4], ['a', 1]]) {
    assert.equal(syllablesIn(word), expected, `${word} was counted as ${syllablesIn(word)} syllables`);
  }
  assert.equal(syllablesIn(''), 0);
  assert.equal(syllablesIn('...'), 0);
});

test('a sentence without a final end mark is still one sentence', () => {
  assert.equal(countSentences('The dog ran. The cat slept.'), 2);
  assert.equal(countSentences('The dog ran'), 1);
  assert.equal(countSentences(''), 1, 'an empty text must not divide by zero');
});

test('short plain prose scores far below dense prose', () => {
  const plain = readingGrade('The dog ran fast. The cat sat down. We went home.');
  const dense = readingGrade('The archivist demonstrated that the reproduction incorporated transcription inconsistencies attributable to subsequent interventions.');
  assert.ok(plain.grade < 4, `plain prose scored ${plain.grade.toFixed(1)}`);
  assert.ok(dense.grade > 14, `dense prose scored ${dense.grade.toFixed(1)}`);
});

test('an empty text is reported as empty rather than scored', () => {
  assert.deepEqual(readingGrade('   '), { grade: 0, words: 0, sentences: 0, wordsPerSentence: 0, syllablesPerWord: 0 });
});
