import test from 'node:test';
import assert from 'node:assert/strict';
import skillsData from '../src/data/skills.json' with { type: 'json' };
import storyDraft from '../src/data/story.c0.draft.json' with { type: 'json' };
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { buildContentManifest } from '../src/learning/contentManifest.js';

test('manifest proves exact C0 draft inventory without claiming release readiness', () => {
  const manifest = buildContentManifest({ skills: skillsData.skills, packs: c0PilotPacks, assessmentForms: c0AssessmentForms, episodes: storyDraft.episodes });
  assert.deepEqual(manifest.counts, { skills: 42, packs: 4, contentObjects: 96, assessmentPrompts: 68, episodes: 2, mappedSkills: 4, challengedObjects: 96, reviewedObjects: 0, challengedAssessmentPrompts: 68, reviewedAssessmentPrompts: 0 });
  assert.equal(manifest.r2InventoryComplete, true);
  assert.equal(manifest.r3InventoryComplete, false);
  assert.equal(manifest.releaseReady, false);
  assert.deepEqual(manifest.errors, []);
});

test('manifest rejects a malformed 24-object pack role distribution', () => {
  const bad = { ...c0PilotPacks[0], items: c0PilotPacks[0].items.slice(1) };
  const manifest = buildContentManifest({ skills: skillsData.skills, packs: [bad] });
  assert.ok(manifest.errors.some((error) => error.includes('23/24')));
  assert.ok(manifest.errors.some((error) => error.includes('worked_example')));
});
