import test from 'node:test';
import assert from 'node:assert/strict';
import skillsData from '../src/data/skills.json' with { type: 'json' };
import { c0StoryEpisodes } from '../src/data/storyEpisodes.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { buildContentManifest } from '../src/learning/contentManifest.js';

test('manifest proves exact C0 draft inventory without claiming release readiness', () => {
  const manifest = buildContentManifest({ skills: skillsData.skills, packs: c0PilotPacks, assessmentForms: c0AssessmentForms, episodes: c0StoryEpisodes });
  assert.deepEqual(manifest.counts, { skills: 42, packs: 4, contentObjects: 96, assessmentPrompts: 68, episodes: 2, mappedSkills: 4, challengedObjects: 96, reviewedObjects: 96, integratedObjects: 96, challengedAssessmentPrompts: 68, reviewedAssessmentPrompts: 28, integratedAssessmentPrompts: 28, challengedEpisodes: 2, reviewedEpisodes: 2, integratedEpisodes: 2, quarantinedObjects: 0, quarantinedAssessmentPrompts: 0, pilotApprovedObjects: 96, pilotApprovedAssessmentPrompts: 28, pilotApprovedEpisodes: 2, releasedObjects: 0, releasedAssessmentPrompts: 0, releasedEpisodes: 0 });
  assert.equal(manifest.r2InventoryComplete, true);
  assert.equal(manifest.r3InventoryComplete, false);
  assert.equal(manifest.releaseReady, false);
  // The parent approved the four packs, both episodes, and the 28 audio-free Part B prompts.
  // The 40 Part A prompts stay out, so the pilot never depends on audio nobody has heard.
  assert.equal(manifest.counts.pilotApprovedAssessmentPrompts, 28);
  // All six audit corrections are resolved and their replacements installed, so nothing is withheld.
  assert.equal(manifest.correctionsOpen, false);
  assert.deepEqual(manifest.errors, []);
});

test('manifest rejects a malformed 24-object pack role distribution', () => {
  const bad = { ...c0PilotPacks[0], items: c0PilotPacks[0].items.slice(1) };
  const manifest = buildContentManifest({ skills: skillsData.skills, packs: [bad] });
  assert.ok(manifest.errors.some((error) => error.includes('23/24')));
  assert.ok(manifest.errors.some((error) => error.includes('worked_example')));
});
