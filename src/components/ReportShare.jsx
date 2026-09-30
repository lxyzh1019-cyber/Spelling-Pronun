import { useState } from 'react';
import { downloadReportFile, printReport, shareReportText } from '../utils/shareReport.js';
import styles from './ReportShare.module.css';

// The one way a report leaves this device: Share, Save as a file, Print or save as PDF.
//
// Used by the below-grade diagnostic (through `DiagnosticShare`) and by the R2 checklist on the
// checks page, so the routes, their wording and what they claim cannot drift apart.
//
// The status line says what actually happened. `shareReportText` reports `via`, so "handed to the
// share sheet", "copied" and "nothing was copied" are three different sentences and none of them is
// guessed. The read-only textarea stays as the floor under all of it: when every route fails the
// report is still on the page to be selected by hand.
//
// Only one of these belongs on a page: its print copy is the page's whole printout.

export default function ReportShare({ title, filename, markdown = '', summary = null }) {
  const [status, setStatus] = useState('');

  if (!markdown) return null;

  const onShare = async () => {
    const result = await shareReportText({ title, text: markdown });
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
      {summary}
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
