import { useMemo, useState } from 'react';
import { combinedDiagnosticReportMarkdown, diagnosticSummaryLine } from '../learning/diagnosticReport.js';
import { downloadReportFile, printReport, shareReportText } from '../utils/shareReport.js';
import styles from './DiagnosticShare.module.css';

// The one way a diagnostic result leaves this device, rendered identically wherever it appears.
//
// There are two places a parent finishes the diagnostic and wants to send the result: the finish
// screen and the parent page. They used to carry different controls and different instructions, and
// the parent page's instruction — switch profiles and export each child in turn — was a prose
// warning standing in for a structural fix. One component over every child who has answered is that
// fix: the two surfaces cannot drift apart in wording or in what they can do, and there is no
// profile to switch.
//
// The status line says what actually happened. `shareReportText` reports `via`, so "handed to the
// share sheet", "copied" and "nothing was copied" are three different sentences and none of them is
// guessed. The read-only textarea stays as the floor under all of it: when every route fails the
// report is still on the page to be selected by hand.

export default function DiagnosticShare({ entries = [], today = '' }) {
  const rows = useMemo(() => (entries || []).filter((entry) => entry?.report), [entries]);
  const markdown = useMemo(() => combinedDiagnosticReportMarkdown(rows, { today }), [rows, today]);
  const [status, setStatus] = useState('');

  if (!rows.length) return null;

  const filename = `diagnostic-${today || new Date().toISOString().slice(0, 10)}.md`;

  const onShare = async () => {
    const result = await shareReportText({ title: 'Below-grade diagnostic', text: markdown });
    if (result.ok && result.via === 'share') setStatus('Handed to the share sheet. Choose where it goes from there.');
    else if (result.ok) setStatus('Copied. Paste it into the next conversation.');
    else if (result.reason === 'cancelled') setStatus('Sharing was cancelled, so nothing left this device.');
    else setStatus('Copying was blocked, so nothing was copied. Select the text below and copy it by hand, or save it as a file.');
  };

  const onSave = () => {
    const result = downloadReportFile({ filename, text: markdown });
    setStatus(result.ok
      ? `Handed to this browser as ${filename}. It is in wherever downloads go on this device.`
      : 'This browser would not save a file. Use Share, or select the text below and copy it by hand.');
  };

  const onPrint = () => {
    const result = printReport();
    setStatus(result.ok
      ? 'The print dialog is open. On an iPad, choose Save as PDF there.'
      : 'This browser would not open a print dialog. Use Share or Save as a file instead.');
  };

  return (
    <div className={styles.share}>
      <ul className={styles.lead}>
        {rows.map((row) => (
          <li key={row.learnerId || row.learnerName}>
            <strong>{row.learnerName}</strong>
            {diagnosticSummaryLine(row.report).split('\n').map((line) => <span key={line}>{line}</span>)}
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        One report, with a section for each child who has answered, in the order they are on this device.
        Nothing in it is added up across children and nothing in it is a score.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onShare}>Share</button>
        <button type="button" className={styles.secondary} onClick={onSave}>Save as a file</button>
        <button type="button" className={styles.secondary} onClick={onPrint}>Print or save as PDF</button>
      </div>
      {status && <p role="status">{status}</p>}
      <label>
        The report
        <textarea className={styles.text} rows={10} readOnly value={markdown} />
      </label>
      {/* Printed, never shown. The screen already has the report in the textarea, so this copy is
          hidden from assistive technology as well as from sight until the print stylesheet runs. */}
      <div className={styles.printOnly} aria-hidden="true">
        <pre>{markdown}</pre>
      </div>
    </div>
  );
}
