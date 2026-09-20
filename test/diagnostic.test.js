// The below-grade diagnostic, and the question it exists to answer.
//
// The parent asked to test the knowledge points from before Grade 5 and let the evidence say whether
// a separate catch-up app is needed. These tests hold the two things that would make that answer
// worthless: a diagnostic that quietly became mastery evidence, and a report that judged the child
// instead of describing the content.
import test from 'node:test';
import assert from 'node:assert/strict';
import ladder from '../src/data/curriculum.ladder.json' with { type: 'json' };
import { diagnosticForm, diagnosticItems } from '../src/data/diagnostic.k4.draft.js';
import { buildDiagnosticReport, separateAppReading, stateFor } from '../src/learning/diagnosticReport.js';
import { deriveMastery } from '../src/learning/mastery.js';
import { EVIDENCE_TRACKS } from '../src/learning/pilotApproval.js';

const below = ladder.skills.filter((skill) => skill.endsBeforeGrade5);

test('the form covers every skill Alberta finishes with before Grade 5, three questions each', () => {
  const covered = new Set(diagnosticItems.map((item) => item.skillId));
  for (const skill of below) assert.ok(covered.has(skill.skillId), `${skill.skillId} is not diagnosed`);
  assert.equal(covered.size, below.length, 'the form diagnoses a skill that is not below grade');
  const counts = new Map();
  for (const item of diagnosticItems) counts.set(item.skillId, (counts.get(item.skillId) || 0) + 1);
  for (const [skillId, count] of counts) assert.equal(count, 3, `${skillId} has ${count} questions`);
  assert.equal(diagnosticItems.length, below.length * 3);
});

// A row that claimed to probe Grade 2 while asking something Alberta states at Grade 6 would make the
// whole report meaningless, and nothing else would catch it.
test('every question probes a grade its own skill is actually taught at', () => {
  const ORDER = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const rungs = new Map(ladder.skills.map((skill) => [skill.skillId, skill]));
  for (const item of diagnosticItems) {
    const rung = rungs.get(item.skillId);
    assert.ok(rung, `${item.id} probes ${item.skillId}, which is not on the ladder`);
    const probed = ORDER.indexOf(item.probesGrade);
    assert.ok(probed >= 0, `${item.id} probes ${item.probesGrade}, which is not a grade`);
    assert.ok(probed >= ORDER.indexOf(rung.introducedAt), `${item.id} probes before Alberta introduces ${item.skillId}`);
    assert.ok(probed <= ORDER.indexOf(rung.consolidatedAt), `${item.id} probes after Alberta finishes with ${item.skillId}`);
    assert.ok(probed < ORDER.indexOf('Grade 5'), `${item.id} is not a below-grade question`);
  }
});

// The shape of a question decides whether it measures anything. A repeated choice, or an answer that
// is not among the choices, is a question that cannot be got right or cannot be got wrong.
test('every question is answerable and has one answer among four distinct choices', () => {
  const ids = new Set();
  for (const item of diagnosticItems) {
    assert.ok(!ids.has(item.id), `${item.id} appears twice`);
    ids.add(item.id);
    assert.equal(item.choices.length, 4, `${item.id} does not offer four choices`);
    assert.equal(new Set(item.choices.map((choice) => choice.id)).size, 4, `${item.id} repeats a choice id`);
    assert.equal(new Set(item.choices.map((choice) => choice.text)).size, 4, `${item.id} repeats a choice`);
    assert.ok(item.choices.some((choice) => choice.id === item.acceptedAnswers[0]), `${item.id}'s answer is not one of its choices`);
    assert.ok(item.prompt.length > 15, `${item.id} has no real prompt`);
    // What a wrong answer points at. Without it the report can say a skill needs building but not
    // what to build, which is the output the whole exercise is for.
    assert.ok(item.locates && item.locates.length > 15, `${item.id} says nothing about what it locates`);
  }
});

