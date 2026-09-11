// The audio rows the parent listens to, derived from the assessment itself.
//
// Nothing here is a hand-written list of words. Every row is built from a
// version-pinned item in the real forms, so a row cannot quietly drift away from
// what the app will actually play. Each row carries the item id and version it
// came from, and the playback options are the ones AssessmentRunner uses.
//
// One row is deliberately not something the app plays. A contrast item speaks
// only its target — `c0.assessment.a.13` speaks "ship", and "sheep" exists only
// as choice text — so the question the check exists to answer, can a child tell
// them apart, is unanswerable from the app alone. The Test Lab therefore builds
// a comparison utterance from the item's own distractor choice and labels it as
// a comparison. It is never presented as assessment audio.

// Matches AssessmentRunner: item audio at 0.82, choice audio at 0.78.
export const ITEM_RATE = 0.82;
export const CHOICE_RATE = 0.78;
export const REQUESTED_LOCALE = 'en-CA';

export const AUDIO_GROUPS = ['dictation', 'contrast', 'decoding'];

function playbackFor(item, { text, rate, audioById }) {
  const asset = item.audioRef ? audioById?.get(item.audioRef) : null;
  if (asset?.url) {
    return { kind: 'reviewed_asset', assetId: asset.id, url: asset.url, locale: asset.locale, transcript: asset.transcript };
  }
  return { kind: 'synthetic', text, lang: REQUESTED_LOCALE, rate };
}

function dictationRow(item, audioById) {
  return {
    rowId: `${item.id}:target`,
    group: 'dictation',
    itemId: item.id,
    itemVersion: item.version,
    form: item.form,
    label: item.spokenText,
    detail: `Form ${item.form} dictation. The learner types what they hear.`,
    text: item.spokenText,
    playback: playbackFor(item, { text: item.spokenText, rate: ITEM_RATE, audioById }),
    comparisonOnly: false,
  };
}

// Both sides of a pair: the target the app speaks, and the distractor it does not.
function contrastRows(item, audioById) {
  const targetChoice = item.choices.find((choice) => item.acceptedAnswers.includes(choice.id));
  const otherChoice = item.choices.find((choice) => choice.id !== targetChoice?.id);
  const pair = item.choices.map((choice) => choice.text).join(' / ');
  const rows = [{
    rowId: `${item.id}:target`,
    group: 'contrast',
    itemId: item.id,
    itemVersion: item.version,
    form: item.form,
    label: `${pair} — the word the app speaks (${item.spokenText})`,
    detail: 'This is the assessment audio itself. It must say this word and only this word.',
    text: item.spokenText,
    playback: playbackFor(item, { text: item.spokenText, rate: ITEM_RATE, audioById }),
    comparisonOnly: false,
  }];
  if (otherChoice) {
    rows.push({
      rowId: `${item.id}:compare`,
      group: 'contrast',
      itemId: item.id,
      itemVersion: item.version,
      form: item.form,
      label: `${pair} — the other option for comparison (${otherChoice.text})`,
      detail: 'The assessment never plays this. The Test Lab speaks it so you can hear whether the two are distinguishable. Record a problem if they sound the same.',
      text: otherChoice.text,
      // Same rate as the target, or the comparison would not be fair.
      playback: { kind: 'synthetic', text: otherChoice.text, lang: REQUESTED_LOCALE, rate: ITEM_RATE },
      comparisonOnly: true,
    });
  }
  return rows;
}

function decodingRows(item) {
  return item.choices.map((choice) => ({
    rowId: `${item.id}:${choice.id}`,
    group: 'decoding',
    itemId: item.id,
    itemVersion: item.version,
    form: item.form,
    label: `${item.printedWord} — ${choice.text}`,
    detail: choice.checkerNote,
    text: choice.spokenText,
    printedWord: item.printedWord,
    targetPronunciation: item.targetPronunciation,
    expected: item.acceptedAnswers.includes(choice.id),
    playback: { kind: 'synthetic', text: choice.spokenText, lang: REQUESTED_LOCALE, rate: CHOICE_RATE },
    comparisonOnly: false,
  }));
}

export function buildAudioRows(items = [], audioAssets = []) {
  const audioById = new Map(audioAssets.map((asset) => [asset.id, asset]));
  const ordered = [...items].sort((a, b) => (a.form || '').localeCompare(b.form || '') || (a.order || 0) - (b.order || 0));
  const rows = [];
  for (const item of ordered) {
    if (item.category === 'spelling_dictation') rows.push(dictationRow(item, audioById));
    else if (item.category === 'listening') rows.push(...contrastRows(item, audioById));
    else if (item.category === 'receptive_decoding') rows.push(...decodingRows(item));
  }
  return rows;
}

export function rowsInGroup(rows = [], group) {
  return rows.filter((row) => row.group === group);
}

// What the page says after a row plays, without overstating what was heard.
export function playbackDisclosure(row, result = {}) {
  if (!result.ok) return 'Playback failed. Record this as a problem with the audio, not as anything about a learner.';
  if (row.playback.kind === 'reviewed_asset') {
    return row.playback.locale === REQUESTED_LOCALE
      ? 'Reviewed recording played, labelled Canadian English.'
      : `Reviewed recording played. Its locale is ${row.playback.locale || 'not stated'}, not ${REQUESTED_LOCALE}.`;
  }
  const locale = result.usedRequestedLocale
    ? `Synthetic preview audio, ${REQUESTED_LOCALE} voice.`
    : `Synthetic preview audio. No ${REQUESTED_LOCALE} voice is installed, so another English voice was used.`;
  return row.comparisonOnly ? `${locale} This one is a Test Lab comparison; the assessment does not play it.` : locale;
}
