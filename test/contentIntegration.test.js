import test from 'node:test';
import assert from 'node:assert/strict';
import integrationData from '../src/data/integration.c0.json' with { type: 'json' };
import story from '../src/data/story.c0.draft.json' with { type: 'json' };
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { validateContentIntegration } from '../src/learning/contentReview.js';

const validate = (records = integrationData.records) => validateContentIntegration({ records, packs: c0PilotPacks, assessments: c0AssessmentForms, story });

test('C0 integration records cover 96 lesson objects, 28 assessment prompts, and two episodes', () => {
  assert.deepEqual(validate().errors, []);
  assert.deepEqual(integrationData.records.map((record) => record.expectedObjectCount), [96, 28, 2]);
});

test('integrated C0 content is reviewed but remains unreleased', () => {
  const lessonItems = c0PilotPacks.flatMap((pack) => pack.items);
  const assessmentItems = c0AssessmentForms.flatMap((form) => form.items).filter((item) => item.integrationStatus === 'integrated');
  assert.ok([...lessonItems, ...assessmentItems].every((item) => item.reviewStatus === 'reviewed' && item.releaseStatus === 'not_released'));
  assert.ok(story.episodes.every((episode) => episode.reviewStatus === 'reviewed' && episode.integrationStatus === 'integrated' && episode.releaseStatus === 'not_released'));
});

test('integration validator rejects incomplete coverage and a release claim', () => {
  const record = integrationData.records[1];
  const invalid = { ...record, itemIds: record.itemIds.slice(1), releaseDecision: 'released' };
  const result = validate([integrationData.records[0], invalid, integrationData.records[2]]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('misses assessment items')));
  assert.ok(result.errors.some((error) => error.includes('integrated-not-released')));
});
