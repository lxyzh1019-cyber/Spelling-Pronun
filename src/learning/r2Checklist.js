// Rules for the R2 (M3) checklist: what counts as done, what holds the exit check back, and the
// file the parent sends back.
//
// The one rule that matters: reaching the end of this list tells the parent she may decide R2 is
// complete. It does not decide it. Nothing here returns a gate state, a "ready" or a "released"
// field, and nothing here is read by any gate, mastery or release path.

import { checkProgress } from './humanChecks.js';

export const SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const DECISIONS = ['open', 'fix', 'fixed', 'accept', 'quarantine'];
const SERIOUS = ['critical', 'high'];
// Master plan §12: Critical and High "both block the affected release". Deciding to fix one is not
// the same as having fixed it, so only these decisions let a Critical or High problem stop blocking.
const RESOLVING = ['fixed', 'accept', 'quarantine'];

export const CHECKLIST_COMPLETE_MESSAGE = 'Everything on this list is done — you can decide R2 is complete.';

export function severityLabel(value) {
  return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[value] || 'Not set';
}

export function decisionLabel(value) {
  return { open: 'Open', fix: 'Fix', fixed: 'Fixed and checked', accept: 'Accept', quarantine: 'Quarantine' }[value] || 'Open';
}

// The key a tick is stored under: one per item, or one per item per child.
export function tickKey(item, learnerId = '') {
  return item.perLearner ? `${item.id}:${learnerId}` : item.id;
}

// "Test Lab: 3 passed, 1 problem" for the Test Lab checks a setup item points at.
export function testLabLine(checkIds = [], checks = [], results = {}) {
  const counts = { pass: 0, problem: 0, unclear: 0 };
  checks.filter((check) => checkIds.includes(check.id)).forEach((check) => {
    const progress = checkProgress(check, results);
    counts.pass += progress.counts.pass;
    counts.problem += progress.counts.problem;
    counts.unclear += progress.counts.unclear;
  });
  const parts = [];
  if (counts.pass) parts.push(`${counts.pass} passed`);
  if (counts.problem) parts.push(`${counts.problem} problem${counts.problem === 1 ? '' : 's'}`);
  if (counts.unclear) parts.push(`${counts.unclear} not sure`);
  return `Test Lab: ${parts.length ? parts.join(', ') : 'nothing recorded yet'}`;
}

// A Critical or High problem that is not yet resolved (decision open or fix) keeps the whole exit
// check unticked. Medium and Low never do. Any problem without a severity, or still open, means
// "every problem has a severity and a decision" is not true yet.
export function problemBlocks(problems = []) {
  const seriousOpen = problems.filter((problem) => SERIOUS.includes(problem.severity) && !RESOLVING.includes(problem.decision)).length;
  const undecided = problems.filter((problem) => !SEVERITIES.includes(problem.severity) || !DECISIONS.includes(problem.decision) || problem.decision === 'open').length;
  return { seriousOpen, undecided };
}

function appDone(item, row) {
  if (!row) return false;
  if (item.id === 'pilot.visits') return row.visitsMet;
  if (item.id === 'pilot.review') return row.review.found;
  if (item.id === 'pilot.baseline') return row.baseline.done;
  return false;
}

function blockedReasonFor(item, blocks) {
  if (item.group !== 'exit') return '';
  if (blocks.seriousOpen) {
    return `${blocks.seriousOpen} Critical or High problem${blocks.seriousOpen === 1 ? ' is' : 's are'} not resolved yet (fixed and checked, accepted or quarantined), so the exit check stays unticked.`;
  }
  if (item.requiresDecisions && blocks.undecided) {
    return `${blocks.undecided} problem${blocks.undecided === 1 ? ' still needs' : 's still need'} a severity and a decision.`;
  }
  return '';
}

// The stored exit ticks a problem is holding back. The page clears these rather than keeping them,
// so a tick given before a problem was found never comes back by itself once the problem is decided:
// the parent has to tick the row again, knowing about the problem.
export function heldExitTickKeys(items = [], state = {}) {
  const blocks = problemBlocks(state.problems || []);
  return items
    .filter((item) => item.group === 'exit' && item.source === 'parent' && !item.perLearner)
    .filter((item) => state.ticks?.[item.id] && blockedReasonFor(item, blocks))
    .map((item) => item.id);
}

// One row per item (per child for per-child items), and "N of M done". `checks` and
// `checkResults` are the Test Lab checks and their log, so a setup row can show its Test Lab result.
export function checklistProgress({ items = [], learners = [], state = {}, exposure = [], checks = [], checkResults = {} } = {}) {
  const ticks = state.ticks || {};
  const blocks = problemBlocks(state.problems || []);
  const rows = items.flatMap((item) => {
    const targets = item.perLearner ? learners.map((learner) => learner.id) : [''];
    return targets.map((learnerId) => {
      const key = tickKey(item, learnerId);
      if (item.source === 'app') {
        const row = exposure.find((entry) => entry.learnerId === learnerId);
        return { key, item, learnerId, done: appDone(item, row), ticked: false, note: '', blockedReason: '' };
      }
      const tick = ticks[key];
      const blockedReason = blockedReasonFor(item, blocks);
      return {
        key,
        item,
        learnerId,
        ticked: Boolean(tick?.done),
        done: Boolean(tick?.done) && !blockedReason,
        note: tick?.note || '',
        blockedReason,
        testLab: item.testLabChecks ? testLabLine(item.testLabChecks, checks, checkResults) : '',
      };
    });
  });
  const done = rows.filter((row) => row.done).length;
  return { rows, done, total: rows.length, complete: rows.length > 0 && done === rows.length, blocks };
}

