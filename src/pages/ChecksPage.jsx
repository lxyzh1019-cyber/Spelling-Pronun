import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { humanChecks } from '../data/humanChecks';
import { r2GateTracker } from '../data/r2GateTracker';
import {
  RESULT_VALUES,
  checkAvailability,
  checkProgress,
  checkReportMarkdown,
  gateStateAfterChecks,
  nextPrompt,
  resultLabel,
  statusLabel,
} from '../learning/humanChecks';
import { clearCheckResult, readCheckLog, recordCheckResult } from '../persistence/checkLog';
import styles from './Learning.module.css';

function PromptRow({ prompt, entry, disabled, onRecord, onClear }) {
  const [note, setNote] = useState(entry?.note || '');
  const recorded = entry && entry.result;
  return (
    <li className={styles.checkRow}>
      <p className={styles.checkRowHead}>
        <strong>{prompt.label}</strong>
        {recorded && <span className={styles.meta}> — {resultLabel(entry.result)}</span>}
      </p>
      {prompt.detail && <p className={styles.meta}>{prompt.detail}</p>}
      <div className={styles.actions} role="group" aria-label={`Result for ${prompt.label}`}>
        {RESULT_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={entry?.result === value}
            className={entry?.result === value ? styles.primary : styles.secondary}
            onClick={() => onRecord(prompt.id, value, note)}
          >
            {resultLabel(value)}
          </button>
        ))}
        {recorded && (
          <button type="button" className={styles.secondary} disabled={disabled} onClick={() => onClear(prompt.id)}>
            Clear
          </button>
        )}
      </div>
      <label className={styles.meta}>
        What you noticed (optional)
        <input
          className={styles.input}
          type="text"
          value={note}
          disabled={disabled}
          placeholder="Only needed when something was wrong"
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => { if (entry?.result && note !== (entry.note || '')) onRecord(prompt.id, entry.result, note); }}
        />
      </label>
      {entry?.history?.length > 0 && (
        <p className={styles.meta}>
          Earlier: {entry.history.map((old) => `${resultLabel(old.result)} on ${String(old.recordedAt).slice(0, 10)}`).join('; ')}
        </p>
      )}
    </li>
  );
}

