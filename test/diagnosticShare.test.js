// Getting the diagnostic off the iPad, and the one thing that must not happen while doing it: the
// app saying the report went somewhere it did not go.
//
// The old export was `navigator.clipboard.writeText` inside a try/catch. On an iPad that call fails
// outside a secure context and outside a user gesture, and a UI that announced "Copied" on the way
// past would have been lying. So every function here returns what actually happened — the same
// truthful-result shape `speak()` returns — and the fallbacks are ordered, not silent.
//
// Dependencies are injected, so these run under `node --test` with no browser at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadReportFile, printReport, shareReportText } from '../src/utils/shareReport.js';

const REPORT = '# Below-grade diagnostic\n\nnothing here is a score\n';

test('sharing tries the share sheet, then the clipboard, and never claims a success it did not get', async () => {
  const shared = [];
  const copied = [];
  const withShare = {
    nav: {
      share: async (payload) => { shared.push(payload); },
      clipboard: { writeText: async (text) => copied.push(text) },
    },
  };
  const first = await shareReportText({ title: 'Diagnostic', text: REPORT }, withShare);
  assert.deepEqual(first, { ok: true, via: 'share', reason: null });
  assert.deepEqual(shared, [{ title: 'Diagnostic', text: REPORT }]);
  assert.deepEqual(copied, [], 'the clipboard was used as well as the share sheet');

  // The share sheet exists but fails — an unsupported payload, a non-secure context. The clipboard
  // is the fallback, and the result says which one actually carried the report.
  const thrown = await shareReportText({ title: 'Diagnostic', text: REPORT }, {
    nav: {
      share: async () => { throw new Error('not allowed'); },
      clipboard: { writeText: async (text) => copied.push(text) },
    },
  });
  assert.deepEqual(thrown, { ok: true, via: 'clipboard', reason: null });
  assert.deepEqual(copied, [REPORT]);

  // The parent dismissed the share sheet. Nothing left the device, and the result must not pretend
  // otherwise or fall through to copying behind their back.
  const cancelled = await shareReportText({ title: 'Diagnostic', text: REPORT }, {
    nav: {
      share: async () => { const error = new Error('cancelled'); error.name = 'AbortError'; throw error; },
      clipboard: { writeText: async () => { throw new Error('should not be reached'); } },
    },
  });
  assert.deepEqual(cancelled, { ok: false, via: 'share', reason: 'cancelled' });

  // No share sheet, and the clipboard refuses: the textarea on the page is the only way left, and
  // the caller is told so rather than being told it worked.
  const blocked = await shareReportText({ title: 'Diagnostic', text: REPORT }, {
    nav: { clipboard: { writeText: async () => { throw new Error('denied'); } } },
  });
  assert.deepEqual(blocked, { ok: false, via: 'manual', reason: 'copy-blocked' });

  // Neither path exists at all.
  const nothing = await shareReportText({ title: 'Diagnostic', text: REPORT }, { nav: {} });
  assert.equal(nothing.ok, false);
  assert.equal(nothing.via, 'manual');
  assert.equal(nothing.reason, 'unavailable');

  const empty = await shareReportText({ title: 'Diagnostic', text: '' }, { nav: { share: async () => {} } });
  assert.deepEqual(empty, { ok: false, via: 'manual', reason: 'nothing-to-share' });
});

test('saving the report writes one object URL, clicks it, and releases it again', () => {
  const calls = [];
  const anchor = { href: '', download: '', click() { calls.push(`click:${this.href}:${this.download}`); } };
  const blobs = [];
  const result = downloadReportFile({ filename: 'diagnostic-2026-09-28.md', text: REPORT }, {
    doc: {
      createElement: (tag) => { calls.push(`create:${tag}`); return anchor; },
      body: { appendChild: () => calls.push('append'), removeChild: () => calls.push('remove') },
    },
    url: {
      createObjectURL: (blob) => { blobs.push(blob); calls.push('createObjectURL'); return 'blob:diagnostic-1'; },
      revokeObjectURL: (value) => calls.push(`revoke:${value}`),
    },
    BlobCtor: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
    defer: (fn) => fn(),
  });
  assert.deepEqual(result, { ok: true, reason: null });
  assert.deepEqual(calls, [
    'createObjectURL',
    'create:a',
    'append',
    'click:blob:diagnostic-1:diagnostic-2026-09-28.md',
    'remove',
    'revoke:blob:diagnostic-1',
  ]);
  assert.equal(blobs.length, 1, 'more than one blob was made for one report');
  assert.deepEqual(blobs[0].parts, [REPORT]);
  assert.match(blobs[0].options.type, /^text\/markdown/);
});

test('a browser that cannot download or print says so instead of failing silently', () => {
  assert.deepEqual(downloadReportFile({ filename: 'd.md', text: REPORT }, { doc: null, url: null, BlobCtor: null }), { ok: false, reason: 'download-unavailable' });
  const printed = [];
  assert.deepEqual(printReport({ win: { print: () => printed.push('print') } }), { ok: true, reason: null });
  assert.deepEqual(printed, ['print']);
  assert.deepEqual(printReport({ win: {} }), { ok: false, reason: 'print-unavailable' });
  assert.deepEqual(printReport({ win: { print: () => { throw new Error('blocked'); } } }), { ok: false, reason: 'print-failed' });
});
