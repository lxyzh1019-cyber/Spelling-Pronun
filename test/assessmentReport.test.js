import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssessmentReport, compareAssessmentReports } from '../src/learning/assessmentReport.js';

test('assessment report separates first tries, assistance, omissions, and pending review', () => {
  const report = buildAssessmentReport({ form: 'A', results: [
    { skillId: 'SP.patterns', status: 'correct', correct: true },
    { skillId: 'SP.patterns', status: 'incorrect', correct: false, helped: true },
    { skillId: 'SE.complete', status: 'omitted', omitted: true },
    { skillId: 'PR.word-stress', status: 'pending' },
  ] });
  assert.deepEqual(report.tracks.spelling, { opportunities: 2, independentScored: 1, firstTryCorrect: 1, assisted: 1, omissions: 0, pendingReview: 0, coverage: 'needs_more_evidence' });
  assert.equal(report.tracks.sentences.omissions, 1);
  assert.equal(report.tracks.pronunciation.pendingReview, 1);
  assert.equal(report.status, 'incomplete');
  assert.equal(report.suggestedTrack, 'sentences');
  assert.deepEqual(report.totals, { answered: 3, assisted: 1, omissions: 1, pendingReview: 1 });
});

test('assessment comparison requires complete like-for-like forms and discloses exposure', () => {
  const first = buildAssessmentReport({ form: 'A', completedAt: '2026-01-01', results: [{ skillId: 'SP.patterns', status: 'incorrect', correct: false }] });
  const second = buildAssessmentReport({ form: 'A', completedAt: '2026-02-01', results: [{ skillId: 'SP.patterns', status: 'correct', correct: true }] });
  assert.equal(compareAssessmentReports(first, second).comparable, true);
  assert.match(compareAssessmentReports(first, second).disclosure, /previously exposed/);
  assert.deepEqual(compareAssessmentReports(first, { ...second, form: 'B' }), { comparable: false, reason: 'not_like_for_like' });
  assert.deepEqual(compareAssessmentReports(first, { ...second, completedAt: null }), { comparable: false, reason: 'incomplete_assessment' });
});
