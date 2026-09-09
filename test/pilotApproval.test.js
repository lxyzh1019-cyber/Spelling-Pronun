import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_LIFECYCLE, EVIDENCE_TRACKS, applyPilotApproval, approvedPilotScopeIds, attemptIsInTrack, dependsOnUncheckedAudio, validatePilotApprovals } from '../src/learning/pilotApproval.js';
import { deriveMastery } from '../src/learning/mastery.js';
import { buildReviewQueue } from '../src/learning/reviewQueue.js';
import { deriveReviewProgress } from '../src/learning/reviewScheduler.js';
import pilotApprovalData from '../src/data/pilotApproval.c0.json' with { type: 'json' };
import { c0PilotItems, c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c0AssessmentItems } from '../src/data/assessment.c0.draft.js';
import { c0StoryEpisodes } from '../src/data/storyEpisodes.js';

test('pilot approval sits between integration and learner testing and carries the parent decision', () => {
  assert.deepEqual(CONTENT_LIFECYCLE.slice(4, 7), ['integrated', 'pilot_approved', 'learner_tested']);
  // Every approval names a parent and a date; nothing is approved by the implementation role.
  assert.ok(pilotApprovalData.approvals.length > 0);
  assert.ok(pilotApprovalData.approvals.every((approval) => approval.decidedBy === 'parent' && approval.decidedAt));
  assert.deepEqual(approvedPilotScopeIds(pilotApprovalData.approvals).sort(), [
    'c0.assessment.a', 'c0.assessment.b',
    'c0.pack.gr.subject-object-pronouns', 'c0.pack.pu.capitals-endmarks', 'c0.pack.se.complete', 'c0.pack.sp.patterns',
    'c0.story.01', 'c0.story.02',
  ]);
  // The forms are approved for their Part B prompts only; Part A waits on the listening check.
  for (const form of pilotApprovalData.approvals.filter((approval) => approval.scopeType === 'assessment_form')) {
    assert.equal(form.itemIds.length, 14);
    assert.ok(form.excluded.includes('Part A'));
  }
});

test('the approved pilot content is the content the app actually serves', () => {
  const approved = (items) => items.filter((item) => item.releaseStatus === 'pilot_approved');
  assert.equal(approved(c0PilotItems).length, 96, 'all four packs run in the pilot');
  assert.equal(approved(c0AssessmentItems).length, 28, 'the 28 Part B prompts, and nothing that needs audio');
  assert.equal(approved(c0StoryEpisodes).length, 2);
  // Nothing is released, so the released evidence record stays empty during the pilot.
  assert.equal([...c0PilotItems, ...c0AssessmentItems, ...c0StoryEpisodes].filter((entry) => entry.releaseStatus === 'released').length, 0);
  // Every prompt that depends on unchecked audio is still outside the pilot.
  const audioPrompts = c0AssessmentItems.filter(dependsOnUncheckedAudio);
  assert.ok(audioPrompts.length > 0);
  assert.ok(audioPrompts.every((item) => item.releaseStatus !== 'pilot_approved'));
  // The pilot review queue can now serve delayed review, which is what the released queue cannot.
  const due = [{ skillId: 'SP.patterns', reviewStage: 0, reviewDue: '2026-09-01T00:00:00Z' }];
  assert.equal(buildReviewQueue(due, c0PilotPacks).length, 0, 'released queue admits nothing');
  assert.equal(buildReviewQueue(due, c0PilotPacks, 4, { track: EVIDENCE_TRACKS.PILOT }).length, 1);
});

test('an approval requires a recorded parent decision on reviewed, integrated, correction-free content', () => {
  const reviewedItem = { id: 'i1', reviewStatus: 'reviewed', integrationStatus: 'integrated' };
  const pack = { id: 'pack1', version: 1, items: [reviewedItem] };
  const approval = { scopeId: 'pack1', scopeType: 'pack', scopeVersion: 1, decision: 'approved', decidedBy: 'parent', decidedAt: '2026-09-08' };
  assert.deepEqual(validatePilotApprovals({ approvals: [approval], packs: [pack] }).errors, []);

  const notParent = validatePilotApprovals({ approvals: [{ ...approval, decidedBy: 'claude' }], packs: [pack] });
  assert.ok(notParent.errors.some((error) => error.includes('decided by the parent')));

  const unreviewed = validatePilotApprovals({ approvals: [approval], packs: [{ ...pack, items: [{ id: 'i1', reviewStatus: 'independently_challenged', integrationStatus: 'not_integrated' }] }] });
  assert.ok(unreviewed.errors.some((error) => error.includes('not reviewed and integrated')));

  const openCorrection = validatePilotApprovals({ approvals: [approval], packs: [{ ...pack, items: [{ ...reviewedItem, correctionStatus: 'changes_required' }] }] });
  assert.ok(openCorrection.errors.some((error) => error.includes('unresolved correction')));
  // A correction marked reviewed whose replacement was never installed blocks the pilot too.
  const notInstalled = validatePilotApprovals({ approvals: [approval], packs: [{ ...pack, items: [{ ...reviewedItem, correctionStatus: 'correction_not_installed' }] }] });
  assert.ok(notInstalled.errors.some((error) => error.includes('uninstalled replacement')));

  const staleVersion = validatePilotApprovals({ approvals: [{ ...approval, scopeVersion: 0 }], packs: [pack] });
  assert.ok(staleVersion.errors.some((error) => error.includes('targets version 0')));

  const missing = validatePilotApprovals({ approvals: [{ scopeId: 'pack1' }], packs: [pack] });
  assert.ok(missing.errors.some((error) => error.includes('missing')));
});

