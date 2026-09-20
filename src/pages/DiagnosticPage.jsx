import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { diagnosticForm } from '../data/diagnostic.k4.draft.js';
import { buildDiagnosticReport } from '../learning/diagnosticReport.js';
import {
  answerDiagnostic,
  attemptsFrom,
  clearDiagnosticRun,
  resumeDiagnosticRun,
  writeDiagnosticRun,
} from '../persistence/diagnosticStore.js';
import ladder from '../data/curriculum.ladder.json';
import styles from './Learning.module.css';

// The below-grade diagnostic.
//
// IT TEACHES NOTHING, AND THAT IS THE DESIGN. No worked example, no help button, no repair step, no
// explanation after an answer — a diagnostic that taught would measure the teaching rather than what
// the child already had. The only feedback is that the answer was recorded.
//
// It also never writes to the learner record. Answers go to `diagnosticStore`, which is fenced to
// its own key prefix and has no path into `spelling-attempts`. See that file for why one filter was
// not enough.

export default function DiagnosticPage() {
  const { profiles, activeProfileId } = useWords();
  const [observedLearner, setObservedLearner] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [run, setRun] = useState(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('');

  const items = diagnosticForm.items;
  const learnerName = (id) => (profiles || []).find((profile) => profile.id === id)?.name || id;

  const start = useCallback(() => {
    const { run: resumed, resumed: wasResumed } = resumeDiagnosticRun(globalThis.localStorage, observedLearner, diagnosticForm.id);
    setRun(resumed);
    // Resume where the child stopped rather than at the first question they already answered.
    const next = items.findIndex((item) => !resumed.answers[item.id]);
    setIndex(next === -1 ? items.length : next);
    setStatus(wasResumed ? 'Picking up where this form was left.' : '');
  }, [observedLearner, items]);

  const answer = (item, choiceId) => {
    const correct = item.acceptedAnswers.includes(choiceId);
    const { run: updated, recorded } = answerDiagnostic(run, item.id, choiceId, correct);
    if (recorded) writeDiagnosticRun(globalThis.localStorage, updated);
    setRun(updated);
    setIndex((current) => current + 1);
    // Never right/wrong. The child is locating gaps, not being scored, and telling them would also
    // teach the next question in the same skill.
    setStatus(recorded ? 'Answer saved.' : 'That one was already answered, so the first answer stands.');
  };

  const report = useMemo(
    () => (run ? buildDiagnosticReport(diagnosticForm, attemptsFrom(run), { ladder }) : null),
    [run],
  );

  // The parent gate, the same shape the Family Pilot checks use: name the child, acknowledge what is
  // being recorded, and only then does anything open.
  if (!run) {
    return (
      <div className={styles.page}>
        <h1>{diagnosticForm.title}</h1>
        <p>{diagnosticForm.purpose}</p>
        <p className={styles.meta}>
          {items.length} questions, three for each of the {items.length / 3} skills Alberta finishes with before Grade 5.
          It teaches nothing and gives no help, because it is finding out what is already there.
          Answers are saved on this device only and can never count as mastery.
        </p>
        <fieldset className={styles.card}>
          <legend>Which child is answering?</legend>
          <div className={styles.actions} role="group" aria-label="Choose the child">
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
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!observedLearner}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {' '}I understand these answers are recorded against {observedLearner ? learnerName(observedLearner) : 'the chosen child'}, and that they locate gaps rather than scoring them.
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} type="button" disabled={!observedLearner || !confirmed} onClick={start}>
              Start
            </button>
            <Link className={styles.secondary} to="/parent">Back to parent view</Link>
          </div>
          {!observedLearner && <p role="status">Choose which child is answering.</p>}
          {observedLearner && !confirmed && <p role="status">Confirm before the form opens.</p>}
        </fieldset>
      </div>
    );
  }

  const done = index >= items.length;
  const item = done ? null : items[index];

  return (
    <div className={styles.page}>
      <h1>{diagnosticForm.title}</h1>
      <p className={styles.meta}>
        {learnerName(run.learnerId)} · question {Math.min(index + 1, items.length)} of {items.length}
      </p>
      {status && <p role="status">{status}</p>}

      {item && (
        <section className={styles.card} key={item.id}>
          <p className={styles.meta}>{item.skillId}</p>
          <h2>{item.prompt}</h2>
          <div className={styles.actions} role="group" aria-label="Choose an answer">
            {item.choices.map((choice) => (
              <button key={choice.id} className={styles.secondary} type="button" onClick={() => answer(item, choice.id)}>
                {choice.text}
              </button>
            ))}
          </div>
          <p className={styles.meta}>There is no help on this one on purpose. If you are not sure, pick what you think and move on.</p>
        </section>
      )}

      {done && report && (
        <section className={styles.card}>
          <h2>Finished</h2>
          <p>Every question is answered. What it found is on the parent page, with the skills to build next.</p>
          <p className={styles.meta}>{report.masteryNote}</p>
          <p className={styles.meta}>The parent page shows the report for whichever learner is selected there, and has a <strong>Copy the report</strong> button. To copy {learnerName(run.learnerId)}&rsquo;s, make them the selected learner first.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} to="/parent">See what it found</Link>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                clearDiagnosticRun(globalThis.localStorage, run.learnerId, diagnosticForm.id);
                setRun(null);
                setIndex(0);
                setConfirmed(false);
                setStatus('');
              }}
            >
              Clear this child&rsquo;s answers and start again
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
