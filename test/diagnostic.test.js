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

// The form is 48 questions long and a child can stop anywhere. A report that did not say how much
// of it was answered would read the same after nine questions as after forty-eight.
test('the report counts the questions and the answers it actually has', () => {
  const nine = diagnosticItems.slice(0, 9).map((item) => ({ itemId: item.id, correct: true }));
  const report = buildDiagnosticReport(diagnosticForm, nine, { ladder });
  assert.equal(report.itemCount, diagnosticItems.length);
  assert.equal(report.itemCount, 48);
  assert.equal(report.answeredCount, 9);
  // The same rule the skill counts use: a retry is not a second answer.
  const withRetry = buildDiagnosticReport(diagnosticForm, [...nine, { itemId: diagnosticItems[0].id, correct: false }], { ladder });
  assert.equal(withRetry.answeredCount, 9, 'a retry was counted as another answer');
  assert.equal(buildDiagnosticReport(diagnosticForm, [], { ladder }).answeredCount, 0);
  assert.equal(buildDiagnosticReport(diagnosticForm, [], { ladder }).itemCount, 48);
});

// "Needs building" says what to teach; the choice the child actually made says where the idea went
// wrong. Both come from the item, never from a guess about the child.
test('a located wrong answer carries the choice the child actually made', () => {
  const item = diagnosticItems.find((row) => row.skillId === 'PU.apostrophes');
  const wrongChoice = item.choices.find((choice) => choice.id !== item.acceptedAnswers[0]);
  const rightItem = diagnosticItems.find((row) => row.skillId === 'SE.complete');
  const report = buildDiagnosticReport(diagnosticForm, [
    { itemId: item.id, choiceId: wrongChoice.id, correct: false },
    { itemId: rightItem.id, choiceId: rightItem.acceptedAnswers[0], correct: true },
  ], { ladder });
  const located = report.skills.find((skill) => skill.skillId === item.skillId).locates;
  assert.equal(located.length, 1);
  assert.equal(located[0].chose, wrongChoice.text);
  assert.deepEqual(report.skills.find((skill) => skill.skillId === rightItem.skillId).locates, [], 'a right answer located something');
  // An answer recorded before the choice was kept still reports, and never invents one.
  const older = buildDiagnosticReport(diagnosticForm, [{ itemId: item.id, correct: false }], { ladder });
  assert.equal(older.skills.find((skill) => skill.skillId === item.skillId).locates[0].chose, undefined);
});

// The lead a parent reads first, and the one place a part-way run could be mistaken for a finished
// one — which is the whole reason the count is in it.
test('the summary line states how much was answered and what needs building', async () => {
  const { diagnosticSummaryLine } = await import('../src/learning/diagnosticReport.js');
  const scattered = new Set(['PU.apostrophes', 'SP.confusables', 'PH.vowels']);
  const full = buildDiagnosticReport(diagnosticForm, diagnosticItems.map((item) => ({ itemId: item.id, correct: !scattered.has(item.skillId) })), { ladder });
  const summary = diagnosticSummaryLine(full);
  assert.match(summary, /48 of 48 answered/);
  for (const skillId of scattered) assert.ok(summary.includes(skillId), `${skillId} is missing from the summary`);
  assert.doesNotMatch(summary, /%|percent|score|behind|failed|weak/i, 'the summary judges the child');

  const nine = buildDiagnosticReport(diagnosticForm, diagnosticItems.slice(0, 9).map((item) => ({ itemId: item.id, correct: false })), { ladder });
  const partial = diagnosticSummaryLine(nine);
  assert.match(partial, /9 of 48 answered/);
  assert.match(partial, /part-way/, 'a nine-question run did not say it was part-way through');
  assert.doesNotMatch(partial, /finished|all done|whole form is answered/i, 'a nine-question run read as a finished one');
  assert.equal(diagnosticSummaryLine(null), '');
});

// The item bank's own English is not the report's voice. One question locates "comparison (than)
// from sequence (then)" and a Grade 3 sentence choice is about a path "behind the school": both are
// content being quoted back, on a located-item line. The wording guards below therefore run over
// everything the report itself wrote — every line that is not a located item — while the
// no-arithmetic guard runs over the whole document, because a total would be the report's own doing
// wherever it appeared.
const reportsOwnWords = (markdown) => markdown.split('\n').filter((line) => !line.startsWith('- (')).join('\n');

