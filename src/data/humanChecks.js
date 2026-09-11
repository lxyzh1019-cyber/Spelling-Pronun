// Checks a person has to run, because no test can run them.
//
// Two areas, and the difference between them is the whole point.
//
// The Technical Test Lab checks the machine: is the audio intelligible, does
// Safari keep a session, does an offline answer arrive once. Nothing in it may
// touch Jenn's or Jess's records, so its scenarios run against an isolated test
// namespace rather than a real lesson, and its audio plays here rather than
// inside the assessment.
//
// Family Pilot Observation checks the child, which means the child really uses
// the app: a real lesson, a real story, real answers saved to that learner. The
// area says so before it opens anything.
//
// A recorded result is a parent observation in either area. It never releases
// content, never becomes mastery evidence, and never turns a release gate green
// — see `gateStateAfterChecks` in src/learning/humanChecks.js, which returns the
// gate's own state no matter what has been recorded here.

import { buildAudioRows, rowsInGroup } from '../learning/testLabAudio.js';
import { c0AssessmentItems } from './assessment.c0.draft.js';
import { c0AssessmentAudioAssets } from './audio.c0.js';

export const TEST_LAB_BANNER = 'Test Lab — these checks do not change Jenn’s or Jess’s learning progress.';
export const PILOT_WARNING = 'This opens the normal learning app. Answers and progress will be saved to the selected child.';

export const audioRows = buildAudioRows(c0AssessmentItems, c0AssessmentAudioAssets);

// Audio prompts are derived from the version-pinned assessment items, never typed out here.
function audioPrompts(group) {
  return rowsInGroup(audioRows, group).map((row) => ({
    id: row.rowId,
    label: row.label,
    detail: row.detail,
    audio: row,
  }));
}

