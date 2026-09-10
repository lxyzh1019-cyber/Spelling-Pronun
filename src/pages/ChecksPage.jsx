import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useWords } from '../context/WordProvider';
import { useCancellableSpeech } from '../hooks/useCancellableSpeech';
import { PILOT_WARNING, TEST_LAB_BANNER, humanChecks } from '../data/humanChecks';
import { r2GateTracker } from '../data/r2GateTracker';
import {
  RESULT_VALUES,
  checkAvailability,
  checkProgress,
  checkReportMarkdown,
  checksInArea,
  gateStateAfterChecks,
  nextPrompt,
  pilotEntryAllowed,
  resultLabel,
  statusLabel,
} from '../learning/humanChecks';
import { playbackDisclosure } from '../learning/testLabAudio';
import { answerTestRun, currentTestItem, deliverTestQueue, testRunProgress } from '../learning/testLabRun';
import { twoDevicePreflight } from '../learning/testLabPreflight';
import { clearTestRun, resumeTestRun, writeTestRun } from '../persistence/testLabStore';
import { getOrCreateDeviceId } from '../persistence/deviceIdentity';
import { clearCheckResult, readCheckLog, recordCheckResult } from '../persistence/checkLog';
import styles from './Learning.module.css';

const TEST_RUN_ID = 'practice';

