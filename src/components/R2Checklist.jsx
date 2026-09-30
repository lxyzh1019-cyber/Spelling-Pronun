import { useEffect, useMemo, useState } from 'react';
import ReportShare from './ReportShare.jsx';
import { R2_CHECKLIST_GROUPS, r2ChecklistItems } from '../data/r2Checklist.js';
import { diagnosticForm } from '../data/diagnostic.k4.draft.js';
import { checkReportMarkdown } from '../learning/humanChecks.js';
import { derivePilotExposure } from '../learning/pilotExposure.js';
import {
  CHECKLIST_COMPLETE_MESSAGE,
  DECISIONS,
  SEVERITIES,
  checklistProgress,
  decisionLabel,
  pilotCellText,
  r2ChecklistFilename,
  r2ChecklistMarkdown,
  severityLabel,
} from '../learning/r2Checklist.js';
import { assessmentHistoryKey } from '../learning/assessmentReport.js';
import { edmontonDayKey } from '../learning/r1Core.js';
import { readDiagnosticRun } from '../persistence/diagnosticStore.js';
import { addProblem, readR2Checklist, setChecklistTick, updateProblem } from '../persistence/r2ChecklistStore.js';
import { learningAttemptsKey, localStorageOrNull, readJson } from '../utils/localStore.js';
import page from '../pages/Learning.module.css';
import styles from './R2Checklist.module.css';

// The R2 (M3) checklist at the top of the checks page: everything left before the pilot release can
// be called done, with each child's pilot numbers read from her real pilot answers.
//
// Ticks are the parent's own record. Nothing here changes a gate, counts as mastery or claims a
// pilot happened; reaching the end only says the parent may decide R2 is complete.

const NOT_SAVED = 'This device would not save that, so it will be gone after a reload. Save the report as a file before leaving.';

function readLearnerRecords(profiles, storage) {
  return (profiles || []).map((profile) => ({
    id: profile.id,
    name: profile.name || profile.id,
    assessments: ['A', 'B'].flatMap((form) => {
      const history = readJson(assessmentHistoryKey(profile.id, form), []);
      return Array.isArray(history) ? history.map((report) => ({ form, ...report })) : [];
    }),
    diagnosticRun: readDiagnosticRun(storage, profile.id, diagnosticForm.id),
    attempts: (() => {
      const stored = readJson(learningAttemptsKey(profile.id), []);
      return Array.isArray(stored) ? stored : [];
    })(),
  }));
}

function TickRow({ row, label, detail, extra, onTick }) {
  const [note, setNote] = useState(row.note);
  // A held-back exit row has its stored note cleared with its tick, so the box follows the record.
  useEffect(() => { setNote(row.note); }, [row.note]);
  const blocked = Boolean(row.blockedReason);
  return (
    <li className={page.checkRow}>
      <label className={styles.tick}>
        <input
          type="checkbox"
          checked={row.ticked && !blocked}
          disabled={blocked}
          onChange={(event) => onTick(row.key, { done: event.target.checked, note })}
        />
        <span><strong>{label}</strong></span>
      </label>
      {detail && <p className={page.meta}>{detail}</p>}
      {extra && <p className={page.meta}>{extra}</p>}
      {blocked && <p className={page.meta} role="status">{row.blockedReason}</p>}
      <label className={page.meta}>
        Note (optional)
        <input
          className={page.input}
          type="text"
          value={note}
          disabled={blocked}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => { if (!blocked && note !== row.note) onTick(row.key, { done: row.ticked, note }); }}
        />
      </label>
    </li>
  );
}

