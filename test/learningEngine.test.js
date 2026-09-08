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
    contentStatus: 'released',
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

test('review progress excludes unreleased content and resets released failures to one day', () => {
  const attempts = [
    { eventTime: '2026-01-01T12:00:00Z', edmontonDate: '2026-01-01', skillIds: ['SE.complete'], correct: true, status: 'correct', contentStatus: 'not_reviewed' },
    { eventTime: '2026-01-01T12:00:00Z', edmontonDate: '2026-01-01', skillIds: ['PU.capitals-endmarks'], correct: true, status: 'correct', contentStatus: 'needs_independent_challenge' },
    { eventTime: '2026-01-02T12:00:00Z', edmontonDate: '2026-01-02', skillIds: ['SP.patterns'], correct: true, status: 'correct', contentStatus: 'released' },
    { eventTime: '2026-01-05T12:00:00Z', edmontonDate: '2026-01-05', skillIds: ['SP.patterns'], correct: false, status: 'incorrect', contentStatus: 'released' },
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
  const item = { id: 'item-1', version: 1, primarySkill: 'PR.target', secondarySkills: ['missing'], role: 'independent', difficulty: 1, prerequisites: [], prompt: 'Record.', responseType: 'recording', evaluator: 'spelling', rubric: {}, explanation: 'Review the sound.', helpSteps: [], evidenceEligibility: 'draft_audio_only', transferGroup: 'g', authorStatus: 'draft', reviewStatus: 'reviewed', releaseStatus: 'released', sourceIds: ['missing-source'], audioRef: 'missing-audio', audioStatus: 'synthetic_preview' };
  const result = validateContent({ skills, items: [item], episodes: [{ id: 'ep', taskIds: ['missing-task'], historical: true, sourceIds: ['only-one'], status: 'released' }], sources: [{ id: 'known' }] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('unknown secondary skill')));
  assert.ok(result.errors.some((error) => error.includes('broken audio reference')));
  assert.ok(result.errors.some((error) => error.includes('recording must use human review')));
  assert.ok(result.errors.some((error) => error.includes('released without completed')));
  assert.ok(result.errors.some((error) => error.includes('unknown task')));
  assert.ok(result.errors.some((error) => error.includes('fiction label')));
});

test('content validator requires a reviewed, labelled human-audio asset before spoken content can release', () => {
  const skills = [{ id: 'SP.patterns', prerequisites: [] }];
  const item = {
    id: 'spoken-1', version: 1, primarySkill: 'SP.patterns', secondarySkills: [], role: 'independent', difficulty: 1,
    prerequisites: [], prompt: 'Listen and type the word.', spokenText: 'carefully', responseType: 'text', evaluator: 'spelling',
    acceptedAnswers: ['carefully'], explanation: 'Listen for each syllable.', helpSteps: ['Replay the word.'],
    evidenceEligibility: 'independent_first_answer', transferGroup: 'audio-1', authorStatus: 'reviewed', reviewStatus: 'reviewed',
    integrationStatus: 'integrated', releaseStatus: 'released', audioRef: 'audio-carefully', audioStatus: 'reviewed_human',
  };
  const audioAsset = { id: 'audio-carefully', version: 1, url: '/audio/carefully.mp3', transcript: 'carefully', locale: 'en-CA', reviewStatus: 'reviewed' };
  assert.deepEqual(validateContent({ skills, items: [item], audioAssets: [audioAsset] }).errors, []);

  const invalidAsset = { ...audioAsset, locale: 'en-US', reviewStatus: 'pending' };
  const result = validateContent({ skills, items: [item], audioAssets: [invalidAsset] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('non-Canadian locale without a learner-facing disclosure')));
  assert.ok(result.errors.some((error) => error.includes('without a reviewed audio asset')));
});

test('a same-day retry never advances the review schedule, helped or not', () => {
  const released = { skillIds: ['SP.patterns'], status: 'correct', contentStatus: 'released' };
  const dayOne = [
    { ...released, eventTime: '2026-01-01T12:00:00Z', edmontonDate: '2026-01-01', correct: true },
    { ...released, eventTime: '2026-01-03T12:00:00Z', edmontonDate: '2026-01-03', correct: true },
  ];
  const advanced = deriveReviewProgress(dayOne)['SP.patterns'];
  assert.equal(advanced.reviewStage, 1);

  const unhelpedSameDay = deriveReviewProgress([
    ...dayOne,
    { ...released, eventTime: '2026-01-03T12:05:00Z', edmontonDate: '2026-01-03', correct: false, status: 'incorrect' },
    { ...released, eventTime: '2026-01-03T12:10:00Z', edmontonDate: '2026-01-03', correct: true },
  ])['SP.patterns'];
  assert.equal(unhelpedSameDay.reviewStage, 0, 'same-day unhelped retry after a miss stays at the reset stage');
  assert.equal(unhelpedSameDay.advanced, false);

  const sameDayAfterSuccess = deriveReviewProgress([
    ...dayOne,
    { ...released, eventTime: '2026-01-03T12:10:00Z', edmontonDate: '2026-01-03', correct: true },
  ])['SP.patterns'];
  assert.equal(sameDayAfterSuccess.reviewStage, 1, 'same-day repeat success keeps the current stage');
  assert.equal(sameDayAfterSuccess.advanced, false);

  const helpedSameDay = deriveReviewProgress([
    ...dayOne,
    { ...released, eventTime: '2026-01-03T12:10:00Z', edmontonDate: '2026-01-03', correct: true, helped: true },
  ])['SP.patterns'];
  assert.equal(helpedSameDay.reviewStage, 0, 'helped repair resets to one day');

  const nextDay = deriveReviewProgress([
    ...dayOne,
    { ...released, eventTime: '2026-01-07T12:00:00Z', edmontonDate: '2026-01-07', correct: true },
  ])['SP.patterns'];
  assert.equal(nextDay.reviewStage, 2);
  assert.equal(nextDay.advanced, true);
});

test('two failures in the last five eligible attempts flag a skill for review without erasing history', () => {
  const base = (index, correct) => ({
    evidenceType: 'independent_spelling', contentStatus: 'released', correct, helped: false, sessionId: 's1', edmontonDate: '2026-09-01',
    eventTime: new Date(Date.UTC(2026, 8, 1, index)).toISOString(),
  });
  const developing = [true, true, true, true, false, false].map((correct, index) => base(index, correct));
  const result = deriveMastery(developing);
  assert.equal(result.status, 'developing');
  assert.equal(result.needsReview, true);
  assert.equal(result.correctCount, 4, 'earlier successes remain counted');

  const oneFailure = [true, true, true, true, false].map((correct, index) => base(index, correct));
  assert.equal(deriveMastery(oneFailure).needsReview, false);

  const secure = Array.from({ length: 10 }, (_, index) => ({
    evidenceType: index === 8 ? 'independent_transfer' : index === 9 ? 'delayed_review' : 'independent_spelling',
    contentStatus: 'released', correct: index !== 7, helped: false, sessionId: index < 5 ? 's1' : 's2', edmontonDate: index < 5 ? '2026-09-01' : '2026-09-09',
    eventTime: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(), unseen: index < 3,
  }));
  assert.equal(deriveMastery(secure).status, 'secure');
  const regressed = [...secure, { ...base(11, false), edmontonDate: '2026-09-20', eventTime: '2026-09-20T12:00:00Z' }, { ...base(12, false), edmontonDate: '2026-09-21', eventTime: '2026-09-21T12:00:00Z' }];
  const demoted = deriveMastery(regressed);
  assert.equal(demoted.status, 'developing');
  assert.equal(demoted.needsReview, true);
  assert.equal(demoted.correctCount, 9);
});

test('only a first attempt at an item within a session is independent evidence', () => {
  assert.equal(evidenceEligible({ evidenceType: 'independent_spelling', ordinal: 1, correct: true }), true);
  assert.equal(evidenceEligible({ evidenceType: 'independent_spelling', ordinal: 2, correct: true }), false);
  assert.equal(evidenceEligible({ evidenceType: 'independent_transfer', ordinal: 3, correct: true }), false);
});

test('sentence repair accepts only declared clauses joined by explicitly allowed joins', () => {
  const item = {
    evaluator: 'sentence_repair',
    acceptedAnswers: ['I packed my bag. I forgot my goggles.', 'I packed my bag, but I forgot my goggles.'],
    repairScope: { clauses: ['I packed my bag', 'I forgot my goggles'], allowedJoins: ['period', 'semicolon', 'coordinating'] },
    allowReview: true,
  };
  assert.equal(evaluateItem(item, 'I packed my bag. I forgot my goggles.').status, 'correct');
  assert.equal(evaluateItem(item, 'I packed my bag; I forgot my goggles.').status, 'correct');
  assert.equal(evaluateItem(item, 'I packed my bag; I forgot my goggles.').reason, 'accepted_structural_repair:semicolon');
  assert.equal(evaluateItem(item, 'I packed my bag, so I forgot my goggles.').status, 'correct');
  assert.equal(evaluateItem(item, 'I packed my bag, I forgot my goggles.').status, 'pending', 'comma splice is not accepted');
  assert.equal(evaluateItem(item, 'I packed, my bag I forgot my goggles.').status, 'pending', 'mangled clause boundary is not accepted');
  assert.equal(evaluateItem(item, 'I packed my bag. I forgot.').status, 'pending', 'a period alone never satisfies the check');
  assert.equal(evaluateItem(item, 'I packed my bag; i forgot my goggles.').status, 'pending', 'semicolon join requires the next clause capitalized');
  const strict = { ...item, allowReview: false, repairScope: { clauses: item.repairScope.clauses, allowedJoins: ['period'] } };
  assert.equal(evaluateItem(strict, 'I packed my bag; I forgot my goggles.').status, 'incorrect', 'a join the item does not allow is rejected');
  assert.equal(evaluateItem(strict, 'I packed my bag. I forgot my goggles.').status, 'correct');
});

test('typed C0 sentence items permit review of reasonable unlisted answers while spelling stays exact', async () => {
  const { c0PilotPacks } = await import('../src/data/packs.c0.draft.js');
  const items = c0PilotPacks.flatMap((pack) => pack.items);
  const typedSentences = items.filter((item) => item.responseType === 'text' && item.evaluator === 'punctuation');
  const typedSpelling = items.filter((item) => item.responseType === 'text' && item.evaluator === 'spelling');
  assert.ok(typedSentences.length > 0);
  assert.ok(typedSentences.every((item) => item.allowReview === true));
  assert.ok(typedSpelling.every((item) => !item.allowReview));
  assert.equal(evaluateItem(typedSentences[0], 'A totally different sentence?').status, 'pending');
});

test('a coordinating join never accepts a lower-cased I or declared proper noun', () => {
  const goggles = {
    evaluator: 'sentence_repair',
    acceptedAnswers: ['I packed my bag. I forgot my goggles.'],
    repairScope: { clauses: ['I packed my bag', 'I forgot my goggles'], allowedJoins: ['period', 'semicolon', 'coordinating'] },
    allowReview: true,
  };
  assert.equal(evaluateItem(goggles, 'I packed my bag, and i forgot my goggles.').status, 'pending', 'lower-case i is a spelling error, not a style choice');
  assert.equal(evaluateItem(goggles, 'I packed my bag, and I forgot my goggles.').status, 'correct');
  assert.equal(evaluateItem(goggles, 'I packed my bag. I forgot my goggles.').status, 'correct');

  const proper = {
    evaluator: 'sentence_repair',
    acceptedAnswers: ['The bell rang. Mia closed the folder.'],
    repairScope: { clauses: ['The bell rang', 'Mia closed the folder'], allowedJoins: ['period', 'coordinating'], properNouns: ['Mia'] },
    allowReview: true,
  };
  assert.equal(evaluateItem(proper, 'The bell rang, and mia closed the folder.').status, 'pending', 'a declared proper noun keeps its capital');
  assert.equal(evaluateItem(proper, 'The bell rang, and Mia closed the folder.').status, 'correct');

  const common = {
    evaluator: 'sentence_repair',
    acceptedAnswers: ['The bell rang. The runners returned.'],
    repairScope: { clauses: ['The bell rang', 'The runners returned'], allowedJoins: ['period', 'coordinating'] },
    allowReview: true,
  };
  assert.equal(evaluateItem(common, 'The bell rang, and the runners returned.').status, 'correct', 'an ordinary clause is lower-cased mid-sentence');
  assert.equal(evaluateItem(common, 'The bell rang, and The runners returned.').status, 'pending', 'a mid-sentence capital is not accepted for an ordinary clause');
});

test('progress evidence is summarized by what actually counts toward mastery', async () => {
  const { summarizeSkillEvidence } = await import('../src/learning/mastery.js');
  const attempts = [
    { evidenceType: 'independent_choice', contentStatus: 'released', ordinal: 1 },
    { evidenceType: 'independent_choice', contentStatus: 'released', ordinal: 1, helped: true },
    { evidenceType: 'independent_choice', contentStatus: 'pilot_approved', ordinal: 1 },
    { evidenceType: 'independent_choice', contentStatus: 'not_released', ordinal: 1 },
    { evidenceType: 'self_report', contentStatus: 'released', ordinal: 1 },
  ];
  assert.deepEqual(summarizeSkillEvidence(attempts), { recorded: 5, released: 1, pilot: 1, notCounted: 3 });
  assert.deepEqual(summarizeSkillEvidence([]), { recorded: 0, released: 0, pilot: 0, notCounted: 0 });
  const { readFile } = await import('node:fs/promises');
  const page = await readFile(new URL('../src/pages/ProgressPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /count toward mastery/);
  assert.doesNotMatch(page, /contentStatus !== 'not_reviewed'/, 'the display no longer treats unreleased attempts as eligible');
});

test('each assessment run records its own attempt session so a retake is not a retry', async () => {
  const { readFile } = await import('node:fs/promises');
  const runner = await readFile(new URL('../src/pages/AssessmentRunner.jsx', import.meta.url), 'utf8');
  assert.match(runner, /function newAttemptSessionId\(form\)/);
  assert.match(runner, /attemptSessionId: newAttemptSessionId\(form\)/);
  assert.doesNotMatch(runner, /sessionId: `assessment-\$\{form\}`/, 'attempts no longer share one session per form');
  assert.doesNotMatch(runner, /sessionId=\{`assessment-\$\{form\}`\}/, 'recordings no longer share one session per form');
  assert.match(runner, /setState\(createAssessmentState\(form\)\(\)\)/, 'clearing the preview mints a new attempt session');

  // The ordinal that decides first-attempt eligibility is per session and item, so two runs of the
  // same item under different session IDs are both first attempts.
  const ordinalFor = (priorAttempts, sessionId, itemId) => priorAttempts.filter((entry) => entry.sessionId === sessionId && entry.itemId === itemId && !entry.technicalFailure).length + 1;
  const firstRun = [{ sessionId: 'assessment-A-run1', itemId: 'c0.assessment.a.01' }];
  assert.equal(ordinalFor(firstRun, 'assessment-A-run1', 'c0.assessment.a.01'), 2, 'a repeat inside one run is a retry');
  assert.equal(ordinalFor(firstRun, 'assessment-A-run2', 'c0.assessment.a.01'), 1, 'a retake starts a fresh first attempt');
});

test('reviewed audio may be a labelled model voice, but a human recording is required for phoneme audio', async () => {
  const { validateContent } = await import('../src/learning/contentValidator.js');
  const skills = [{ id: 'a' }];
  const spokenItem = (overrides) => ({
    id: 'i', version: 1, primarySkill: 'a', role: 'independent', difficulty: 1, prompt: 'Listen and type.',
    spokenText: 'adventure', responseType: 'text', evaluator: 'spelling', acceptedAnswers: ['adventure'],
    explanation: 'e', helpSteps: ['h'], evidenceEligibility: 'independent', transferGroup: 't',
    authorStatus: 'reviewed', reviewStatus: 'reviewed', releaseStatus: 'not_released', audioRef: 'aud1', ...overrides,
  });
  const asset = (overrides = {}) => ({ id: 'aud1', version: 1, url: '/audio/adventure.mp3', transcript: 'adventure', locale: 'en-CA', reviewStatus: 'reviewed', kind: 'model_speech', ...overrides });

  // A labelled model voice satisfies a reviewed spoken item.
  assert.deepEqual(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_model' })], audioAssets: [asset()] }).errors, []);
  // Synthetic preview audio still cannot be called reviewed.
  assert.ok(validateContent({ skills, items: [spokenItem({ audioStatus: 'synthetic_preview' })], audioAssets: [asset()] }).errors.some((error) => error.includes('without reviewed audio')));
  // Model speech can never be presented as a human recording.
  assert.ok(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_human' })], audioAssets: [asset()] }).errors.some((error) => error.includes('claims a human recording for a model_speech asset')));
  // Isolated phoneme audio still requires a real recording.
  assert.ok(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_model', requiresHumanAudio: true })], audioAssets: [asset()] }).errors.some((error) => error.includes('requires a human recording')));
  assert.deepEqual(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_human', requiresHumanAudio: true })], audioAssets: [asset({ kind: 'human_recording' })] }).errors, []);
  // A transcript that does not match the spoken text is still rejected, whatever the kind.
  assert.ok(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_model' })], audioAssets: [asset({ transcript: 'different' })] }).errors.some((error) => error.includes('transcript does not match')));
  // A non-Canadian locale still needs a learner-facing disclosure.
  assert.ok(validateContent({ skills, items: [spokenItem({ audioStatus: 'reviewed_model' })], audioAssets: [asset({ locale: 'en-US' })] }).errors.some((error) => error.includes('non-Canadian locale')));
});

test('the audio handoff records the withdrawn requirement instead of silently dropping it', async () => {
  const { readFile } = await import('node:fs/promises');
  const doc = await readFile(new URL('../docs/AUDIO_REVIEW_HANDOFF.md', import.meta.url), 'utf8');
  assert.match(doc, /withdrawn and replaced/);
  assert.match(doc, /CHG-07/);
  assert.match(doc, /human recording is required only where the item sets `requiresHumanAudio`/);
  assert.doesNotMatch(doc, /24 reviewed human-audio and 16 specialist/);
  const tracker = await readFile(new URL('../src/data/r2GateTracker.js', import.meta.url), 'utf8');
  assert.doesNotMatch(tracker, /24 reviewed recordings and 16 specialist checks/);
});
