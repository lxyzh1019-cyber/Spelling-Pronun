// The coverage report: what Alberta asks for against what this app can tell the parent.
//
// The rules that matter here are about what the report must NOT do — produce a percentage, call a
// human-judged outcome a gap, or let an unchecked mapping read as an alignment claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { COVERAGE_STATES, buildCoverageReport, buildableGaps, coverageHeadline, draftedGaps, outcomeState } from '../src/learning/curriculumCoverage.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import mapping from '../src/data/curriculum.alberta.elal.json' with { type: 'json' };

const secure = { status: 'secure', needsReview: false };

test('each outcome resolves to one of the four states, from its mapping and the evidence', () => {
  const covered = { coverage: 'covered', skillIds: ['SP.patterns'] };
  assert.equal(outcomeState(covered, new Map()), 'needs_more_evidence', 'no evidence cannot read as checked');
  assert.equal(outcomeState(covered, new Map([['SP.patterns', secure]])), 'checked');
  // A skill back in review is not settled evidence, whatever its status says.
  assert.equal(outcomeState(covered, new Map([['SP.patterns', { status: 'secure', needsReview: true }]])), 'needs_more_evidence');
  assert.equal(outcomeState(covered, new Map([['SP.patterns', { status: 'developing' }]])), 'needs_more_evidence');
  // A partial outcome can never read as checked: part of it is not built, so the evidence for the
  // built half cannot speak for the whole.
  assert.equal(outcomeState({ coverage: 'partial', skillIds: ['SP.patterns'] }, new Map([['SP.patterns', secure]])), 'needs_more_evidence');
  assert.equal(outcomeState({ coverage: 'not_built', skillIds: [] }, new Map()), 'not_built');
  assert.equal(outcomeState({ coverage: 'not_measurable', skillIds: [] }, new Map()), 'needs_parent');
});

test('the report covers every outcome in the mapping exactly once', () => {
  const report = buildCoverageReport(mapping);
  const mapped = mapping.organizingIdeas.flatMap((idea) => Object.values(idea.grades).flatMap((grade) => grade.skillsAndProcedures));
  assert.equal(report.total, mapped.length);
  const reported = report.ideas.flatMap((idea) => idea.grades.flatMap((grade) => grade.outcomes));
  assert.equal(reported.length, mapped.length);
  assert.equal(new Set(reported.map((outcome) => outcome.id)).size, mapped.length, 'an outcome is reported twice');
  // Every tally adds up to the outcomes it describes, at both levels.
  const sum = (tally) => COVERAGE_STATES.reduce((total, state) => total + tally[state], 0);
  assert.equal(sum(report.tally), report.total);
  for (const idea of report.ideas) {
    assert.equal(sum(idea.tally), idea.total);
    for (const grade of idea.grades) assert.equal(sum(grade.tally), grade.outcomes.length);
  }
});

// The outcome carries the curriculum's own sentence, not a label. A parent reading "not built" has to
// be able to see what is not built, in Alberta's words rather than Claude's paraphrase.
test('every reported outcome carries the curriculum text and its reason', () => {
  const report = buildCoverageReport(mapping);
  for (const idea of report.ideas) {
    assert.ok(idea.statement.length > 40, `${idea.name} lost its organizing-idea statement`);
    for (const grade of idea.grades) {
      assert.match(grade.grade, /^Grade \d$/);
      assert.ok(grade.guidingQuestion.endsWith('?'), `${idea.name} ${grade.grade} lost its guiding question`);
      for (const outcome of grade.outcomes) {
        assert.ok(COVERAGE_STATES.includes(outcome.state));
        assert.ok(outcome.text.length > 15, `${outcome.id} lost its curriculum text`);
        assert.ok(outcome.note.length > 20, `${outcome.id} lost the reason for its state`);
      }
    }
  }
});

// The honesty gate. `mappingReviewedBy` is null until a person checks the coverage decisions, and
// until then the report has to say so in its own words rather than leaving the caller to remember.
test('an unchecked mapping cannot read as an alignment claim', () => {
  const report = buildCoverageReport(mapping);
  assert.equal(report.verified, Boolean(mapping.mappingReviewedBy));
  if (!mapping.mappingReviewedBy) {
    assert.equal(report.verified, false);
    assert.match(report.verificationNote, /Nobody has checked|not a statement that the app covers/i);
  }
  const verified = buildCoverageReport({ ...mapping, mappingReviewedBy: 'parent' });
  assert.equal(verified.verified, true);
  assert.match(verified.verificationNote, /parent/);
});