// The rule that must not weaken. A diagnostic that became evidence would let unreleased, unreviewed
// content set a child's mastery — the exact thing the lifecycle exists to stop.
test('no diagnostic answer can ever count as mastery evidence', () => {
  assert.equal(diagnosticForm.producesMasteryEvidence, false);
  assert.deepEqual(diagnosticForm.curriculumOutcomeIds, []);
  for (const item of diagnosticItems) {
    assert.equal(item.releaseStatus, 'not_released', `${item.id} claims a release status`);
    assert.equal(item.role, 'diagnostic', `${item.id} claims a lesson role`);
  }
  assert.equal(buildDiagnosticReport(diagnosticForm, []).producesMasteryEvidence, false);

  // Run the real derivation, not a restatement of it. Attempts built from this content are otherwise
  // perfect — independent, first, unhelped, unrevealed — and are still ignored by BOTH evidence
  // tracks, because the content status is what keeps them out. The control below proves the fixture
  // would have counted if the content were released, so this is not passing for a malformed attempt.
  const attemptFrom = (item, contentStatus) => ({
    itemId: item.id,
    skillId: item.skillId,
    contentStatus,
    evidenceType: 'independent_choice',
    ordinal: 1,
    correct: true,
    helped: false,
    revealed: false,
    status: 'scored',
    technicalFailure: false,
    sessionId: 'd1',
    eventTime: '2026-09-19T10:00:00.000Z',
  });
  const rows = diagnosticItems.filter((item) => item.skillId === 'PU.apostrophes');
  // Mutation-checked: change item.releaseStatus to 'released' in the loop below and this test fails.
  for (const track of Object.values(EVIDENCE_TRACKS)) {
    const derived = deriveMastery(rows.map((item) => attemptFrom(item, item.releaseStatus)), { track });
    assert.equal(derived.eligibleCount, 0, `diagnostic answers became ${track} evidence`);
    assert.equal(derived.status, 'unassessed');
  }
  // The control. Identical attempts on released content DO count, so the assertions above are about
  // the content status and not about a fixture that could never have counted in the first place.
  const control = deriveMastery(rows.map((item) => attemptFrom(item, 'released')), { track: EVIDENCE_TRACKS.RELEASED });
  assert.equal(control.eligibleCount, rows.length, 'the control never counted either, so the test above proves nothing');
});

test('three questions are read as three questions, never as a proportion', () => {
  assert.equal(stateFor({ answered: 0, correct: 0 }), 'not_enough_evidence');
  assert.equal(stateFor({ answered: 1, correct: 1 }), 'not_enough_evidence', 'one answer decided a skill');
  assert.equal(stateFor({ answered: 3, correct: 3 }), 'solid');
  assert.equal(stateFor({ answered: 3, correct: 2 }), 'partly_solid', 'one slip out of three was called a gap');
  assert.equal(stateFor({ answered: 3, correct: 1 }), 'needs_building');
  assert.equal(stateFor({ answered: 3, correct: 0 }), 'needs_building');
  assert.equal(stateFor({ answered: 2, correct: 2 }), 'solid');
});

// Only the first answer counts. A second look at a question whose answer has just been seen measures
// memory of this sitting, and the app never overwrites a first answer anywhere else either.
test('a retry never replaces a first answer', () => {
  const item = diagnosticItems[0];
  const report = buildDiagnosticReport(diagnosticForm, [
    { itemId: item.id, correct: false },
    { itemId: item.id, correct: true },
  ]);
  const skill = report.skills.find((entry) => entry.skillId === item.skillId);
  assert.equal(skill.answered, 1);
  assert.equal(skill.correct, 0, 'a retry overwrote a first answer');
  assert.equal(skill.locates.length, 1, 'the wrong first answer stopped pointing at anything');
});

test('a wrong answer says what to build, not just that something is wrong', () => {
  const wrong = diagnosticItems.filter((item) => item.skillId === 'PU.apostrophes');
  const report = buildDiagnosticReport(diagnosticForm, wrong.map((item) => ({ itemId: item.id, correct: false })), { ladder });
  const skill = report.skills.find((entry) => entry.skillId === 'PU.apostrophes');
  assert.equal(skill.state, 'needs_building');
  assert.equal(skill.locates.length, 3);
  for (const located of skill.locates) assert.ok(located.locates.length > 15);
  // And it names the grade Alberta stops teaching it, which is why the gap matters.
  assert.equal(skill.albertaFinishesAt, 'Grade 4');
});