function CheckCard({ check, results, onRecord, onClear }) {
  const progress = checkProgress(check, results);
  const availability = checkAvailability(check, {});
  const next = nextPrompt(check, results);
  return (
    <details className={styles.checkCard} open={progress.status === 'problem_found'}>
      <summary>
        <strong>{check.title}</strong>
        <span className={styles.meta}>
          {' '}— {availability.runnable ? statusLabel(progress.status) : 'Cannot be run yet'} · {progress.done} of {progress.total} rows · about {check.minutes} minutes
        </span>
      </summary>
      <p>{check.purpose}</p>
      {!availability.runnable && (
        <p className={styles.notice} role="status"><strong>Not ready to run.</strong> {availability.reason}</p>
      )}
      {check.needs?.length > 0 && (
        <>
          <h3>What you need</h3>
          <ul>{check.needs.map((need) => <li key={need}>{need}</li>)}</ul>
        </>
      )}
      <h3>What to do</h3>
      <ol>{check.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      {check.where && <p><Link className={styles.primary} to={check.where.to}>{check.where.label}</Link></p>}
      <h3>It passes when</h3>
      <ul>{check.passWhen.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      <p className={styles.meta}><strong>What this does not do:</strong> {check.doesNotUnlock}</p>
      <h3>Record what happened</h3>
      {next && availability.runnable && <p className={styles.meta}>Next row to look at: {next.label}.</p>}
      <ul className={styles.checkList}>
        {check.prompts.map((prompt) => (
          <PromptRow
            key={prompt.id}
            prompt={prompt}
            entry={results[prompt.id]}
            disabled={!availability.runnable}
            onRecord={onRecord}
            onClear={onClear}
          />
        ))}
      </ul>
    </details>
  );
}

export default function ChecksPage() {
  const { activeProfileId } = useWords();
  const [results, setResults] = useState(() => readCheckLog());
  const [copied, setCopied] = useState('');

  const record = (promptId, result, note) => {
    setResults(recordCheckResult(globalThis.localStorage, { promptId, result, note, recordedBy: activeProfileId }));
    setCopied('');
  };
  const clear = (promptId) => {
    setResults(clearCheckResult(globalThis.localStorage, promptId));
    setCopied('');
  };

  const totals = useMemo(() => {
    const rows = humanChecks.map((check) => checkProgress(check, results));
    return {
      prompts: rows.reduce((sum, row) => sum + row.total, 0),
      recorded: rows.reduce((sum, row) => sum + row.done, 0),
      problems: rows.reduce((sum, row) => sum + row.counts.problem, 0),
    };
  }, [results]);

  const report = useMemo(
    () => checkReportMarkdown(humanChecks, results, { today: new Date().toISOString().slice(0, 10) }),
    [results]
  );

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied('Copied. Paste it into the ledger or send it back with the next change.');
    } catch {
      setCopied('Copying was blocked. Select the text below and copy it manually.');
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1>Things I need you to test</h1>
        <p>
          Everything on this page is something no test can check: whether a voice is clear in a real room, whether the
          real iPad keeps a session, whether a child understands a lesson. Work through a check whenever you have the
          time it asks for. You can stop part-way; your place is kept on this device.
        </p>
        <p className={styles.notice} role="note">
          <strong>What recording here does and does not do.</strong> It saves what you observed, on this device, so it can
          be read back later. It is not mastery evidence for either child, it does not release any content, and it cannot
          turn a release gate green. Only the ledger, with the evidence attached, does that.
        </p>
        <p>
          <strong>{totals.recorded} of {totals.prompts}</strong> rows recorded
          {totals.problems > 0 && <> · <strong>{totals.problems} problem{totals.problems === 1 ? '' : 's'} found</strong></>}
        </p>
        <div className={styles.progress} aria-hidden="true">
          <span style={{ width: `${totals.prompts ? Math.round((totals.recorded / totals.prompts) * 100) : 0}%` }} />
        </div>
      </section>

      <section className={styles.card}>
        <h2>The checks</h2>
        {humanChecks.map((check) => (
          <CheckCard key={check.id} check={check} results={results} onRecord={record} onClear={clear} />
        ))}
      </section>

      <section className={styles.card}>
        <h2>Which gate each check feeds</h2>
        <p className={styles.meta}>
          A check is an input to a gate, never the gate itself. These states come from the ledger and do not move when you
          record a result.
        </p>
        <div className={styles.gateList}>
          {r2GateTracker.map((gate) => {
            const view = gateStateAfterChecks(gate, humanChecks, results);
            if (!view.note) return null;
            return (
              <article className={styles.gate} key={gate.id}>
                <p><strong>{gate.label}</strong></p>
                <p className={styles.meta}>
                  {view.checksRecorded} row{view.checksRecorded === 1 ? '' : 's'} recorded
                  {view.problemsFound > 0 && `, ${view.problemsFound} problem${view.problemsFound === 1 ? '' : 's'} found`}. {view.note}
                </p>
              </article>
            );
          })}
        </div>
        <p><Link className={styles.secondary} to="/parent">Open the parent view</Link></p>
      </section>

      <section className={styles.card}>
        <h2>Send the findings back</h2>
        <p>
          The log lives on this device only. Copy it and paste it into the ledger, or into the next conversation, so the
          problems you found get fixed.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={copyReport}>Copy the log</button>
        </div>
        {copied && <p role="status">{copied}</p>}
        <label>
          The log
          <textarea className={styles.input} rows={10} readOnly value={report} />
        </label>
      </section>
    </div>
  );
}
