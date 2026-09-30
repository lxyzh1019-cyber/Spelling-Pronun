import { useMemo } from 'react';
import { combinedDiagnosticReportMarkdown, diagnosticSummaryLine } from '../learning/diagnosticReport.js';
import ReportShare from './ReportShare.jsx';
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
// The share, save and print routes, their status line and the read-only textarea live in the shared
// `ReportShare`, which the checks page's R2 checklist uses as well.

export default function DiagnosticShare({ entries = [], today = '' }) {
  const rows = useMemo(() => (entries || []).filter((entry) => entry?.report), [entries]);
  const markdown = useMemo(() => combinedDiagnosticReportMarkdown(rows, { today }), [rows, today]);

  if (!rows.length) return null;

  const summary = (
    <>
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
    </>
  );

  return (
    <ReportShare
      title="Below-grade diagnostic"
      filename={`diagnostic-${today || new Date().toISOString().slice(0, 10)}.md`}
      markdown={markdown}
      summary={summary}
    />
  );
}