function ProblemForm({ learners, today, onAdd }) {
  const empty = { where: '', learnerId: '', what: '', severity: '', decision: 'open', date: today };
  const [draft, setDraft] = useState(empty);
  const set = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (onAdd(draft)) setDraft(empty);
  };
  return (
    <form className={page.fieldset} onSubmit={submit} aria-label="Add a problem">
      <label>Where (lesson and question)<input className={page.input} value={draft.where} onChange={set('where')} /></label>
      <label>
        Which child
        <select className={page.input} value={draft.learnerId} onChange={set('learnerId')}>
          <option value="">Not about one child</option>
          {learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}
        </select>
      </label>
      <label>What happened<input className={page.input} value={draft.what} onChange={set('what')} /></label>
      <label>
        Severity
        <select className={page.input} value={draft.severity} onChange={set('severity')}>
          <option value="">Not set yet</option>
          {SEVERITIES.map((value) => <option key={value} value={value}>{severityLabel(value)}</option>)}
        </select>
      </label>
      <label>
        Decision
        <select className={page.input} value={draft.decision} onChange={set('decision')}>
          {DECISIONS.map((value) => <option key={value} value={value}>{decisionLabel(value)}</option>)}
        </select>
      </label>
      <label>Date<input className={page.input} type="date" value={draft.date} onChange={set('date')} /></label>
      <div className={page.actions}>
        <button type="submit" className={page.primary} disabled={!draft.where.trim() || !draft.what.trim()}>Add the problem</button>
      </div>
    </form>
  );
}

