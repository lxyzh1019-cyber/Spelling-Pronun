import test from 'node:test';
import assert from 'node:assert/strict';
import preparation from '../src/data/curriculum.c1-c2.preparation.json' with { type: 'json' };
import skillsData from '../src/data/skills.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { validateCurriculumPreparation } from '../src/learning/curriculumPreparation.js';

test('C1/C2 preparation maps every future pack without claiming authored curriculum', () => {
  const result = validateCurriculumPreparation({ preparation, skills: skillsData.skills, sources: sourceData.sources });
  assert.deepEqual(result.errors, []);
  assert.equal(result.preparedPackCount, 38);
  assert.equal(result.preparedObjectCount, 912);
  assert.equal(preparation.status, 'pre_pilot_source_and_mapping_preparation');
  assert.ok(preparation.batches.flatMap((batch) => batch.entries).some((entry) => entry.sourcePreparationStatus.includes('needs_specialist')));
});

test('C1/C2 preparation rejects a duplicate skill or mismatched episode plan', () => {
  const invalid = structuredClone(preparation);
  invalid.batches[1].entries[0].skillId = invalid.batches[0].entries[0].skillId;
  invalid.batches[0].expectedEpisodeCount = 5;
  const result = validateCurriculumPreparation({ preparation: invalid, skills: skillsData.skills, sources: sourceData.sources });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('repeats a skill')));
  assert.ok(result.errors.some((error) => error.includes('episode map')));
});