// No percentage, anywhere. 9 of 214 rendered as 4% reads as a small shortfall rather than as what it
// is, and a single number invites being read as a grade for the child rather than for the app.
test('the report states counts and never a percentage', () => {
  const report = buildCoverageReport(mapping, { masteryBySkill: new Map([['SP.patterns', secure]]) });
  const headline = coverageHeadline(report);
  const serialised = JSON.stringify({ report, headline });
  assert.doesNotMatch(serialised, /%/, 'the report contains a percentage');
  assert.doesNotMatch(serialised, /\bpercent\b/i, 'the report contains a percentage');
  assert.doesNotMatch(serialised, /\bscore\b/i, 'the report reads as a score');
  // The headline separates what is measured from what needs a person, because calling the second a
  // gap would imply an app could close it.
  assert.equal(headline.total, report.total);
  assert.equal(headline.measured, report.tally.checked + report.tally.needs_more_evidence);
  assert.match(headline.summary, /yours to mark/);
  assert.doesNotMatch(headline.summary, /fail|behind|below|gap in their/i);
});

// What the parent should build next, grouped so the decision is "build comprehension" rather than a
// list of 108 individual sentences.
test('the buildable gaps are the machine-scorable ones, biggest first', () => {
  const report = buildCoverageReport(mapping);
  const gaps = buildableGaps(report);
  assert.ok(gaps.length > 0);
  for (let i = 1; i < gaps.length; i += 1) assert.ok(gaps[i - 1].count >= gaps[i].count, 'gaps are not ordered by size');
  for (const gap of gaps) {
    assert.equal(gap.count, gap.outcomes.length);
    for (const outcome of gap.outcomes) {
      assert.equal(outcome.state, 'not_built');
      assert.match(outcome.grade, /^Grade \d$/, 'a gap does not say which grade it belongs to');
    }
  }
  // Nothing the parent marks is ever offered as something for the app to build.
  const total = gaps.reduce((sum, gap) => sum + gap.count, 0);
  assert.equal(total, report.tally.not_built);
  assert.ok(!gaps.some((gap) => gap.outcomes.some((outcome) => outcome.state === 'needs_parent')));
});

// Against the real mapping: the numbers a parent would read today.
test('the real mapping reports what the app actually measures', () => {
  const report = buildCoverageReport(mapping);
  const headline = coverageHeadline(report);
  assert.equal(headline.total, 214);
  // Nothing is checked, because no child has produced evidence on any of it yet.
  assert.equal(headline.checked, 0);
  assert.ok(headline.measured > 0 && headline.measured < 20, `the app measures ${headline.measured} outcomes`);
  assert.ok(headline.notBuilt > 100, 'the buildable gap has been understated');
  assert.ok(headline.needsParent > 80, 'the parent-marked outcomes have been understated');
  const conventions = report.ideas.find((idea) => idea.name === 'Conventions');
  assert.equal(conventions.tally.needs_more_evidence, headline.measured, 'everything the app measures is in Conventions');
});

// Content written but not approved. The outcome stays `not_built`, because a draft pack has not been
// challenged, reviewed, integrated or approved and no child can meet it — reporting it as measured
// would claim a measurement nobody can take. What changes is what the row can say.
test('drafted content is reported as written, not as measured', () => {
  const report = buildCoverageReport(mapping);
  const drafted = draftedGaps(report);
  assert.ok(drafted.length > 0, 'no outcome records the content drafted for it');
  for (const outcome of drafted) {
    assert.equal(outcome.state, 'not_built', `${outcome.id} claims to be measured by draft content`);
    assert.ok(outcome.draftedIn.length > 0, `${outcome.id} says it is drafted but names no pack`);
    assert.ok(outcome.idea && outcome.grade, `${outcome.id} does not say where it belongs`);
  }
  // A drafted outcome is still a gap until the parent approves it, so it stays in the build list.
  const buildable = buildableGaps(report).flatMap((gap) => gap.outcomes.map((outcome) => outcome.id));
  for (const outcome of drafted) assert.ok(buildable.includes(outcome.id), `${outcome.id} left the gap list before anyone approved it`);
  // And the pack it names has to exist.
  const packIds = new Set(c1Packs.map((pack) => pack.id));
  for (const outcome of drafted) {
    for (const packId of outcome.draftedIn) assert.ok(packIds.has(packId), `${outcome.id} names unknown pack ${packId}`);
  }
});
