// Rules for the human-check log.
//
// The one rule that matters here: a recorded observation is an observation.
// `evidenceContributionOf` returns the same value for every result, and
// `gateStateAfterChecks` returns the gate's own state however many passes have
// been recorded. Both are tested. Nothing in this module can release content or
// produce mastery evidence, and no mastery or release path reads it.

export const RESULT_VALUES = ['pass', 'problem', 'unclear'];

export function isResultValue(value) {
  return RESULT_VALUES.includes(value);
}

export function resultLabel(value) {
  return { pass: 'Worked', problem: 'Problem found', unclear: 'Not sure' }[value] || 'Not recorded';
}

// Every result, whatever it says, is one person's observation on one device.
export function evidenceContributionOf() {
  return 'parent_observation';
}

function resultFor(results, promptId) {
  const entry = results?.[promptId];
  return entry && isResultValue(entry.result) ? entry.result : null;
}

export function checkProgress(check, results = {}) {
  const prompts = check?.prompts || [];
  const recorded = prompts.map((prompt) => resultFor(results, prompt.id));
  const counts = {
    pass: recorded.filter((value) => value === 'pass').length,
    problem: recorded.filter((value) => value === 'problem').length,
    unclear: recorded.filter((value) => value === 'unclear').length,
  };
  const done = counts.pass + counts.problem + counts.unclear;
  let status = 'not_started';
  if (counts.problem > 0) status = 'problem_found';
  else if (done === 0) status = 'not_started';
  else if (done < prompts.length) status = 'in_progress';
  else if (counts.unclear > 0) status = 'needs_another_look';
  else status = 'complete';
  return { total: prompts.length, done, counts, status };
}

export function statusLabel(status) {
  return {
    not_started: 'Not started',
    in_progress: 'In progress',
    problem_found: 'Problem found',
    needs_another_look: 'Needs another look',
    complete: 'All rows worked',
  }[status] || 'Unknown';
}

// The next row to look at: anything unrecorded first, then anything left unsure.
export function nextPrompt(check, results = {}) {
  const prompts = check?.prompts || [];
  return (
    prompts.find((prompt) => resultFor(results, prompt.id) === null) ||
    prompts.find((prompt) => resultFor(results, prompt.id) === 'unclear') ||
    null
  );
}

// A check whose prerequisite is missing cannot be run, so it cannot be recorded.
//
// The prerequisite is a real preflight result, not a checkbox: there is
// deliberately no way to declare setup complete by hand, because a result
// recorded without the setup would mean nothing. A passing preflight makes the
// check runnable; it never means the check has been done.
export function checkAvailability(check, context = {}) {
  if (!check?.requiresPreflight) return { runnable: true, reason: '' };
  const preflight = context.preflight?.[check.requiresPreflight];
  if (preflight?.ok) return { runnable: true, reason: '' };
  if (preflight?.reason) return { runnable: false, reason: preflight.reason };
  return { runnable: false, reason: 'This check has not been able to confirm its setup yet.' };
}

export function checksInArea(checks = [], area) {
  return checks.filter((check) => check.area === area);
}

// A Family Pilot check writes to a real child's record, so it cannot open until
// the parent has said which child and acknowledged that.
export function pilotEntryAllowed(check, { observedLearner = '', confirmed = false } = {}) {
  if (check?.area !== 'pilot') return { allowed: true, reason: '' };
  if (!observedLearner) return { allowed: false, reason: 'Choose which child is being observed.' };
  if (!confirmed) return { allowed: false, reason: 'Confirm that answers will be saved to that child.' };
  return { allowed: true, reason: '' };
}

export function summariseChecks(checks = [], results = {}, context = {}) {
  const rows = checks.map((check) => ({
    id: check.id,
    title: check.title,
    gateId: check.gateId,
    availability: checkAvailability(check, context),
    progress: checkProgress(check, results),
  }));
  const runnable = rows.filter((row) => row.availability.runnable);
  return {
    rows,
    totalPrompts: rows.reduce((sum, row) => sum + row.progress.total, 0),
    recordedPrompts: rows.reduce((sum, row) => sum + row.progress.done, 0),
    problemChecks: rows.filter((row) => row.progress.status === 'problem_found').length,
    completeChecks: rows.filter((row) => row.progress.status === 'complete').length,
    blockedChecks: rows.length - runnable.length,
    // Deliberately absent: any notion of "ready", "released", or "approved".
  };
}

// What the parent hands back so the findings reach the ledger rather than
// staying on one device.
export function checkReportMarkdown(checks = [], results = {}, { today = '' } = {}) {
  const lines = ['# Human check log', ''];
  if (today) lines.push(`Exported ${today}.`, '');
  lines.push(
    'These are recorded observations from one person on one device. They are not mastery evidence and they do not release content.',
    '',
    'Test Lab rows ran against an isolated test record and changed no learning progress. Family Pilot rows were real learner sessions and did create ordinary records for the named child.',
    ''
  );
  checks.forEach((check) => {
    const progress = checkProgress(check, results);
    const areaLabel = check.area === 'pilot' ? 'Family Pilot Observation' : 'Technical Test Lab';
    lines.push(`## ${check.title}`, '', `${areaLabel} · Status: ${statusLabel(progress.status)} (${progress.done} of ${progress.total} recorded)`, '');
    if (progress.done === 0) {
      lines.push('Nothing recorded yet.', '');
      return;
    }
    lines.push('| Row | Result | Tester | Device | Note |', '|---|---|---|---|---|');
    check.prompts.forEach((prompt) => {
      const entry = results?.[prompt.id];
      if (!entry || !isResultValue(entry.result)) return;
      const clean = (value) => String(value || '').replace(/\|/g, '/').replace(/\n/g, ' ').trim();
      lines.push(`| ${clean(prompt.label)} | ${resultLabel(entry.result)} | ${clean(entry.testedBy) || 'Parent'} | ${clean(entry.deviceLabel) || '—'} | ${clean(entry.note) || '—'} |`);
    });
    lines.push('');
  });
  return lines.join('\n');
}

// Release gates are decided by the ledger, not by this log. Passing every row
// changes the reported state of a gate by exactly nothing.
export function gateStateAfterChecks(gate, checks = [], results = {}) {
  const related = checks.filter((check) => check.gateId === gate.id);
  const recorded = related.reduce((sum, check) => sum + checkProgress(check, results).done, 0);
  const problems = related.reduce((sum, check) => sum + checkProgress(check, results).counts.problem, 0);
  return {
    state: gate.state,
    checksRecorded: recorded,
    problemsFound: problems,
    note: related.length
      ? 'Observations recorded here are an input to this gate, not the gate itself. Only the ledger, with the evidence attached, can change its state.'
      : '',
  };
}
