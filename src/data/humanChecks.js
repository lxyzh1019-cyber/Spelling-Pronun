// Checks a person has to run, because no test can run them.
//
// Every entry here is something the app cannot verify about itself: whether a
// voice is intelligible in a real room, whether Safari on the real iPad keeps a
// session, whether a child understands a lesson. The page at /checks walks
// through them one prompt at a time and records what the parent observed.
//
// A recorded result is a parent observation and nothing more. It never releases
// content, never becomes mastery evidence, and never turns a release gate green
// — see `gateStateAfterChecks` in src/learning/humanChecks.js, which returns the
// gate's own state no matter what has been recorded here.

export const humanChecks = [
  {
    id: 'check.listening.dictation',
    gateId: 'c0-audio-review',
    title: 'Listening check — 16 dictation words',
    minutes: 15,
    purpose:
      'These sixteen words are read aloud and the learner types what they hear. If a word is unclear, or the voice says something other than the intended word, the learner is marked wrong for the audio rather than for their spelling.',
    needs: [
      'The iPad the children will actually use',
      'Normal room volume, speaker not headphones',
    ],
    where: { label: 'Open the assessment preview', to: '/assessment' },
    steps: [
      'Start Form A and let the first Part A prompt read itself aloud.',
      'Listen to each dictation word once, at the volume the children would use.',
      'Record Pass, Problem, or Not sure below without typing an answer — you are checking the audio, not taking the assessment.',
      'Use Replay if you need it. Needing three replays to hear the word is itself a problem worth recording.',
      'Repeat for Form B.',
    ],
    passWhen: [
      'The audio says the intended word, and only that word.',
      'It is understandable on the first listen at normal volume.',
      'The voice is not described anywhere on screen as Canadian or as a human recording unless it truthfully is.',
    ],
    doesNotUnlock:
      'Passing every word here does not release the assessment. Part A also needs the educational review of its decoding and speaking prompts, then integration, then learner testing.',
    prompts: [
      { id: 'dict.a.1', label: 'adventure', detail: 'Form A' },
      { id: 'dict.a.2', label: 'carefully', detail: 'Form A' },
      { id: 'dict.a.3', label: 'planned', detail: 'Form A' },
      { id: 'dict.a.4', label: 'disappear', detail: 'Form A' },
      { id: 'dict.a.5', label: 'celebration', detail: 'Form A' },
      { id: 'dict.a.6', label: 'comfortable', detail: 'Form A' },
      { id: 'dict.a.7', label: 'independent', detail: 'Form A' },
      { id: 'dict.a.8', label: 'transportation', detail: 'Form A' },
      { id: 'dict.b.1', label: 'remarkable', detail: 'Form B' },
      { id: 'dict.b.2', label: 'readiness', detail: 'Form B' },
      { id: 'dict.b.3', label: 'stopping', detail: 'Form B' },
      { id: 'dict.b.4', label: 'impatient', detail: 'Form B' },
      { id: 'dict.b.5', label: 'observation', detail: 'Form B' },
      { id: 'dict.b.6', label: 'temperature', detail: 'Form B' },
      { id: 'dict.b.7', label: 'responsible', detail: 'Form B' },
      { id: 'dict.b.8', label: 'communication', detail: 'Form B' },
    ],
  },
  {
    id: 'check.listening.contrast',
    gateId: 'c0-audio-review',
    title: 'Listening check — 8 contrast pairs',
    minutes: 10,
    purpose:
      'Each of these prompts asks the learner to tell two similar-sounding words apart. If the synthesised voice renders both sides the same way, the item tests nothing and the learner can only guess.',
    needs: ['The same iPad and volume as the dictation check'],
    where: { label: 'Open the assessment preview', to: '/assessment' },
    steps: [
      'Play both options in the pair, one after the other.',
      'Ask yourself only this: do they sound different from each other?',
      'Record Problem for any pair where you cannot hear a difference, even if each word on its own is clear.',
    ],
    passWhen: [
      'The two options are audibly different from each other.',
      'Each option is the word it claims to be, not a near neighbour.',
    ],
    doesNotUnlock:
      'A pair that fails here goes back for correction. It must not be carried into the pilot with a note attached.',
    prompts: [
      { id: 'pair.a.1', label: 'ship / sheep', detail: 'Form A' },
      { id: 'pair.a.2', label: 'bit / beat', detail: 'Form A' },
      { id: 'pair.a.3', label: 'full / fool', detail: 'Form A' },
      { id: 'pair.a.4', label: 'cap / cab', detail: 'Form A' },
      { id: 'pair.b.1', label: 'live / leave', detail: 'Form B' },
      { id: 'pair.b.2', label: 'sit / seat', detail: 'Form B' },
      { id: 'pair.b.3', label: 'pull / pool', detail: 'Form B' },
      { id: 'pair.b.4', label: 'rice / rise', detail: 'Form B' },
    ],
  },
  {
    id: 'check.decoding.recordings',
    gateId: 'c0-audio-review',
    title: 'Receptive decoding — 12 recordings',
    minutes: 20,
    purpose:
      'These four items show an invented but pronounceable word and ask the learner to choose which recording matches how the spelling would normally be read. The choice is machine-scored, so a recording that renders the word differently from its intended reading would mark a correct learner wrong.',
    needs: ['The target iPad', 'This table open beside you — each recording has an intended reading'],
    where: { label: 'Open the assessment preview', to: '/assessment' },
    steps: [
      'Find the printed invented word and play all three recordings for it.',
      'For each recording, decide whether it renders the reading described below.',
      'Then ask the deciding question: is the expected reading clearly different from the other two? If a distractor sounds the same as the expected reading, record Problem — the item is not usable.',
    ],
    passWhen: [
      'The recording is intelligible.',
      'It renders the reading described in its note, not some other reading.',
      'The expected reading is the one a Grade 5 reader would produce from the spelling alone.',
    ],
    doesNotUnlock:
      'Until all twelve pass, the validator refuses pilot approval for these items. Recording a pass here does not import a reviewed audio asset; that is a separate step.',
    prompts: [
      { id: 'dec.a.narpish.1', label: 'Narpish — recording 1', detail: 'Should be a long-a misreading (NAIR-pish). Expected reading is NAR-pish.' },
      { id: 'dec.a.narpish.2', label: 'Narpish — recording 2', detail: 'Should be the expected reading: NAR-pish.' },
      { id: 'dec.a.narpish.3', label: 'Narpish — recording 3', detail: 'Should be a long-e misreading of the i (NAR-peesh).' },
      { id: 'dec.a.vemicate.1', label: 'Vemicate — recording 1', detail: 'Should be the expected reading: VEM-ih-kayt.' },
      { id: 'dec.a.vemicate.2', label: 'Vemicate — recording 2', detail: 'Should be a long-e misreading of the first e (VEEM-ih-kayt).' },
      { id: 'dec.a.vemicate.3', label: 'Vemicate — recording 3', detail: 'Should be a short-a misreading of the final syllable (VEM-ih-kat).' },
      { id: 'dec.b.tembish.1', label: 'Tembish — recording 1', detail: 'Should be a long-e misreading of the e (TEEM-bish).' },
      { id: 'dec.b.tembish.2', label: 'Tembish — recording 2', detail: 'Should be a long-e misreading of the i (TEM-beesh).' },
      { id: 'dec.b.tembish.3', label: 'Tembish — recording 3', detail: 'Should be the expected reading: TEM-bish.' },
      { id: 'dec.b.lopadent.1', label: 'Lopadent — recording 1', detail: 'Should be the expected reading: LOH-puh-dent.' },
      { id: 'dec.b.lopadent.2', label: 'Lopadent — recording 2', detail: 'Should be a closed first syllable (LOP-uh-dent).' },
      { id: 'dec.b.lopadent.3', label: 'Lopadent — recording 3', detail: 'Should be a long-a misreading of the middle a (LOH-pay-dent).' },
    ],
  },
  {
    id: 'check.ipad',
    gateId: 'ipad-check',
    title: 'Real iPad — Safari and home screen',
    minutes: 25,
    purpose:
      'Everything above this line was checked in a desktop browser. Safari on a real iPad suspends tabs, handles the microphone differently, and installs to the home screen with its own rules. Desktop emulation does not close this gate.',
    needs: ['The target iPad', 'A few minutes offline (airplane mode is enough)'],
    where: { label: 'Start from the home screen', to: '/' },
    steps: [
      'Open the app in Safari on the iPad and start a lesson.',
      'Work through each row below in order and record what actually happened.',
    ],
    passWhen: [
      'Nothing is lost when the app is interrupted or reloaded.',
      'Every control is large enough to hit with a finger and every focus outline is visible.',
      'Anything that fails is described truthfully on screen rather than failing silently.',
    ],
    doesNotUnlock:
      'A pass here is a device check. It is not learner testing, and it does not release content.',
    prompts: [
      { id: 'ipad.playback', label: 'Audio plays', detail: 'A prompt reads itself aloud through the iPad speaker without a second tap.' },
      { id: 'ipad.microphone', label: 'Microphone permission', detail: 'Start recording asks for permission once, then records. Declining shows a truthful message and does not mark an answer wrong.' },
      { id: 'ipad.interruption', label: 'Interruption', detail: 'Switch apps, or take a call, mid-lesson. Coming back resumes the same question, not a new one.' },
      { id: 'ipad.reload', label: 'Reload', detail: 'Pull to refresh mid-lesson. It returns to the exact same task, and finished work is still counted.' },
      { id: 'ipad.offline', label: 'Offline', detail: 'Turn on airplane mode, answer two questions, then turn it off. Both answers arrive, once each, with nothing duplicated.' },
      { id: 'ipad.install', label: 'Add to Home Screen', detail: 'Install it. The icon is the real icon, it opens without Safari chrome, and it still works.' },
      { id: 'ipad.touch', label: 'Touch targets', detail: 'Every button can be hit accurately with a child’s finger, in both orientations.' },
    ],
  },
  {
    id: 'check.two-device',
    gateId: 'shared-identity',
    title: 'Two linked devices',
    minutes: 20,
    purpose:
      'The session-ownership contract is written and unit-tested against a fake Firestore, but a fake is not two clients against a real project. This check is the only thing that can show the contract holds.',
    needs: [
      'Email/Password enabled in Firebase and the reviewed Firestore rules deployed',
      'Two devices signed into the same parent account',
    ],
    blockedBy: 'Firebase Email/Password sign-in and the deployed rules. Until both are in place this check cannot be run, and recording a result for it would not mean anything.',
    where: { label: 'Open the parent view', to: '/parent' },
    steps: [
      'Sign in as the parent on both devices.',
      'Start a lesson on device one, then open the same lesson on device two.',
      'Work through the rows below on whichever device each one names.',
    ],
    passWhen: [
      'Only one device is writing at a time, and the other says so plainly.',
      'No answer is lost, duplicated, or silently overwritten by the other device.',
    ],
    doesNotUnlock:
      'This closes the two-device gate only. It says nothing about content readiness.',
    prompts: [
      { id: 'two.claim', label: 'Device two sees the session as in use', detail: 'It offers to watch or take over rather than editing straight away.' },
      { id: 'two.takeover', label: 'Explicit takeover works', detail: 'After taking over on device two, device one stops writing and says why.' },
      { id: 'two.stale', label: 'The old device cannot overwrite', detail: 'Answering on device one after the takeover is refused, not silently accepted.' },
      { id: 'two.queued', label: 'Queued answers still arrive', detail: 'Answers made on device one before the takeover are not lost.' },
      { id: 'two.learners', label: 'Learners stay separate', detail: 'Switching to the other child on device two never shows the first child’s answers.' },
    ],
  },
  {
    id: 'check.lesson-journey',
    gateId: 'family-pilot',
    title: 'Learner test — one lesson, watched',
    minutes: 30,
    purpose:
      'This is the check the whole pilot rests on: sit with one child through one lesson and watch what actually happens. Not whether it works — whether it teaches.',
    needs: ['One child', 'The iPad', 'No coaching from you during the lesson'],
    where: { label: 'Open the lessons', to: '/case' },
    steps: [
      'Let the child choose one of the four lessons and start it themselves.',
      'Do not help. Where you would normally step in, write down what you would have said instead.',
      'Afterwards, ask them to explain the rule back to you in their own words.',
    ],
    passWhen: [
      'The child could start and finish without you.',
      'The explanation after a miss made sense to them, not only to you.',
      'They could restate the rule afterwards.',
    ],
    doesNotUnlock:
      'One watched lesson is learner testing evidence for that lesson. Release also needs the pilot window and the device checks.',
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
    gateId: 'family-pilot',
    title: 'Learner test — story episode one',
    minutes: 15,
    purpose:
      'Episode one was rewritten on 2026-09-09 after the sign explanation was found to be wrong. The corrected version and its transfer task have never been read by a child.',
    needs: ['One child', 'The iPad'],
    where: { label: 'Open the case', to: '/case' },
    steps: [
      'Let the child read or play episode one.',
      'Ask what the language clue was and how it helped.',
      'Watch them attempt the transfer task at the end without help.',
    ],
    passWhen: [
      'They can say what the clue was and why it mattered.',
      'The transfer task is attempted, not skipped.',
      'Nothing on screen points at work that does not exist.',
    ],
    doesNotUnlock:
      'Chapter one only. Chapters two to six are not authored.',
    prompts: [
      { id: 'story.follow', label: 'They followed the story', detail: 'The problem and the decision were clear to them.' },
      { id: 'story.clue', label: 'The language clue worked', detail: 'They could explain the clue in their own words.' },
      { id: 'story.sign', label: 'The corrected sign explanation reads correctly', detail: 'Read it yourself first: it must not call a fragment a complete statement.' },
      { id: 'story.transfer', label: 'The transfer task was attempted', detail: 'They tried it unaided rather than skipping past.' },
    ],
  },
  {
    id: 'check.assessment-resume',
    gateId: 'family-pilot',
    title: 'Assessment — pause, leave, come back',
    minutes: 10,
    purpose:
      'A 34-item assessment will be interrupted. The resume path is unit-tested and was checked in a desktop browser, but not by a child who wandered off in the middle of it.',
    needs: ['The iPad'],
    where: { label: 'Open the assessment preview', to: '/assessment' },
    steps: [
      'Start Form A and answer five questions.',
      'Leave the app entirely for at least ten minutes.',
      'Come back and continue.',
    ],
    passWhen: [
      'It resumes at question six, not question one.',
      'The five answers are still there and are not counted twice.',
      'Switching to the other child and back shows each of them their own place.',
    ],
    doesNotUnlock:
      'Resume behaviour only. The assessment stays unreleased regardless of the result.',
    prompts: [
      { id: 'resume.place', label: 'Resumed in the right place', detail: 'Question six, with the first five recorded once each.' },
      { id: 'resume.switch', label: 'Learner switch is clean', detail: 'The other child sees their own untouched session, not this one.' },
      { id: 'resume.double', label: 'No double submission', detail: 'Tapping submit twice quickly records one answer.' },
    ],
  },
];

export function findCheck(id, checks = humanChecks) {
  return checks.find((check) => check.id === id) || null;
}
