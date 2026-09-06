import test from 'node:test';
import assert from 'node:assert/strict';
import skillsData from '../src/data/skills.json' with { type: 'json' };
import { validateContent } from '../src/learning/contentValidator.js';
import { pilotEpisode, pilotItems } from '../src/data/pilotFixtures.js';
import storyDraft from '../src/data/story.c0.draft.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { c0AssessmentForms, c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { c0PilotPacks, c0PilotItems } from '../src/data/packs.c0.draft.js';

test('engineering fixtures are valid but explicitly barred from mastery', () => {
  const result = validateContent({ skills: skillsData.skills, items: pilotItems, episodes: [pilotEpisode] });
  assert.deepEqual(result.errors, []);
  assert.equal(pilotItems.length, 5);
  assert.ok(pilotItems.every((item) => item.authorStatus === 'engineering_fixture'));
  assert.ok(pilotItems.every((item) => item.reviewStatus === 'not_reviewed'));
  assert.ok(pilotItems.every((item) => item.evidenceEligibility === 'fixture_only'));
});

test('C0 pilot draft has four exact 24-object packs and 22 learner tasks each', () => {
  assert.equal(c0PilotPacks.length, 4);
  assert.equal(c0PilotItems.length, 96);
  assert.equal(new Set(c0PilotItems.map((item) => item.id)).size, 96);
  assert.equal(new Set(c0PilotItems.map((item) => JSON.stringify([item.prompt, item.choices]))).size, 96);
  for (const pack of c0PilotPacks) {
    assert.equal(pack.items.length, 24);
    assert.equal(pack.items.filter((item) => item.role === 'worked_example').length, 2);
    assert.equal(pack.items.filter((item) => item.role === 'guided').length, 6);
    assert.equal(pack.items.filter((item) => item.role === 'independent').length, 10);
    assert.equal(pack.items.filter((item) => item.role === 'transfer').length, 2);
    assert.equal(pack.items.filter((item) => item.role === 'delayed_review').length, 4);
    assert.equal(pack.items.filter((item) => item.responseType !== 'display').length, 22);
    assert.ok(pack.items.every((item) => item.reviewStatus === 'needs_independent_challenge'));
    assert.ok(pack.items.every((item) => item.explanation.length >= 35));
    for (const item of pack.items.filter((candidate) => candidate.choices)) {
      const choiceIds = item.choices.map((choice) => choice.id);
      assert.equal(new Set(choiceIds).size, choiceIds.length, `${item.id} repeats a choice ID`);
      assert.ok(item.acceptedAnswers.every((answer) => choiceIds.includes(answer)), `${item.id} answer is not a choice ID`);
    }
  }
  const validation = validateContent({ skills: skillsData.skills, items: c0PilotItems });
  assert.deepEqual(validation.errors, []);
});

test('C0 assessment draft has two distinct 34-prompt forms with the required blueprint', () => {
  assert.deepEqual(c0AssessmentForms.map((form) => form.items.length), [34, 34]);
  assert.equal(c0AssessmentItems.length, 68);
  assert.equal(new Set(c0AssessmentItems.map((item) => item.id)).size, 68);
  assert.equal(c0AssessmentItems.filter((item) => new Set(c0PilotItems.map(({ id }) => id)).has(item.id)).length, 0);
  const promptSignatures = c0AssessmentItems.map((item) => JSON.stringify([item.prompt, item.choices, item.rubric]));
  assert.equal(new Set(promptSignatures).size, 68);
  for (const form of c0AssessmentForms) {
    assert.equal(form.items.filter((item) => item.part === 'A').length, 20);
    assert.equal(form.items.filter((item) => item.part === 'B').length, 14);
    assert.equal(form.items.filter((item) => item.category === 'spelling_dictation').length, 8);
    assert.equal(form.items.filter((item) => item.category === 'decoding').length, 4);
    assert.equal(form.items.filter((item) => item.category === 'listening').length, 4);
    assert.equal(form.items.filter((item) => item.category === 'speaking').length, 4);
    assert.equal(form.items.filter((item) => item.category === 'sentence').length, 12);
    assert.equal(form.items.filter((item) => item.category === 'editing').length, 1);
    assert.equal(form.items.filter((item) => item.category === 'writing').length, 1);
  }
  assert.ok(c0AssessmentItems.every((item) => item.reviewStatus === 'needs_independent_challenge'));
  for (const item of c0AssessmentItems.filter((candidate) => candidate.choices && candidate.evaluator === 'choice')) {
    const choiceIds = item.choices.map((choice) => choice.id);
    assert.ok(item.acceptedAnswers.every((answer) => choiceIds.includes(answer)), `${item.id} answer is not a choice ID`);
  }
});

test('C0 story draft has two sourced, explicitly fictionalized episodes', () => {
  const sourceIds = new Set(sourceData.sources.map((source) => source.id));
  assert.equal(storyDraft.episodes.length, 2);
  for (const episode of storyDraft.episodes) {
    assert.equal(episode.fictionLabel, 'Fictional reconstruction');
    assert.ok(episode.sourceIds.length >= 2);
    assert.ok(episode.sourceIds.every((id) => sourceIds.has(id)));
    const words = episode.historyBehindMystery.trim().split(/\s+/).length;
    assert.ok(words >= 40 && words <= 80, `${episode.id} history note is ${words} words`);
  }
  const validation = validateContent({ skills: skillsData.skills, items: c0PilotItems, episodes: storyDraft.episodes, sources: sourceData.sources });
  assert.deepEqual(validation.errors, []);
});