export const humanChecks = [
  {
    id: 'check.listening.dictation',
    area: 'testlab',
    gateId: 'c0-audio-review',
    title: 'Listening check — the dictation words',
    minutes: 15,
    purpose:
      'These words are read aloud and the learner types what they hear. If a word is unclear, or the voice says something other than the intended word, the learner is marked wrong for the audio rather than for their spelling.',
    needs: [
      'The iPad the children will actually use',
      'Normal room volume, speaker not headphones',
    ],
    steps: [
      'Play each word once, at the volume the children would use.',
      'Record what you heard before replaying. Needing three replays to catch the word is itself worth recording.',
      'You are checking the audio, not taking the assessment — nothing here is answered or scored.',
    ],
    passWhen: [
      'The audio says the intended word, and only that word.',
      'It is understandable on the first listen at normal volume.',
      'The voice is never described on screen as Canadian or as a human recording unless it truthfully is.',
    ],
    doesNotUnlock:
      'Passing every word here does not release the assessment. Part A also needs the educational review of its decoding and speaking prompts, then integration, then learner testing.',
    promptSource: { kind: 'audio', group: 'dictation' },
    prompts: audioPrompts('dictation'),
  },
  {
    id: 'check.listening.contrast',
    area: 'testlab',
    gateId: 'c0-audio-review',
    title: 'Listening check — the contrast pairs',
    minutes: 10,
    purpose:
      'Each of these prompts asks the learner to tell two similar-sounding words apart. If both sides come out the same, the item tests nothing and the learner can only guess. The assessment speaks only its target, so the Test Lab speaks the other side too — that comparison is the only way to answer the question.',
    needs: ['The same iPad and volume as the dictation check'],
    steps: [
      'Play the target the app speaks, then the comparison side, one after the other.',
      'Ask yourself only this: do they sound different from each other?',
      'Record a problem for any pair you cannot tell apart, even if each word on its own is clear.',
    ],
    passWhen: [
      'The two sides are audibly different from each other.',
      'Each one is the word it claims to be, not a near neighbour.',
    ],
    doesNotUnlock:
      'A pair that fails here goes back for correction. It must not be carried into the pilot with a note attached.',
    promptSource: { kind: 'audio', group: 'contrast' },
    prompts: audioPrompts('contrast'),
  },
  {
    id: 'check.decoding.recordings',
    area: 'testlab',
    gateId: 'c0-audio-review',
    title: 'Receptive decoding — the twelve recordings',
    minutes: 20,
    purpose:
      'These four items show an invented but pronounceable word and ask the learner to choose which recording matches how the spelling would normally be read. The choice is machine-scored, so a recording that renders the word differently from its intended reading would mark a correct learner wrong.',
    needs: ['The target iPad', 'Each row states the reading it is supposed to produce'],
    steps: [
      'Play all three recordings for one invented word before judging any of them.',
      'For each, decide whether it renders the reading its row describes.',
      'Then the deciding question: is the expected reading clearly different from the other two? If a distractor sounds the same as the expected reading, record a problem — the item is not usable.',
    ],
    passWhen: [
      'The recording is intelligible.',
      'It renders the reading described in its row, not some other reading.',
      'The expected reading is the one a Grade 5 reader would produce from the spelling alone.',
    ],
    doesNotUnlock:
      'Until all twelve pass, the validator refuses pilot approval for these items. Recording a pass here does not import a reviewed audio asset; that is a separate step.',
    promptSource: { kind: 'audio', group: 'decoding' },
    prompts: audioPrompts('decoding'),
  },
  {
    id: 'check.ipad',
    area: 'testlab',
    gateId: 'ipad-check',
    title: 'Real iPad — Safari and home screen',
    minutes: 25,
    purpose:
      'Everything else was checked in a desktop browser. Safari on a real iPad suspends tabs, handles the microphone differently, and installs to the home screen with its own rules. Desktop emulation does not close this gate.',
    needs: ['The target iPad', 'A few minutes offline (airplane mode is enough)'],
    scenario: 'device',
    steps: [
      'Open the app on the iPad and start the Test Lab practice run below. It uses invented practice questions and a separate test record.',
      'Work each row in order and record what actually happened.',
    ],
    passWhen: [
      'Nothing is lost when the app is interrupted or reloaded.',
      'Every control is large enough to hit with a finger and every focus outline is visible.',
      'Anything that fails is described truthfully on screen rather than failing silently.',
    ],
    doesNotUnlock:
      'A pass here is a device check. It is not learner testing, and it does not release content.',
    prompts: [
      { id: 'ipad.playback', label: 'Audio plays', detail: 'A row above reads itself aloud through the iPad speaker without a second tap.' },
      { id: 'ipad.microphone', label: 'Microphone permission', detail: 'The practice run asks for permission once, then records. Declining shows a truthful message and marks nothing wrong.' },
      { id: 'ipad.interruption', label: 'Interruption', detail: 'Switch apps, or take a call, mid-run. Coming back resumes the same question, not a new one.' },
      { id: 'ipad.install', label: 'Add to Home Screen', detail: 'Install it. The icon is the real icon, it opens without Safari chrome, and it still works.' },
      { id: 'ipad.touch', label: 'Touch targets', detail: 'Every button can be hit accurately with a child’s finger, in both orientations.' },
      { id: 'ipad.focus', label: 'Focus and zoom', detail: 'Tapping a text box does not zoom the page in and leave it stuck there.' },
    ],
  },
  {
    id: 'check.resume',
    area: 'testlab',
    gateId: 'ipad-check',
    title: 'Practice run — resume, offline, double submit',
    minutes: 15,
    purpose:
      'A long session will be interrupted, and an answer will be given with no signal. These paths are unit-tested, but they have never been interrupted by an actual person on an actual device. This run uses invented practice questions and its own test record, so nothing here reaches either child.',
    needs: ['Any device', 'The ability to turn the network off briefly'],
    scenario: 'resume',
    steps: [
      'Start the practice run below and answer the first two questions.',
      'Reload the page, then work the rows in order.',
    ],
    passWhen: [
      'It comes back where you left it, with earlier answers counted once each.',
      'An answer given offline arrives exactly once when the network returns.',
    ],
    doesNotUnlock:
      'This exercises the same rules the real session uses, against a test record. It is not evidence about a child, and it is not the two-device check.',
    prompts: [
      { id: 'resume.place', label: 'Resumed in the right place', detail: 'After a reload, the run continues at the next unanswered question.' },
      { id: 'resume.counted', label: 'Earlier answers counted once', detail: 'The finished count matches what you actually answered, with nothing doubled.' },
      { id: 'resume.double', label: 'No double submission', detail: 'Tapping submit twice quickly records one answer.' },
      { id: 'resume.offline', label: 'Offline answer arrives once', detail: 'Answer with the network off, turn it back on, and the answer appears exactly once.' },
      { id: 'resume.reset', label: 'Reset clears only this run', detail: 'Reset this test run empties the practice record and leaves everything else untouched.' },
    ],
  },
  {
    id: 'check.two-device',
    area: 'testlab',
    gateId: 'shared-identity',
    title: 'Two linked devices',
    minutes: 20,
    purpose:
      'The session-ownership contract is written and unit-tested against a fake Firestore, but a fake is not two clients against a real project. This check is the only thing that can show the contract holds.',
    needs: [
      'Email/Password enabled in Firebase and the reviewed rules deployed, including the Test Lab collection',
      'Two devices signed into the same parent account',
    ],
    requiresPreflight: 'twoDevice',
    scenario: 'twoDevice',
    steps: [
      'Sign in as the parent on both devices and open this page on each.',
      'Start the Test Lab session on device one, then open it on device two.',
      'Work the rows below on whichever device each names.',
    ],
    passWhen: [
      'Only one device is writing at a time, and the other says so plainly.',
      'No answer is lost, duplicated, or silently overwritten by the other device.',
    ],
    doesNotUnlock:
      'This closes the two-device gate only, and only after you have really done it on two devices. A passing preflight means the check can be run, not that it has been.',
    prompts: [
      { id: 'two.claim', label: 'Device two sees the session as in use', detail: 'It offers to watch or take over rather than editing straight away.' },
      { id: 'two.takeover', label: 'Explicit takeover works', detail: 'After taking over on device two, device one stops writing and says why.' },
      { id: 'two.stale', label: 'The old device cannot overwrite', detail: 'Answering on device one after the takeover is refused, not silently accepted.' },
      { id: 'two.queued', label: 'Queued answers still arrive', detail: 'Answers made on device one before the takeover are not lost.' },
      { id: 'two.cleanup', label: 'The test record is removable', detail: 'Reset this test run removes the Test Lab session from both devices.' },
    ],
  },
  {
    id: 'check.lesson-journey',
    area: 'pilot',
    gateId: 'family-pilot',
    title: 'Learner test — one lesson, watched',
    minutes: 30,
    purpose:
      'This is the check the whole pilot rests on: sit with one child through one real lesson and watch what happens. Not whether it works — whether it teaches.',
    needs: ['One child', 'The iPad', 'No coaching from you during the lesson'],
    where: { label: 'Open the lessons', to: '/case' },
    steps: [
      'Choose the child below and confirm, then let them start a lesson themselves.',
      'Do not help. Where you would normally step in, write down what you would have said instead.',
      'Afterwards, ask them to explain the rule back to you in their own words.',
    ],
    passWhen: [
      'The child could start and finish without you.',
      'The explanation after a miss made sense to them, not only to you.',
      'They could restate the rule afterwards.',
    ],
    doesNotUnlock:
      'One watched lesson is learner-testing evidence for that lesson. Release also needs the pilot window and the device checks.',
    prompts: [
      { id: 'lesson.start', label: 'Started it alone', detail: 'The child found and started the lesson without being shown how.' },
      { id: 'lesson.teach', label: 'The teaching step landed', detail: 'They could say what the rule was before the first question.' },
      { id: 'lesson.miss', label: 'A miss was useful', detail: 'After a wrong answer, the repair step changed what they did next.' },
      { id: 'lesson.help', label: 'Help was findable', detail: 'They found More help when stuck, instead of guessing or stopping.' },
      { id: 'lesson.length', label: 'The length was right', detail: 'They finished without drifting off, and were not cut short mid-thought.' },
      { id: 'lesson.restate', label: 'They could restate the rule', detail: 'In their own words, afterwards, without the screen.' },
    ],
  },
  {
    id: 'check.story',
    area: 'pilot',
    gateId: 'family-pilot',
    title: 'Learner test — story episode one',
    minutes: 15,
    purpose:
      'Episode one was rewritten on 2026-09-09 after the sign explanation was found to be wrong. The corrected version and its restored transfer task have never been read by a child.',
    needs: ['One child', 'The iPad'],
    where: { label: 'Open the case', to: '/case' },
    steps: [
      'Read the corrected sign explanation yourself first.',
      'Choose the child below and confirm, then let them read or play episode one.',
      'Ask what the language clue was and how it helped, then watch them attempt the transfer task unaided.',
    ],
    passWhen: [
      'They can say what the clue was and why it mattered.',
      'The transfer task is attempted, not skipped.',
      'Nothing on screen points at work that does not exist.',
    ],
    doesNotUnlock: 'Chapter one only. Chapters two to six are not authored.',
    prompts: [
      { id: 'story.follow', label: 'They followed the story', detail: 'The problem and the decision were clear to them.' },
      { id: 'story.clue', label: 'The language clue worked', detail: 'They could explain the clue in their own words.' },
      { id: 'story.sign', label: 'The corrected sign explanation reads correctly', detail: 'Read it yourself: it must not call a fragment a complete statement.' },
      { id: 'story.transfer', label: 'The transfer task was attempted', detail: 'They tried it unaided rather than skipping past.' },
    ],
  },
];

export function findCheck(id, checks = humanChecks) {
  return checks.find((check) => check.id === id) || null;
}