test('pilot approval never upgrades released content and never bypasses review', () => {
  const released = { id: 'i1', packId: 'pack1', releaseStatus: 'released', reviewStatus: 'reviewed', integrationStatus: 'integrated' };
  assert.equal(applyPilotApproval(released, ['pack1']).releaseStatus, 'released');
  const ready = { id: 'i2', packId: 'pack1', releaseStatus: 'not_released', reviewStatus: 'reviewed', integrationStatus: 'integrated' };
  assert.equal(applyPilotApproval(ready, ['pack1']).releaseStatus, 'pilot_approved');
  assert.equal(applyPilotApproval(ready, []).releaseStatus, 'not_released', 'no approval, no change');
  const unreviewed = { id: 'i3', packId: 'pack1', releaseStatus: 'not_released', reviewStatus: 'independently_challenged', integrationStatus: 'integrated' };
  assert.equal(applyPilotApproval(unreviewed, ['pack1']).releaseStatus, 'not_released');
});

test('pilot and released evidence records never mix', () => {
  const make = (contentStatus, index) => ({
    evidenceType: index === 8 ? 'independent_transfer' : index === 9 ? 'delayed_review' : 'independent_spelling',
    contentStatus, correct: true, helped: false,
    sessionId: index < 5 ? 's1' : 's2', edmontonDate: index < 5 ? '2026-09-01' : '2026-09-09',
    eventTime: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(), unseen: index < 3, skillIds: ['SP.patterns'], status: 'correct',
  });
  const pilotAttempts = Array.from({ length: 10 }, (_, index) => make('pilot_approved', index));

  assert.equal(deriveMastery(pilotAttempts).status, 'unassessed', 'pilot work never appears in the released record');
  assert.equal(deriveMastery(pilotAttempts, { track: EVIDENCE_TRACKS.PILOT }).status, 'secure');
  assert.equal(deriveMastery(pilotAttempts, { track: EVIDENCE_TRACKS.PILOT }).track, 'pilot');

  assert.deepEqual(deriveReviewProgress(pilotAttempts), {}, 'pilot answers do not schedule released reviews');
  assert.ok(deriveReviewProgress(pilotAttempts, { track: EVIDENCE_TRACKS.PILOT })['SP.patterns'], 'pilot answers schedule pilot reviews');

  assert.equal(attemptIsInTrack({ contentStatus: 'pilot_approved' }, EVIDENCE_TRACKS.PILOT), true);
  assert.equal(attemptIsInTrack({ contentStatus: 'pilot_approved' }), false);
  assert.equal(attemptIsInTrack({ contentStatus: 'not_released' }, EVIDENCE_TRACKS.PILOT), false, 'unapproved content is in neither record');
});

test('the delayed-review queue admits only the items of its own track', () => {
  const due = [{ skillId: 'SP.patterns', reviewStage: 0, reviewDue: '2026-09-01T00:00:00Z' }];
  const variant = (releaseStatus) => ({
    id: `v-${releaseStatus}`, version: 1, role: 'delayed_review', authorStatus: 'reviewed', reviewStatus: 'reviewed',
    releaseStatus, responseType: 'choice', evaluator: 'choice',
  });
  const pilotPack = [{ skillId: 'SP.patterns', items: [variant('pilot_approved')] }];
  assert.deepEqual(buildReviewQueue(due, pilotPack), [], 'pilot content stays out of the released queue');
  assert.equal(buildReviewQueue(due, pilotPack, 4, { track: EVIDENCE_TRACKS.PILOT }).length, 1);

  const releasedPack = [{ skillId: 'SP.patterns', items: [variant('released')] }];
  assert.equal(buildReviewQueue(due, releasedPack).length, 1);
  assert.deepEqual(buildReviewQueue(due, releasedPack, 4, { track: EVIDENCE_TRACKS.PILOT }), [], 'released content is not pilot evidence');

  const notApproved = [{ skillId: 'SP.patterns', items: [variant('not_released')] }];
  assert.deepEqual(buildReviewQueue(notApproved.length ? due : [], notApproved, 4, { track: EVIDENCE_TRACKS.PILOT }), []);
});

test('the validator gates the pilot_approved status like a release', async () => {
  const { validateContent } = await import('../src/learning/contentValidator.js');
  const base = {
    id: 'i', version: 1, primarySkill: 'a', role: 'independent', difficulty: 1, prompt: 'p', responseType: 'choice',
    evaluator: 'choice', acceptedAnswers: ['x'], explanation: 'e', helpSteps: ['h'], evidenceEligibility: 'independent',
    transferGroup: 't', authorStatus: 'reviewed', reviewStatus: 'reviewed', integrationStatus: 'integrated', releaseStatus: 'pilot_approved',
  };
  const skills = [{ id: 'a' }];
  assert.deepEqual(validateContent({ skills, items: [base] }).errors, []);
  assert.ok(validateContent({ skills, items: [{ ...base, integrationStatus: 'not_integrated' }] }).errors.some((error) => error.includes('pilot-approved without completed integration')));
  assert.ok(validateContent({ skills, items: [{ ...base, reviewStatus: 'independently_challenged' }] }).errors.some((error) => error.includes('pilot-approved without completed author and educational review')));
  assert.ok(validateContent({ skills, items: [{ ...base, correctionStatus: 'changes_required' }] }).errors.some((error) => error.includes('correction is unresolved')));
});