export default function R2Checklist({ profiles, checks, checkResults }) {
  const storage = useMemo(() => localStorageOrNull(), []);
  const today = useMemo(() => edmontonDayKey(), []);
  const [state, setState] = useState(() => readR2Checklist(storage));
  const [message, setMessage] = useState('');

  const records = useMemo(() => readLearnerRecords(profiles, storage), [profiles, storage]);
  const learners = useMemo(() => records.map(({ id, name }) => ({ id, name })), [records]);
  const exposure = useMemo(
    () => derivePilotExposure(records.flatMap((record) => record.attempts), records, today, { diagnosticItemCount: diagnosticForm.items.length }),
    [records, today]
  );
  const progress = useMemo(
    () => checklistProgress({ items: r2ChecklistItems, learners, state, exposure, checks, checkResults }),
    [learners, state, exposure, checks, checkResults]
  );
  const learnerNames = useMemo(() => Object.fromEntries(learners.map((learner) => [learner.id, learner.name])), [learners]);
  const markdown = useMemo(() => r2ChecklistMarkdown({
    items: r2ChecklistItems,
    learners,
    state,
    exposure,
    progress,
    checkReport: checkReportMarkdown(checks, checkResults, { today, learnerNames }),
    today,
  }), [learners, state, exposure, progress, checks, checkResults, today, learnerNames]);

  const after = (result) => {
    setState(result.state);
    setMessage(result.saved ? '' : NOT_SAVED);
  };
  const tick = (key, value) => after(setChecklistTick(storage, key, value));
  const add = (draft) => {
    const result = addProblem(storage, draft);
    if (!result.added) {
      setMessage('A problem needs where it happened and what happened.');
      return false;
    }
    after(result);
    return true;
  };
  const change = (id, patch) => after(updateProblem(storage, id, patch));

  const rowsIn = (group) => progress.rows.filter((row) => row.item.group === group);
  const pilotItems = r2ChecklistItems.filter((item) => item.group === 'pilot');
  const rowFor = (item, learnerId) => progress.rows.find((row) => row.item.id === item.id && row.learnerId === learnerId);
  const titleOf = (id) => R2_CHECKLIST_GROUPS.find((group) => group.id === id)?.title;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className={page.card} aria-labelledby="r2-checklist">
      <h2 id="r2-checklist">R2 (M3) checklist</h2>
      <p>
        Everything left before R2, the pilot release, can be called done. It is saved on this device only.
      </p>
      <p className={page.notice} role="note">
        Ticking here is your own record. It never changes a release gate, never counts as learning progress, and
        never shows that a pilot happened. The rows marked “from the app” come only from real pilot answers saved on
        this device, and cannot be ticked by hand.
      </p>
      <p><strong>{progress.done} of {progress.total} done</strong></p>
      <div className={page.progress} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
      {progress.complete && <p className={page.success} role="status"><strong>{CHECKLIST_COMPLETE_MESSAGE}</strong> The release gates below stay as they are until you decide.</p>}
      {message && <p className={page.notice} role="status">{message}</p>}

      <h3>1. {titleOf('setup')}</h3>
      <ul className={page.checkList}>
        {rowsIn('setup').map((row) => (
          <TickRow key={row.key} row={row} label={row.item.label} detail={row.item.detail} extra={row.testLab} onTick={tick} />
        ))}
      </ul>

      <h3>2. {titleOf('pilot')}</h3>
      {learners.length === 0 ? (
        <p className={page.meta}>No children on this device yet. Add a profile first.</p>
      ) : (
        <>
          <div className={styles.scroll}>
            <table className={page.table}>
              <thead>
                <tr><th scope="col">Item</th>{learners.map((learner) => <th scope="col" key={learner.id}>{learner.name}</th>)}</tr>
              </thead>
              <tbody>
                {pilotItems.filter((item) => item.source === 'app').map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.label} <span className={page.meta}>(from the app)</span></th>
                    {learners.map((learner) => (
                      <td key={learner.id}>{pilotCellText(item, exposure.find((entry) => entry.learnerId === learner.id))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={page.checkList}>
            {pilotItems.filter((item) => item.source === 'parent').flatMap((item) => learners.map((learner) => {
              const row = rowFor(item, learner.id);
              return <TickRow key={row.key} row={row} label={`${learner.name}: ${item.label.toLowerCase()}`} detail={item.detail} onTick={tick} />;
            }))}
          </ul>
        </>
      )}

      <h3>3. {titleOf('problems')}</h3>
      <p className={page.meta}>
        Add a row for each confusing question, marking disagreement, lost progress or stuck screen. A Critical or High
        problem keeps the exit check unticked until it is fixed and checked, accepted or quarantined; deciding to fix it
        is not enough. While a problem holds an exit row back, that row’s tick and note are cleared, so tick it again
        once the problem is resolved.
      </p>
      {state.problems.length > 0 ? (
        <ul className={page.checkList}>
          {state.problems.map((problem) => (
            <li key={problem.id} className={page.checkRow}>
              <p className={page.checkRowHead}>
                <strong>{problem.where}</strong>
                <span className={page.meta}> · {problem.date}{problem.learnerId ? ` · ${learners.find((learner) => learner.id === problem.learnerId)?.name || problem.learnerId}` : ''}</span>
              </p>
              <p>{problem.what}</p>
              <div className={styles.pair}>
                <label className={page.meta}>
                  Severity
                  <select className={page.input} value={problem.severity || ''} onChange={(event) => change(problem.id, { severity: event.target.value })}>
                    <option value="">Not set yet</option>
                    {SEVERITIES.map((value) => <option key={value} value={value}>{severityLabel(value)}</option>)}
                  </select>
                </label>
                <label className={page.meta}>
                  Decision
                  <select className={page.input} value={problem.decision || 'open'} onChange={(event) => change(problem.id, { decision: event.target.value })}>
                    {DECISIONS.map((value) => <option key={value} value={value}>{decisionLabel(value)}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className={page.meta}>No problems logged yet.</p>}
      <ProblemForm learners={learners} today={today} onAdd={add} />

      <h3>4. {titleOf('exit')}</h3>
      <ul className={page.checkList}>
        {rowsIn('exit').map((row) => (
          <TickRow key={row.key} row={row} label={row.item.label} onTick={tick} />
        ))}
      </ul>

      <h3>Send the checklist back</h3>
      <p className={page.meta}>
        One file with all four groups, each child’s numbers, the problems log, and the Test Lab results, including
        which child each Family Pilot row observed.
      </p>
      <ReportShare
        title="R2 (M3) checklist"
        filename={r2ChecklistFilename(today)}
        markdown={markdown}
        summary={<p className={page.meta}>{progress.done} of {progress.total} done.</p>}
      />
    </section>
  );
}