function ResultControls({ prompt, entry, disabled, onRecord, onClear }) {
  const [note, setNote] = useState(entry?.note || '');
  return (
    <>
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
        {entry?.result && (
          <button type="button" className={styles.secondary} disabled={disabled} onClick={() => onClear(prompt.id)}>Clear</button>
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
    </>
  );
}

function PromptRow({ prompt, entry, disabled, onRecord, onClear, onPlay, playState }) {
  const audio = prompt.audio;
  return (
    <li className={styles.checkRow}>
      <p className={styles.checkRowHead}>
        <strong>{prompt.label}</strong>
        {entry?.result && <span className={styles.meta}> — {resultLabel(entry.result)}</span>}
      </p>
      {prompt.detail && <p className={styles.meta}>{prompt.detail}</p>}
      {audio && (
        <>
          {audio.printedWord && <p className={styles.printedWord}>{audio.printedWord}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => onPlay(audio)}>
              {playState?.rowId === audio.rowId ? 'Play again' : 'Play'}
            </button>
          </div>
          <p className={styles.meta}>
            {audio.itemId} v{audio.itemVersion} · Form {audio.form} · asks for en-CA
            {audio.comparisonOnly && ' · Test Lab comparison, not assessment audio'}
          </p>
          {playState?.rowId === audio.rowId && playState.message && <p role="status">{playState.message}</p>}
        </>
      )}
      <ResultControls prompt={prompt} entry={entry} disabled={disabled} onRecord={onRecord} onClear={onClear} />
    </li>
  );
}

function PracticeRun({ storage }) {
  const [state, setState] = useState(() => resumeTestRun(storage, TEST_RUN_ID).state);
  const [answer, setAnswer] = useState('');
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState('');
  const item = currentTestItem(state);
  const progress = testRunProgress(state);

  const save = (next) => { writeTestRun(storage, TEST_RUN_ID, next); setState(next); };

  const submit = (event) => {
    event.preventDefault();
    const attemptId = `${item.id}-${state.answers.length}`;
    const outcome = answerTestRun(state, answer, { attemptId, online });
    if (outcome.duplicate) return setMessage('That answer was already recorded once. It was not counted twice.');
    save(outcome.state);
    setAnswer('');
    setMessage(online ? 'Answer recorded and delivered.' : 'Answer recorded and held on this device until you go back online.');
  };

  return (
    <section className={styles.feedback} aria-label="Test Lab practice run">
      <h3>Practice run</h3>
      <p className={styles.meta}>
        Invented practice questions kept in a separate test record. Nothing here is a lesson, and nothing here reaches
        Jenn’s or Jess’s progress.
      </p>
      <p><strong>{progress.answered} of {progress.total} answered</strong> · {progress.delivered} delivered · {progress.queued} waiting to send</p>
      {item ? (
        <form onSubmit={submit}>
          <p>{item.prompt}</p>
          <label>Your answer<input className={styles.input} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
          <div className={styles.actions}>
            <button className={styles.primary} disabled={!answer}>Submit</button>
            <button className={styles.secondary} type="button" onClick={() => { setOnline(!online); setMessage(online ? 'Pretending to be offline. Answers will be held.' : 'Back online.'); }}>
              {online ? 'Go offline' : 'Go back online'}
            </button>
            <button className={styles.secondary} type="button" onClick={() => { save(deliverTestQueue(state)); setMessage('Queue flushed. Each answer is delivered once, however many times you flush.'); }}>
              Send what is waiting
            </button>
          </div>
        </form>
      ) : <p className={styles.success}>Practice run finished. Reload the page to check that it stays finished.</p>}
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" onClick={() => { clearTestRun(storage, TEST_RUN_ID); setState(resumeTestRun(storage, TEST_RUN_ID).state); setMessage('This test run was cleared. Nothing else was touched.'); }}>
          Reset this test run
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

function TwoDevicePanel({ user, deviceLabel, preflight, onRun, busy }) {
  return (
    <section className={styles.feedback} aria-label="Two-device preflight">
      <h3>Setup check</h3>
      <p className={styles.meta}>
        This asks whether the check <em>can</em> be run: a parent account, a reachable Firebase, and a Test Lab record
        that writes and reads back as its owner. Passing it does not mean the check has been done.
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} type="button" disabled={busy} onClick={onRun}>
          {busy ? 'Checking…' : 'Run the setup check'}
        </button>
      </div>
      <p className={styles.meta}>Signed in as: {user && !user.isAnonymous ? user.email : user?.isAnonymous ? 'anonymous guest' : 'nobody'} · This device: {deviceLabel}</p>
      {preflight && (
        <p role="status">
          {preflight.ok
            ? `Setup confirmed at ${preflight.checkedAt.slice(11, 16)}. You can now do the real two-device sequence and record it.`
            : preflight.reason}
        </p>
      )}
    </section>
  );
}

function CheckCard({ check, results, availability, onRecord, onClear, onPlay, playState, children, entryBlocked }) {
  const progress = checkProgress(check, results);
  const next = nextPrompt(check, results);
  const locked = !availability.runnable;
  return (
    <details className={styles.checkCard} open={progress.status === 'problem_found'}>
      <summary>
        <strong>{check.title}</strong>
        <span className={styles.meta}>
          {' '}— {locked ? 'Cannot be run yet' : statusLabel(progress.status)} · {progress.done} of {progress.total} rows · about {check.minutes} minutes
        </span>
      </summary>
      <p>{check.purpose}</p>
      {locked && <p className={styles.notice} role="status"><strong>Not ready to run.</strong> {availability.reason}</p>}
      {check.needs?.length > 0 && <><h3>What you need</h3><ul>{check.needs.map((need) => <li key={need}>{need}</li>)}</ul></>}
      <h3>What to do</h3>
      <ol>{check.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      {children}
      {check.where && (
        entryBlocked
          ? <p className={styles.notice} role="status"><strong>{PILOT_WARNING}</strong> {entryBlocked}</p>
          : <p><Link className={styles.primary} to={check.where.to}>{check.where.label}</Link></p>
      )}
      <h3>It passes when</h3>
      <ul>{check.passWhen.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      <p className={styles.meta}><strong>What this does not do:</strong> {check.doesNotUnlock}</p>
      <h3>Record what happened</h3>
      {next && !locked && <p className={styles.meta}>Next row: {next.label}.</p>}
      <ul className={styles.checkList}>
        {check.prompts.map((prompt) => (
          <PromptRow
            key={prompt.id}
            prompt={prompt}
            entry={results[prompt.id]}
            disabled={locked}
            onRecord={onRecord}
            onClear={onClear}
            onPlay={onPlay}
            playState={playState}
          />
        ))}
      </ul>
    </details>
  );
}

export default function ChecksPage() {
  const { user, profiles } = useWords();
  const storage = globalThis.localStorage;
  const [results, setResults] = useState(() => readCheckLog(storage));
  const [playState, setPlayState] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [busy, setBusy] = useState(false);
  const [observedLearner, setObservedLearner] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState('');
  const deviceLabel = useMemo(() => getOrCreateDeviceId(storage).slice(0, 8), [storage]);
  const { play, playRecorded } = useCancellableSpeech(playState?.rowId || 'idle');

  const record = useCallback((promptId, result, note) => {
    const check = humanChecks.find((entry) => entry.prompts.some((prompt) => prompt.id === promptId));
    setResults(recordCheckResult(storage, {
      promptId,
      result,
      note,
      deviceLabel,
      // Only a Family Pilot row involved a child; a Test Lab row did not.
      observedLearner: check?.area === 'pilot' ? observedLearner : '',
    }));
    setCopied('');
  }, [deviceLabel, observedLearner, storage]);

  const clear = useCallback((promptId) => { setResults(clearCheckResult(storage, promptId)); setCopied(''); }, [storage]);

  const playRow = useCallback(async (row) => {
    setPlayState({ rowId: row.rowId, message: 'Playing…' });
    const result = row.playback.kind === 'reviewed_asset'
      ? await playRecorded(row.playback.url)
      : await play(row.playback.text, { lang: row.playback.lang, rate: row.playback.rate });
    if (result.reason === 'cancelled') return;
    setPlayState({ rowId: row.rowId, message: playbackDisclosure(row, result) });
  }, [play, playRecorded]);

  const runPreflight = useCallback(async () => {
    setBusy(true);
    try {
      const outcome = await twoDevicePreflight({
        user,
        testRunId: TEST_RUN_ID,
        deviceLabel,
        write: (collection, id, data) => setDoc(doc(db, collection, id), data),
        read: async (collection, id) => (await getDoc(doc(db, collection, id))).data() || null,
      });
      setPreflight(outcome);
    } catch {
      setPreflight({ ok: false, reason: 'The setup check could not complete on this device.', checkedAt: new Date().toISOString() });
    } finally { setBusy(false); }
  }, [deviceLabel, user]);

  const availabilityContext = useMemo(() => ({ preflight: { twoDevice: preflight } }), [preflight]);
  const pilotGate = useMemo(() => ({ observedLearner, confirmed }), [confirmed, observedLearner]);

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

  const renderScenario = (check) => {
    if (check.scenario === 'twoDevice') {
      return <TwoDevicePanel user={user} deviceLabel={deviceLabel} preflight={preflight} onRun={runPreflight} busy={busy} />;
    }
    if (check.scenario === 'resume' || check.scenario === 'device') return <PracticeRun storage={storage} />;
    return null;
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1>Things I need you to test</h1>
        <p>
          Everything here is something no test can check: whether a voice is clear in a real room, whether the real iPad
          keeps a session, whether a child understands a lesson. The page is in two halves, and the difference matters.
        </p>
        <p className={styles.notice} role="note">
          <strong>What recording here does and does not do.</strong> It saves what you observed, on this device. It is not
          mastery evidence for either child, it does not release any content, and it cannot turn a release gate green.
          Only the ledger, with the evidence attached, does that.
        </p>
        <p>
          <strong>{totals.recorded} of {totals.prompts}</strong> rows recorded
          {totals.problems > 0 && <> · <strong>{totals.problems} problem{totals.problems === 1 ? '' : 's'} found</strong></>}
        </p>
        <div className={styles.progress} aria-hidden="true">
          <span style={{ width: `${totals.prompts ? Math.round((totals.recorded / totals.prompts) * 100) : 0}%` }} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="test-lab">
        <h2 id="test-lab">Technical Test Lab</h2>
        <p className={styles.success} role="note"><strong>{TEST_LAB_BANNER}</strong></p>
        <p className={styles.meta}>
          These checks play the real audio and run the real session rules, but against invented practice questions and a
          separate test record. No check in this half opens a lesson, a story or the assessment.
        </p>
        {checksInArea(humanChecks, 'testlab').map((check) => (
          <CheckCard
            key={check.id}
            check={check}
            results={results}
            availability={checkAvailability(check, availabilityContext)}
            onRecord={record}
            onClear={clear}
            onPlay={playRow}
            playState={playState}
          >
            {renderScenario(check)}
          </CheckCard>
        ))}
      </section>

      <section className={styles.card} aria-labelledby="family-pilot">
        <h2 id="family-pilot">Family Pilot Observation</h2>
        <p className={styles.notice} role="note"><strong>{PILOT_WARNING}</strong></p>
        <p className={styles.meta}>
          This half is not isolated, and it is not meant to be: the point is to watch a child really use the app. Choose
          who is being observed before opening anything.
        </p>
        <fieldset className={styles.fieldset}>
          <legend>Who is being observed</legend>
          <div className={styles.actions}>
            {(profiles || []).map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={observedLearner === profile.id ? styles.primary : styles.secondary}
                aria-pressed={observedLearner === profile.id}
                onClick={() => { setObservedLearner(profile.id); setConfirmed(false); }}
              >
                {profile.name}
              </button>
            ))}
          </div>
          <label>
            <input type="checkbox" checked={confirmed} disabled={!observedLearner} onChange={(event) => setConfirmed(event.target.checked)} />
            {' '}I understand that answers and progress will be saved to {observedLearner ? (profiles || []).find((profile) => profile.id === observedLearner)?.name || observedLearner : 'the chosen child'}.
          </label>
        </fieldset>
        {checksInArea(humanChecks, 'pilot').map((check) => {
          const entry = pilotEntryAllowed(check, pilotGate);
          return (
            <CheckCard
              key={check.id}
              check={check}
              results={results}
              availability={checkAvailability(check, availabilityContext)}
              onRecord={record}
              onClear={clear}
              onPlay={playRow}
              playState={playState}
              entryBlocked={entry.allowed ? '' : entry.reason}
            />
          );
        })}
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