// One document for every child who has answered, because the alternative was switching profiles and
// exporting one at a time. Listing children together is exactly where a ranking would creep in, so
// the guard that matters here is the one that says there is no arithmetic across children at all.
test('the combined report gives every child their own section and never compares them', async () => {
  const { combinedDiagnosticReportMarkdown } = await import('../src/learning/diagnosticReport.js');
  // Jenn stopped after nine and got them all wrong, including the sentence question whose own
  // choices contain the word "behind"; Jess answered all forty-eight and got all but one skill right.
  const jennItems = diagnosticItems.slice(0, 9);
  const jenn = buildDiagnosticReport(diagnosticForm, jennItems.map((item) => ({
    itemId: item.id,
    choiceId: item.choices.find((choice) => choice.id !== item.acceptedAnswers[0]).id,
    correct: false,
  })), { ladder });
  const jess = buildDiagnosticReport(diagnosticForm, diagnosticItems.map((item) => ({
    itemId: item.id,
    choiceId: item.acceptedAnswers[0],
    correct: item.skillId !== 'SP.confusables',
  })), { ladder });
  const entries = [{ learnerName: 'Jenn', report: jenn }, { learnerName: 'Jess', report: jess }];
  const markdown = combinedDiagnosticReportMarkdown(entries, { today: '2026-09-28' });

  // Both children, each with their own complete section and their own count.
  assert.ok(markdown.includes('what it found for Jenn'), 'Jenn has no section');
  assert.ok(markdown.includes('what it found for Jess'), 'Jess has no section');
  assert.match(markdown, /9 of 48 answered/);
  assert.match(markdown, /48 of 48 answered/);
  assert.ok(markdown.includes(jenn.separateAppQuestion.detail), "Jenn's own reading is missing");
  assert.ok(markdown.includes(jess.separateAppQuestion.detail), "Jess's own reading is missing");
  assert.match(markdown, /Exported 2026-09-28/);

  // Profile order, never result order: Jess answered more and got more right, and still comes second.
  assert.ok(markdown.indexOf('for Jenn') < markdown.indexOf('for Jess'), 'the children were reordered by result');
  const reversed = combinedDiagnosticReportMarkdown([entries[1], entries[0]], { today: '2026-09-28' });
  assert.ok(reversed.indexOf('for Jess') < reversed.indexOf('for Jenn'), 'the order does not follow the profile list');

  // No ranking, and no arithmetic across children: 9 + 48 and 48 + 48 appear nowhere.
  assert.doesNotMatch(reportsOwnWords(markdown), /rank|compared|comparison|better|worse|ahead of|stronger|weaker|highest|lowest|between the children|across the children|altogether/i, 'the combined report compares the children');
  assert.doesNotMatch(markdown, /\b57\b|\b96\b/, 'the combined report totals the children');
  assert.doesNotMatch(reportsOwnWords(markdown), /total/i, 'the combined report totals something');
  assert.equal(combinedDiagnosticReportMarkdown([], { today: '2026-09-28' }), '');
});

// The wording rule, carried into the combined document. "behind" survives in one place only: on a
// located-item line, inside the quotation of the choice the child picked, where it is the question's
// own English — a Grade 3 sentence about a path behind a school — and not a verdict about anybody.
test('the combined report still carries the mastery note and passes no verdict on any child', async () => {
  const { combinedDiagnosticReportMarkdown } = await import('../src/learning/diagnosticReport.js');
  const wrongEverything = (item) => ({
    itemId: item.id,
    choiceId: item.choices.find((choice) => choice.id !== item.acceptedAnswers[0]).id,
    correct: false,
  });
  const report = buildDiagnosticReport(diagnosticForm, diagnosticItems.map(wrongEverything), { ladder });
  const markdown = combinedDiagnosticReportMarkdown([
    { learnerName: 'Jenn', report },
    { learnerName: 'Jess', report },
  ], { today: '2026-09-28' });
  assert.ok(markdown.includes(report.masteryNote), 'the combined report dropped the mastery note');
  assert.ok(markdown.includes('chose "Running along the wet path behind the school."'), 'the fixture never exercised the quoted-choice case');
  assert.doesNotMatch(reportsOwnWords(markdown), /%|percent|score|behind|failed|weak/i, 'the combined export judges a child');
});

test('source guard: both diagnostic surfaces export every child through the one shared component', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');
  const share = await read('../src/components/DiagnosticShare.jsx');
  assert.match(share, /combinedDiagnosticReportMarkdown\(/);
  assert.match(share, /readOnly/);
  assert.match(share, />Share</);
  assert.match(share, />Save as a file</);
  assert.match(share, />Print or save as PDF</);
  // The status line says what actually happened, so it reads `via` rather than assuming success.
  assert.match(share, /\.via/);
  assert.match(share, /was blocked/);

  // One implementation, both surfaces — and neither keeps a copy button or a switch-profiles
  // instruction of its own, because neither is true any more.
  for (const page of ['../src/pages/ParentPage.jsx', '../src/pages/DiagnosticPage.jsx']) {
    const source = await read(page);
    assert.match(source, /<DiagnosticShare/, `${page} does not render the shared export component`);
    assert.doesNotMatch(source, /Copy the report/, `${page} still has a copy button of its own`);
    assert.doesNotMatch(source, /Switch profiles to export/, `${page} still tells the parent to switch profiles`);
  }
  // The parent page keeps its own on-screen report, which IS about the learner selected there.
  const parent = await read('../src/pages/ParentPage.jsx');
  assert.match(parent, /currently selected/);
  assert.match(parent, /buildDiagnosticReport\(/);
});
