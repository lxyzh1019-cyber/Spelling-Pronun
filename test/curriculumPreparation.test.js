import test from 'node:test';
import assert from 'node:assert/strict';
import preparation from '../src/data/curriculum.c1-c2.preparation.json' with { type: 'json' };
import skillsData from '../src/data/skills.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { validateCurriculumPreparation } from '../src/learning/curriculumPreparation.js';

test('C1/C2 preparation maps every future pack without claiming authored curriculum', () => {
  const result = validateCurriculumPreparation({ preparation, skills: skillsData.skills, sources: sourceData.sources });
  assert.deepEqual(result.errors, []);
  // C3 was added on 2026-09-18 from the Alberta mapping, which supersedes the C1/C2 ordering: the
  // eight Vocabulary and Comprehension skills are the largest unmeasured part of the curriculum.
  assert.equal(result.preparedPackCount, 46);
  assert.equal(result.preparedObjectCount, 1104);
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

// The batch list is allowed to grow — C3 came from the Alberta mapping — but never to lose a batch
// or repeat one, because either silently unplans the skills inside it.
test('preparation may add a batch but never drop or repeat one', () => {
  const missing = structuredClone(preparation);
  missing.batches = missing.batches.filter((batch) => batch.id !== 'C1');
  const dropped = validateCurriculumPreparation({ preparation: missing, skills: skillsData.skills, sources: sourceData.sources });
  assert.ok(dropped.errors.some((error) => error.includes('must contain the C1 batch')));

  const repeated = structuredClone(preparation);
  repeated.batches.push({ ...repeated.batches[0] });
  const twice = validateCurriculumPreparation({ preparation: repeated, skills: skillsData.skills, sources: sourceData.sources });
  assert.ok(twice.errors.some((error) => error.includes('repeats a batch')));

  // A third batch is fine in itself: the real preparation has one, and it validates clean.
  assert.ok(preparation.batches.some((batch) => batch.id === 'C3'));
  assert.deepEqual(validateCurriculumPreparation({ preparation, skills: skillsData.skills, sources: sourceData.sources }).errors, []);
});
