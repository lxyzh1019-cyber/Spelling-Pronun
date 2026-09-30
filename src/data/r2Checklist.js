// What is left before R2 (M3, the pilot release) can be called done, as one list.
//
// R2 closes on four things: the two-device check, the real iPad check, the listening check, and a
// family pilot that meets the exit rule R2-G7 (docs/MASTER_PLAN.md §12). Each item names the gate
// in `r2GateTracker.js` it feeds, and where its answer comes from:
//
// - `source: 'app'` — worked out from real pilot answers saved on this device. It cannot be ticked
//   by hand; a stored tick against it is ignored.
// - `source: 'parent'` — ticked by the parent, with a note.
//
// `perLearner` items appear once per child on this device, taken from the app's own profiles.
//
// A tick here is the parent's own record. It never changes a gate's state, never counts as mastery,
// and never shows that a pilot happened; see `checklistProgress` in src/learning/r2Checklist.js.

export const R2_CHECKLIST_GROUPS = [
  { id: 'setup', title: 'Setup checks' },
  { id: 'pilot', title: 'Pilot window' },
  { id: 'problems', title: 'Problems log' },
  { id: 'exit', title: 'Exit check (R2-G7)' },
];

export const r2ChecklistItems = [
  {
    id: 'setup.two-device',
    group: 'setup',
    gateId: 'shared-identity',
    source: 'parent',
    label: 'Two devices share progress',
    detail: 'Done on two real devices signed in to the same parent account: a session taken over on one is refused on the other, and nothing is lost.',
    testLabChecks: ['check.two-device'],
  },
  {
    id: 'setup.ipad',
    group: 'setup',
    gateId: 'ipad-check',
    source: 'parent',
    label: 'The real iPad check',
    detail: 'Audio, microphone, interruption, home screen and resume, checked on the iPad the children use.',
    testLabChecks: ['check.ipad', 'check.resume'],
  },
  {
    id: 'setup.listening',
    group: 'setup',
    gateId: 'c0-audio-review',
    source: 'parent',
    label: 'The listening check',
    detail: 'Every dictation word, contrast pair and decoding recording heard on the iPad at normal volume.',
    testLabChecks: ['check.listening.dictation', 'check.listening.contrast', 'check.decoding.recordings'],
  },
  {
    id: 'pilot.visits',
    group: 'pilot',
    gateId: 'family-pilot',
    source: 'app',
    perLearner: true,
    label: 'Days with pilot answers (at least 2)',
  },
  {
    id: 'pilot.review',
    group: 'pilot',
    gateId: 'family-pilot',
    source: 'app',
    perLearner: true,
    label: 'A review at least 7 days after a skill was first practised',
  },
  {
    id: 'pilot.baseline',
    group: 'pilot',
    gateId: 'family-pilot',
    source: 'app',
    perLearner: true,
    label: 'Starting result',
  },
  {
    id: 'pilot.resumed',
    group: 'pilot',
    gateId: 'family-pilot',
    source: 'parent',
    perLearner: true,
    label: 'Came back and carried on where she left off',
    detail: 'The app does not record a resume as such, so this one is yours to tick.',
  },
  {
    id: 'exit.no-lost-progress',
    group: 'exit',
    gateId: 'family-pilot',
    source: 'parent',
    label: 'No progress was lost',
  },
  {
    id: 'exit.no-wrong-marking',
    group: 'exit',
    gateId: 'family-pilot',
    source: 'parent',
    label: 'No right answer was marked wrong',
  },
  {
    id: 'exit.no-stuck-navigation',
    group: 'exit',
    gateId: 'family-pilot',
    source: 'parent',
    label: 'No screen left her stuck',
  },
  {
    id: 'exit.problems-decided',
    group: 'exit',
    gateId: 'family-pilot',
    source: 'parent',
    requiresDecisions: true,
    label: 'Every problem has a severity and a decision',
  },
];