// The question the parent asked. It is answered from the shape of the gap, and it refuses to answer
// at all before enough of the form is done — a scattered gap and a wholesale one look identical when
// three skills have been tried.
test('the separate-app question is answered from the shape of the gap, or not at all', () => {
  const answerAll = (correct) => diagnosticItems.map((item) => ({ itemId: item.id, correct: correct(item) }));
  // Half the form untouched: no answer yet, whatever the answered half looks like.
  const partial = buildDiagnosticReport(diagnosticForm, answerAll(() => false).slice(0, 9), { ladder });
  assert.equal(partial.separateAppQuestion.answer, 'not_enough_evidence');
  // Everything right: no gap to catch up on.
  assert.equal(buildDiagnosticReport(diagnosticForm, answerAll(() => true), { ladder }).separateAppQuestion.answer, 'no_gap_found');
  // A scattered gap — three of sixteen skills. Packs here, not a second app.
  const scattered = new Set(['PU.apostrophes', 'SP.confusables', 'PH.vowels']);
  const few = buildDiagnosticReport(diagnosticForm, answerAll((item) => !scattered.has(item.skillId)), { ladder });
  assert.equal(few.separateAppQuestion.answer, 'build_packs_here');
  assert.deepEqual(few.separateAppQuestion.needing.sort(), [...scattered].sort());
  assert.equal(few.counts.solid, 13);
  assert.equal(few.counts.needs_building, 3);
  // Most of the form: a different situation, and it says to talk before building rather than
  // deciding on its own.
  const most = buildDiagnosticReport(diagnosticForm, answerAll((item) => item.skillId === 'PH.syllables'), { ladder });
  assert.equal(most.separateAppQuestion.answer, 'reconsider_scope');
  assert.ok(most.separateAppQuestion.needing.length > 8);
});

// The report describes content, not the child. "62% correct" or "behind on punctuation" would turn a
// locator into a verdict, which is the one thing it must not become.
test('the report states no proportion and passes no verdict on the child', () => {
  const report = buildDiagnosticReport(diagnosticForm, diagnosticItems.map((item) => ({ itemId: item.id, correct: false })), { ladder });
  const text = JSON.stringify(report);
  assert.doesNotMatch(text, /%|percent|score|behind|failed|weak/i, 'the report judges the child');
  assert.equal(separateAppReading([], 16, []).answer, 'not_enough_evidence');
  for (const skill of report.skills) {
    assert.ok(['solid', 'needs_building', 'partly_solid', 'not_enough_evidence'].includes(skill.state));
  }
});

// The answers live only in the browser that recorded them. The markdown is the one way they reach
// the next conversation, so it carries the same wording rule as the report and says who it is for.
test('the markdown export states no proportion and passes no verdict, and names the learner, form and date', async () => {
  const { diagnosticReportMarkdown } = await import('../src/learning/diagnosticReport.js');
  const attempts = diagnosticItems.map((item, index) => ({ itemId: item.id, correct: index % 5 !== 0 }));
  const report = buildDiagnosticReport(diagnosticForm, attempts, { ladder });
  const markdown = diagnosticReportMarkdown(report, { learnerName: 'Jenn', today: '2026-09-20' });
  assert.doesNotMatch(markdown, /%|percent|score|behind|failed|weak/i, 'the export judges the child');
  assert.match(markdown, /what it found for Jenn/);
  assert.match(markdown, new RegExp(diagnosticForm.id.replace(/\./g, '\\.')));
  assert.match(markdown, /Exported 2026-09-20/);
  assert.ok(markdown.includes(report.masteryNote));
  assert.ok(markdown.includes(report.separateAppQuestion.detail));
  for (const skill of report.skills) {
    assert.ok(markdown.includes(`### ${skill.skillId}`), `${skill.skillId} is missing from the export`);
    for (const located of skill.locates) assert.ok(markdown.includes(located.locates), 'a located gap is missing');
  }
  const withGrade = report.skills.find((skill) => skill.albertaFinishesAt);
  assert.ok(withGrade, 'no skill carries a grade, so the test cannot check it');
  assert.match(markdown, new RegExp(`Alberta finishes with this at ${withGrade.albertaFinishesAt}`));
  assert.match(markdown, /selected on the parent page/);
  assert.equal(diagnosticReportMarkdown(null), '');
});

test('source guard: the parent page exports the diagnostic report for the selected learner and the finish card says so', async () => {
  const { readFile } = await import('node:fs/promises');
  const parent = await readFile(new URL('../src/pages/ParentPage.jsx', import.meta.url), 'utf8');
  assert.match(parent, /diagnosticReportMarkdown\(/);
  assert.match(parent, /Copy the report/);
  assert.match(parent, /readOnly/);
  assert.match(parent, /currently selected/);
  const page = await readFile(new URL('../src/pages/DiagnosticPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /selected learner/);
});