export function r2ChecklistFilename(today = '') {
  return `r2-checklist-${today || new Date().toISOString().slice(0, 10)}.md`;
}

const clean = (value) => String(value ?? '').replace(/\|/g, '/').replace(/\n/g, ' ').trim();

function visitsText(row) {
  if (!row) return '—';
  const range = row.firstDay ? ` (${row.firstDay === row.latestDay ? row.firstDay : `${row.firstDay} to ${row.latestDay}`})` : '';
  return `${row.visitsMet ? 'Done' : 'Not yet'}: ${Math.min(row.days, row.daysTarget)} of ${row.daysTarget} days${row.days > row.daysTarget ? `, ${row.days} in all` : ''}${range}`;
}

export function reviewText(row) {
  if (!row) return '—';
  if (row.review.found) {
    const what = row.review.skill || `item ${row.review.itemId}`;
    return `Done: ${what}, first ${row.review.firstDay}, again ${row.review.reviewDay}`;
  }
  if (!row.review.earliestDay) return 'Not yet: no pilot answers';
  return `Not yet: possible from ${row.review.earliestDay}`;
}

export function baselineText(row) {
  if (!row) return '—';
  if (row.baseline.done) return `Done: ${row.baseline.summary}`;
  return `Pending: ${row.baseline.pending.join('; ')}`;
}

export function pilotCellText(item, row) {
  if (item.id === 'pilot.visits') return visitsText(row);
  if (item.id === 'pilot.review') return reviewText(row);
  if (item.id === 'pilot.baseline') return baselineText(row);
  return '—';
}

// The file the parent sends back: all four groups, each child's numbers, the problems log, and the
// Test Lab results table (`checkReport`, from `checkReportMarkdown`).
export function r2ChecklistMarkdown({ items = [], learners = [], state = {}, exposure = [], progress, checkReport = '', today = '' } = {}) {
  const summary = progress || checklistProgress({ items, learners, state, exposure });
  const rowFor = (item, learnerId = '') => summary.rows.find((row) => row.key === tickKey(item, learnerId));
  const doneText = (row) => {
    if (!row) return '—';
    if (row.blockedReason && row.ticked) return 'Held back';
    return row.done ? 'Done' : 'Not yet';
  };
  const nameOf = (id) => learners.find((learner) => learner.id === id)?.name || id || '—';
  const lines = ['# R2 (M3) checklist', ''];
  if (today) lines.push(`Exported ${today}.`, '');
  lines.push(
    'Saved on one device. The ticks are the parent\'s own record; numbers marked "from the app" come only from pilot answers saved on that device. This list never changes a release gate, never counts as learning progress, and does not show on its own that a pilot happened.',
    '',
    `**${summary.done} of ${summary.total} done.**`,
    ''
  );
  if (summary.complete) lines.push(CHECKLIST_COMPLETE_MESSAGE, '');

  const byGroup = (group) => items.filter((item) => item.group === group);

  lines.push('## Setup checks', '', '| Check | Done | Test Lab | Note |', '|---|---|---|---|');
  byGroup('setup').forEach((item) => {
    const row = rowFor(item);
    lines.push(`| ${clean(item.label)} | ${doneText(row)} | ${clean(row?.testLab || '—')} | ${clean(row?.note) || '—'} |`);
  });
  lines.push('');

  lines.push('## Pilot window', '');
  if (!learners.length) {
    lines.push('No children on this device.', '');
  } else {
    lines.push(`| | ${learners.map((learner) => clean(learner.name || learner.id)).join(' | ')} |`, `|---|${learners.map(() => '---').join('|')}|`);
    byGroup('pilot').forEach((item) => {
      const cells = learners.map((learner) => {
        const row = rowFor(item, learner.id);
        if (item.source === 'app') {
          return clean(pilotCellText(item, exposure.find((entry) => entry.learnerId === learner.id)));
        }
        return `${doneText(row)}${row?.note ? ` (${clean(row.note)})` : ''}`;
      });
      lines.push(`| ${clean(item.label)}${item.source === 'app' ? ' — from the app' : ''} | ${cells.join(' | ')} |`);
    });
    lines.push('');
  }

  lines.push('## Problems log', '');
  const problems = state.problems || [];
  if (!problems.length) {
    lines.push('No problems logged.', '');
  } else {
    lines.push('| Date | Where | Child | What happened | Severity | Decision |', '|---|---|---|---|---|---|');
    problems.forEach((problem) => {
      lines.push(`| ${clean(problem.date) || '—'} | ${clean(problem.where)} | ${problem.learnerId ? clean(nameOf(problem.learnerId)) : '—'} | ${clean(problem.what)} | ${severityLabel(problem.severity)} | ${decisionLabel(problem.decision)} |`);
    });
    lines.push('');
  }

  lines.push('## Exit check (R2-G7)', '', '| Check | Done | Note |', '|---|---|---|');
  byGroup('exit').forEach((item) => {
    const row = rowFor(item);
    const note = [row?.note, row?.blockedReason].filter(Boolean).map(clean).join(' — ');
    lines.push(`| ${clean(item.label)} | ${doneText(row)} | ${note || '—'} |`);
  });
  lines.push('');

  if (checkReport) lines.push('---', '', checkReport);
  return lines.join('\n');
}
