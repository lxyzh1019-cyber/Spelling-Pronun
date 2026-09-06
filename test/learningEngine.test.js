import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateItem, evidenceEligible } from '../src/learning/evaluators.js';
import { deriveMastery } from '../src/learning/mastery.js';
import { nextReview, selectDueReviews, deriveReviewProgress } from '../src/learning/reviewScheduler.js';
import { createLearningSession, transitionSession } from '../src/learning/sessionEngine.js';
import { validateContent } from '../src/learning/contentValidator.js';

test('punctuation remains evaluable and is never stripped by normalization', () => {
  const item = { evaluator: 'punctuation', acceptedAnswers: ['Hello, Sam.'], allowReview: false };
  assert.equal(evaluateItem(item, 'Hello Sam.').status, 'incorrect');
  assert.equal(evaluateItem(item, 'Hello, Sam.').status, 'correct');
});

test('reasonable unlisted sentence repair can remain pending', () => {
  const item = { evaluator: 'sentence_repair', acceptedAnswers: ['I left. It rained.'], allowReview: true };
  assert.equal(evaluateItem(item, 'I left because it rained.').status, 'pending');
});

test('helped and self-report attempts are excluded from mastery evidence', () => {
  assert.equal(evidenceEligible({ evidenceType: 'independent_spelling', helped: true }), false);
  assert.equal(evidenceEligible({ evidenceType: 'self_report' }), false);
  assert.equal(evidenceEligible({ evidenceType: 'independent_spelling', helped: false, correct: true }), true);
});

test('secure mastery requires sessions, dates, unseen transfer, and delayed review', () => {
  const attempts = Array.from({ length: 10 }, (_, index) => ({
    evidenceType: index === 8 ? 'independent_transfer' : index === 9 ? 'delayed_review' : 'independent_spelling',
    correct: index !== 7,
    helped: false,
    sessionId: index < 5 ? 's1' : 's2',
    edmontonDate: index < 5 ? '2026-09-01' : '2026-09-09',
    eventTime: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
    unseen: index < 3,
  }));
  assert.equal(deriveMastery(attempts).status, 'secure');
});

test('duplicate submit is idempotent and stale revision is rejected', () => {
  let session = createLearningSession({ id: 's', learnerId: 'jenn', mode: 'lesson', contentVersion: 1, orderedItemIds: ['a'], seed: 1 });
  session = transitionSession(session, { type: 'BEGIN' });
  session = transitionSession(session, { type: 'READY' });
  const attempt = { attemptId: 'a1', status: 'incorrect' };
  const submitted = transitionSession(session, { type: 'SUBMIT', attempt });
  assert.equal(submitted.responses.length, 1);
  assert.equal(transitionSession(submitted, { type: 'SUBMIT', attempt }).responses.length, 1);
  assert.throws(() => transitionSession(submitted, { type: 'PAUSE', expectedRevision: 0 }), /stale_revision/);
});

test('review scheduling advances only on unassisted success and caps due selection', () => {
  const first = nextReview({ eventTime: '2026-09-01T00:00:00Z', correct: true });
  assert.equal(first.reviewStage, 0);
  assert.equal(selectDueReviews(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i, { id: i, reviewDue: '2026-09-01T00:00:00Z' }])), new Date('2026-09-05T00:00:00Z')).length, 4);
});

test('review progress excludes fixtures and resets reviewed failures to one day', () => {
  const attempts = [
    { eventTime: '2026-01-01T12:00:00Z', edmontonDate: '2026-01-01', skillIds: ['SE.complete'], correct: true, status: 'correct', contentStatus: 'not_reviewed' },
    { eventTime: '2026-01-01T12:00:00Z', edmontonDate: '2026-01-01', skillIds: ['PU.capitals-endmarks'], correct: true, status: 'correct', contentStatus: 'needs_independent_challenge' },
    { eventTime: '2026-01-02T12:00:00Z', edmontonDate: '2026-01-02', skillIds: ['SP.patterns'], correct: true, status: 'correct', contentStatus: 'reviewed' },
    { eventTime: '2026-01-05T12:00:00Z', edmontonDate: '2026-01-05', skillIds: ['SP.patterns'], correct: false, status: 'incorrect', contentStatus: 'reviewed' },
  ];
  const progress = deriveReviewProgress(attempts);
  assert.equal(progress['SE.complete'], undefined);
  assert.equal(progress['PU.capitals-endmarks'], undefined);
  assert.equal(progress['SP.patterns'].reviewStage, 0);
  assert.equal(progress['SP.patterns'].reviewDue, '2026-01-06T12:00:00.000Z');
  assert.equal(progress['SP.patterns'].lastErrorAt, '2026-01-05T12:00:00Z');
});

test('content validator rejects cycles, missing answers, and assessment overlap', () => {
  const result = validateContent({
    skills: [{ id: 'a', prerequisites: ['b'] }, { id: 'b', prerequisites: ['a'] }],
    items: [{ id: 'item', primarySkill: 'a' }],
    assessments: [{ id: 'form-a', itemIds: ['item'] }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('cycle')));
  assert.ok(result.errors.some((error) => error.includes('overlaps')));
});

test('content validator rejects broken release references and unsafe recording scoring', () => {
  const skills = [{ id: 'PR.target', prerequisites: [] }];
  const item = { id: 'item-1', version: 1, primarySkill: 'PR.target', secondarySkills: ['missing'], role: 'independent', difficulty: 1, prerequisites: [], prompt: 'Record.', responseType: 'recording', evaluator: 'spelling', rubric: {}, explanation: 'Review the sound.', helpSteps: [], evidenceEligibility: 'draft_audio_only', transferGroup: 'g', authorStatus: 'draft', reviewStatus: 'reviewed', sourceIds: ['missing-source'], audioRef: 'missing-audio', audioStatus: 'synthetic_preview' };
  const result = validateContent({ skills, items: [item], episodes: [{ id: 'ep', taskIds: ['missing-task'], historical: true, sourceIds: ['only-one'], status: 'released' }], sources: [{ id: 'known' }] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('unknown secondary skill')));
  assert.ok(result.errors.some((error) => error.includes('broken audio reference')));
  assert.ok(result.errors.some((error) => error.includes('recording must use human review')));
  assert.ok(result.errors.some((error) => error.includes('unknown task')));
  assert.ok(result.errors.some((error) => error.includes('fiction label')));
});
