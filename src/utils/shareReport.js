// Getting a report off the device, and saying truthfully which way it went.
//
// The diagnostic's answers live only in the browser that recorded them — that is the point of the
// fenced store — so the exported report is the only way a result ever reaches the parent's next
// conversation. Until now the only route was `navigator.clipboard.writeText` inside a try/catch. On
// an iPad that call fails outside a secure context and outside a user gesture, and a button that
// announced "Copied" anyway would be telling the parent their child's result had been saved when it
// had not.
//
// So every function here returns what actually happened, in the same shape `speak()` returns:
// `{ ok, ... }` with a reason, never a bare boolean and never a silent success. `shareReportText`
// also reports `via`, so the page can say "share sheet", "copied", or "nothing was copied — use the
// text below" rather than guessing which of the three it was.
//
// Dependencies are injected the way `recording.js` injects `MediaRecorder`, so `node --test` covers
// all three paths with no browser.

export async function shareReportText({ title, text }, { nav = globalThis.navigator } = {}) {
  if (!text) return { ok: false, via: 'manual', reason: 'nothing-to-share' };

  // The iPad share sheet: mail, messages, notes, AirDrop. The only route that does not depend on the
  // clipboard at all.
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ title, text });
      return { ok: true, via: 'share', reason: null };
    } catch (error) {
      // A dismissed share sheet is a decision, not a failure to work around. Copying instead would
      // put the child's result somewhere the parent just chose not to put it.
      if (error?.name === 'AbortError') return { ok: false, via: 'share', reason: 'cancelled' };
    }
  }

  if (typeof nav?.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text);
      return { ok: true, via: 'clipboard', reason: null };
    } catch {
      return { ok: false, via: 'manual', reason: 'copy-blocked' };
    }
  }

  return { ok: false, via: 'manual', reason: 'unavailable' };
}

// A dated file, so two exports a week apart do not overwrite each other in the downloads folder.
// `ok` means the browser was handed the file, which is as much as this can honestly claim.
export function downloadReportFile({ filename, text }, {
  doc = globalThis.document,
  url = globalThis.URL,
  BlobCtor = globalThis.Blob,
  defer = globalThis.setTimeout,
} = {}) {
  if (typeof doc?.createElement !== 'function' || typeof url?.createObjectURL !== 'function' || typeof BlobCtor !== 'function') {
    return { ok: false, reason: 'download-unavailable' };
  }
  let objectUrl = '';
  try {
    objectUrl = url.createObjectURL(new BlobCtor([text], { type: 'text/markdown;charset=utf-8' }));
    const anchor = doc.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    // Safari on iOS ignores a click on an anchor that is not in the document.
    doc.body?.appendChild?.(anchor);
    anchor.click();
    doc.body?.removeChild?.(anchor);
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: 'download-failed' };
  } finally {
    // Released, but not before the click has been handled: revoking in the same tick cancels the
    // download in Safari.
    if (objectUrl && typeof url.revokeObjectURL === 'function') {
      if (typeof defer === 'function') defer(() => url.revokeObjectURL(objectUrl), 0);
      else url.revokeObjectURL(objectUrl);
    }
  }
}

// Printing, and on an iPad "Save as PDF" from the same sheet. The print stylesheet decides what is
// on the page; this only opens the dialog.
export function printReport({ win = globalThis.window } = {}) {
  if (typeof win?.print !== 'function') return { ok: false, reason: 'print-unavailable' };
  try {
    win.print();
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: 'print-failed' };
  }
}
