import test from 'node:test';
import assert from 'node:assert/strict';
import plan from '../src/data/story.research.c1-c2.json' with { type: 'json' };
import sourceData from '../src/data/sources.json' with { type: 'json' };
import { validateStoryResearchPlan } from '../src/learning/storyResearchPlan.js';

test('future story research identifies authoritative destinations without claiming verified episodes', () => {
  const result = validateStoryResearchPlan({ plan, sources: sourceData.sources });
  assert.deepEqual(result.errors, []);
  assert.equal(result.preparedChapterCount, 5);
  assert.ok(plan.chapters.every((entry) => entry.status === 'pre_authoring_not_verified'));
  assert.match(plan.chapters.find((entry) => entry.chapter === 3).claimBoundary, /Indigenous nation/);
});

test('future story research rejects missing chapters and premature verification', () => {
  const invalid = structuredClone(plan);
  invalid.chapters.pop();
  invalid.chapters[0].status = 'verified';
  const result = validateStoryResearchPlan({ plan: invalid, sources: sourceData.sources });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('misses Chapter 6')));
  assert.ok(result.errors.some((error) => error.includes('unsupported research-status claim')));
});
