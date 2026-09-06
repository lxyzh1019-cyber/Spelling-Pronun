import test from 'node:test';
import assert from 'node:assert/strict';
import skillsData from '../src/data/skills.json' with { type: 'json' };
import { validateContent } from '../src/learning/contentValidator.js';
import { pilotEpisode, pilotItems } from '../src/data/pilotFixtures.js';

test('engineering fixtures are valid but explicitly barred from mastery', () => {
  const result = validateContent({ skills: skillsData.skills, items: pilotItems, episodes: [pilotEpisode] });
  assert.deepEqual(result.errors, []);
  assert.equal(pilotItems.length, 5);
  assert.ok(pilotItems.every((item) => item.authorStatus === 'engineering_fixture'));
  assert.ok(pilotItems.every((item) => item.reviewStatus === 'not_reviewed'));
  assert.ok(pilotItems.every((item) => item.evidenceEligibility === 'fixture_only'));
});
