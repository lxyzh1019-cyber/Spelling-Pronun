import test from 'node:test';
import assert from 'node:assert/strict';
import { REASSESSMENT_SUGGESTION, appendAssessmentHistory, buildAssessmentReport, compareAssessmentReports, latestComparison } from '../src/learning/assessmentReport.js';

test('assessment report keeps correct, wrong, skipped, helped, pending, and technical outcomes distinct', () => {
  const report = buildAssessmentReport({ form: 'A', results: [
    { skillId: 'SP.patterns', status: 'correct', correct: true },
    { skillId: 'SP.patterns', status: 'incorrect', correct: false },
    { skillId: 'SP.patterns', status: 'incorrect', correct: false, helped: true },
    { skillId: 'SE.complete', status: 'omitted', omitted: true },
    { skillId: 'PR.word-stress', status: 'pending' },
    { skillId: 'PR.discrimination', status: 'technical_failure', technicalFailure: true },
  ] });
  assert.deepEqual(report.tracks.spelling, { opportunities: 3, independentScored: 2, firstTryCorrect: 1, assisted: 1, omissions: 0, pendingReview: 0, technicalFailures: 0, coverage: 'needs_more_evidence' });
  assert.equal(report.tracks.sentences.omissions, 1);
  assert.equal(report.tracks.pronunciation.pendingReview, 1);
  assert.equal(report.tracks.pronunciation.technicalFailures, 1);
  assert.equal(report.status, 'incomplete');
  assert.equal(report.suggestedTrack, 'sentences');
  assert.deepEqual(report.totals, { answered: 4, assisted: 1, omissions: 1, pendingReview: 1, technicalFailures: 1 });
});

test('assessment comparison requires complete like-for-like forms and discloses exposure', () => {
  const first = buildAssessmentReport({ form: 'A', completedAt: '2026-01-01', results: [{ skillId: 'SP.patterns', status: 'incorrect', correct: false }] });
  const second = buildAssessmentReport({ form: 'A', completedAt: '2026-02-01', results: [{ skillId: 'SP.patterns', status: 'correct', correct: true }] });
  assert.equal(compareAssessmentReports(first, second).comparable, true);
  assert.match(compareAssessmentReports(first, second).disclosure, /previously exposed/);
  assert.deepEqual(compareAssessmentReports(first, { ...second, form: 'B' }), { comparable: false, reason: 'not_like_for_like' });
  assert.deepEqual(compareAssessmentReports(first, { ...second, completedAt: null }), { comparable: false, reason: 'incomplete_assessment' });
});

test('completed reports build a per-form history that compares the latest two like-for-like', () => {
  const first = buildAssessmentReport({ form: 'A', completedAt: '2026-01-01T00:00:00.000Z', results: [{ skillId: 'SP.patterns', status: 'incorrect', correct: false }] });
  const second = buildAssessmentReport({ form: 'A', completedAt: '2026-02-01T00:00:00.000Z', results: [{ skillId: 'SP.patterns', status: 'correct', correct: true }] });
  const incomplete = buildAssessmentReport({ form: 'A', results: [] });
  let history = appendAssessmentHistory([], incomplete);
  assert.deepEqual(history, [], 'incomplete reports are never stored');
  history = appendAssessmentHistory(history, first);
  history = appendAssessmentHistory(history, first);
  assert.equal(history.length, 1, 'the same completion is stored once');
  assert.equal(latestComparison(history), null, 'one completion cannot be compared');
  history = appendAssessmentHistory(history, second);
  const latest = latestComparison(history);
  assert.equal(latest.comparison.comparable, true);
  assert.deepEqual(latest.comparison.tracks.spelling, { before: '0/1', after: '1/1', comparable: true });
  assert.match(REASSESSMENT_SUGGESTION, /4–6 weeks/);
  assert.match(REASSESSMENT_SUGGESTION, /not a schedule/);
});
