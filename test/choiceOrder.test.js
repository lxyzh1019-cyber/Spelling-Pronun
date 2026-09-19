import test from 'node:test';
import assert from 'node:assert/strict';
import { newOrderSeed, orderChoices, shouldOrderChoices } from '../src/learning/choiceOrder.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';

const item = (id, ids) => ({ id, choices: ids.map((choice) => ({ id: choice, text: `text ${choice}` })) });

test('the same seed always produces the same order, so a reload does not move the options', () => {
  const question = item('c0.x.01', ['a', 'b', 'c']);
  const first = orderChoices(question, 'sitting-1').map((choice) => choice.id);
  for (let repeat = 0; repeat < 20; repeat += 1) {
    assert.deepEqual(orderChoices(question, 'sitting-1').map((choice) => choice.id), first);
  }
});

test('a different sitting reorders, so a retake cannot be answered from remembered positions', () => {
  const question = item('c0.x.01', ['a', 'b', 'c']);
  const orders = new Set();
  for (let sitting = 0; sitting < 40; sitting += 1) orders.add(orderChoices(question, `sitting-${sitting}`).map((choice) => choice.id).join(''));
  assert.ok(orders.size > 1, 'every sitting produced the identical order');
});

test('ordering keeps every choice exactly once and never alters a choice', () => {
  const question = item('c0.x.01', ['a', 'b', 'c', 'd']);
  for (let sitting = 0; sitting < 50; sitting += 1) {
    const ordered = orderChoices(question, `s${sitting}`);
    assert.equal(ordered.length, question.choices.length);
    assert.deepEqual([...ordered].map((choice) => choice.id).sort(), ['a', 'b', 'c', 'd']);
    ordered.forEach((choice) => assert.ok(question.choices.includes(choice), 'a choice object was replaced'));
  }
});

test('two items in one sitting are ordered independently', () => {
  const orders = new Set();
  for (let index = 1; index <= 12; index += 1) orders.add(orderChoices(item(`c0.x.${index}`, ['a', 'b', 'c']), 'one-sitting').map((choice) => choice.id).join(''));
  assert.ok(orders.size > 1, 'every item in the sitting got the same order');
});

// The Test Lab derives its listening rows from these choices by index and the parent records a result
// against "Recording 2", so reordering them on screen would point the parent's own notes at the wrong
// recording. Position carries no answer information there, so there is nothing to fix.
test('audio choices keep their authored order', () => {
  const audio = { id: 'c0.assessment.a.11', responseType: 'audio_choice', choices: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  assert.equal(shouldOrderChoices(audio), false);
  assert.deepEqual(orderChoices(audio, 'any-seed').map((choice) => choice.id), ['a', 'b', 'c']);
});

test('an item with no choices or a single choice is left alone', () => {
  assert.deepEqual(orderChoices({ id: 'c0.x.01' }, 'seed'), []);
  assert.deepEqual(orderChoices({ id: 'c0.x.01', choices: [{ id: 'a' }] }, 'seed').map((choice) => choice.id), ['a']);
});

test('each sitting mints its own seed', () => {
  const seeds = new Set([newOrderSeed(), newOrderSeed(), newOrderSeed()]);
  assert.equal(seeds.size, 3);
});

// The real defect this module exists for: the authored keys are patterned (the spelling pack cycles
// b, a, c and assessment Part B alternates a, b), so a learner could score by position alone. Across
// many sittings the correct answer must land in every position about equally often.
test('on the real content the correct answer is spread evenly across the positions', () => {
  const items = [...c0PilotPacks.flatMap((pack) => pack.items), ...c0AssessmentForms.flatMap((form) => form.items)]
    .filter((entry) => shouldOrderChoices(entry) && entry.acceptedAnswers?.length);
  assert.ok(items.length > 80, `expected the real forms and packs, saw ${items.length} choice items`);
  const byWidth = new Map();
  const sittings = 300;
  for (let sitting = 0; sitting < sittings; sitting += 1) {
    for (const entry of items) {
      const ordered = orderChoices(entry, `sitting-${sitting}`);
      const position = ordered.findIndex((choice) => choice.id === entry.acceptedAnswers[0]);
      assert.ok(position >= 0, `${entry.id} lost its accepted answer when ordered`);
      const counts = byWidth.get(ordered.length) || new Array(ordered.length).fill(0);
      counts[position] += 1;
      byWidth.set(ordered.length, counts);
    }
  }
  for (const [width, counts] of byWidth) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const expected = 1 / width;
    counts.forEach((count, position) => {
      const share = count / total;
      assert.ok(Math.abs(share - expected) < 0.05, `${width}-option items put the answer in position ${position} ${(share * 100).toFixed(1)}% of the time`);
    });
  }
});
