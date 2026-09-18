// Replacement text for the corrections raised by the 2026-09-17 content audit.
//
// INSTALLED, 2026-09-18. The parent reviewed these and resolved `corr.c0.007` to `corr.c0.012`, so
// the item-level replacements below are what a child now sees: `installReplacements` applies them to
// the authored rows and moves each corrected item to version 2. The pack and form versions do not
// move, so the educational review records and the 2026-09-09 pilot approval stay valid, which is how
// the 2026-09-08 corrections were installed. The original rows stay in `packs.c0.draft.js` and
// `assessment.c0.draft.js` and the records stay in `corrections.c0.json`, so the defect and its
// replacement are both still readable.
//
// `storyReplacements` is NOT installed. The parent approved its text on 2026-09-18, but an episode
// carries its own version and the 2026-09-09 pilot approval pins version 2. Installing it makes the
// episodes version 3, and `validatePilotApprovals` rejects an approval naming a version the content
// no longer has. Recording a version 3 approval is the parent's decision and nobody else's, so
// `corr.c0.013` stays open until they make it.
//
// These are `improvement` corrections, not defects: every affected item teaches and grades correctly
// today. What is wrong is how well it measures. A fragment that is the only option without an end mark
// can be picked without reading the words; a two-option question is a coin toss, and `deriveMastery`
// reaches `developing` after three correct answers without modelling chance. Because none of this is
// false teaching, the items keep running while the drafts wait, and installing a draft is what the
// parent's approval does.
//
// Each entry names the audit finding it closes and carries the exact replacement text, so the parent
// reads what the child would see rather than a description of it. `test/correctionReplacements.test.js`
// proves every draft actually satisfies the rule its finding names.
//
// What the tests cannot prove is that a new distractor is genuinely wrong, which is why these need a
// person. An adversarial read of the first draft caught three that were defensible answers: "A Wrinkle
// In Time" is correct under any style that capitalises every word, and "paired Sam with hers" and
// "showed theirs the display" both read as "with her one" and "their one". All three were replaced.
// Read the rest the same way: an option that can be argued for makes the question unfair.
//
// FOUR OPTIONS, 2026-09-18. The parent asked for four options rather than three wherever the content
// supports it: a third option takes a blind guess from 50% to 33%, a fourth takes it to 25%. Most items
// carry four. `THREE_OPTION_ITEMS` below lists the ones that do not and says why for each, and a test
// asserts that every other item has four, so a future edit cannot quietly drop back to three. The reason
// is always the same shape: the answer set is closed, and the only available fourth option would either
// be defensible (which makes the question unfair) or obvious nonsense (which is a coin flip wearing an
// extra option, the exact fault this correction exists to fix). Adding a fourth choice to `runnning`
// would have reproduced the defect being repaired.

// Items that keep three options, with the reason each one cannot take a fourth.
export const THREE_OPTION_ITEMS = {
  'c0.sp.patterns.03': 'run + -ing has exactly three error patterns worth offering: no doubling (runing), the silent-e rule misapplied (runeing), and the correct form. A fourth would have to be a typo nobody reasons about.',
  'c0.gr.subject-object-pronouns.12': 'The slot "The teacher paired Sam with ___" accepts any object pronoun grammatically, so every remaining fourth option is either another wrong-case form that repeats what "she" already tests, or defensible (herself, them, him all read as real sentences).',
  'c0.assessment.a.11': 'The options are three spoken recordings. A fourth means recording a fourth pronunciation of an invented word, which is new spoken content needing a human listening check — and this prompt is already blocked on exactly that check.',
  'c0.assessment.a.12': 'The options are three spoken recordings; see c0.assessment.a.11.',
  'c0.assessment.b.11': 'The options are three spoken recordings; see c0.assessment.a.11.',
  'c0.assessment.b.12': 'The options are three spoken recordings; see c0.assessment.a.11.',
  'c0.assessment.a.13': 'their / there / they’re is the complete homophone set.',
  'c0.assessment.a.14': 'their / there / they’re is the complete homophone set.',
  'c0.assessment.a.15': 'English -ed has exactly three endings: an added syllable, a d sound, a t sound.',
  'c0.assessment.a.16': 'girls / girl’s / girls’ is the complete set of forms for that word.',
  'c0.assessment.b.13': 'your / you’re / yours is the complete set.',
  'c0.assessment.b.14': 'your / you’re / yours is the complete set.',
  'c0.assessment.b.15': 'English -ed has exactly three endings: an added syllable, a d sound, a t sound.',
  'c0.assessment.b.16': 'dogs / dog’s / dogs’ is the complete set of forms for that word.',
};

// --- Finding A2 + A3, sentence pack ------------------------------------------------------------
// Every fragment gains an end mark, so the full stop stops marking the answer out. Each item now
// offers the complete sentence against three fragments of three DIFFERENT kinds — a phrase beginning
// with a preposition, a clause that cannot stand alone, a naming phrase with no verb of its own, or an
// -ing phrase — so the item still teaches that completeness is about a subject and a predicate rather
// than about length or punctuation, and a learner cannot pass by spotting one familiar wrong shape.
export const sentenceReplacements = {
  'c0.se.complete.03': { answer: 'a', choices: [['a', 'The fox crossed the frozen pond.'], ['b', 'Across the frozen pond.'], ['c', 'The fox on the frozen pond.'], ['d', 'Crossing the frozen pond.']] },
  'c0.se.complete.04': { answer: 'a', choices: [['a', 'Our neighbour repairs bicycles.'], ['b', 'Beside our neighbour’s garage.'], ['c', 'Our neighbour with the red toolbox.'], ['d', 'Repairing bicycles all afternoon.']] },
  'c0.se.complete.05': { answer: 'b', choices: [['a', 'Before the next stop.'], ['b', 'Check the route before the next stop.'], ['c', 'Checking the route carefully.'], ['d', 'Until the route is checked.']] },
  'c0.se.complete.06': { answer: 'a', choices: [['a', 'Did the package arrive?'], ['b', 'When the package arrived.'], ['c', 'The package from the post office.'], ['d', 'Arriving at the post office.']] },
  'c0.se.complete.07': { answer: 'c', choices: [['a', 'The noisy machine.'], ['b', 'Working after lunch.'], ['c', 'The noisy machine stopped after lunch.'], ['d', 'Because the machine was noisy.']] },
  'c0.se.complete.08': { answer: 'b', choices: [['a', 'Because the trail was muddy.'], ['b', 'The trail was muddy after the storm.'], ['c', 'The muddy trail after the storm.'], ['d', 'Walking along the muddy trail.']] },
  'c0.se.complete.09': { answer: 'a', choices: [['a', 'Please close the window.'], ['b', 'Near the open window.'], ['c', 'Closing the window quietly.'], ['d', 'After the window was closed.']] },
  'c0.se.complete.10': { answer: 'c', choices: [['a', 'If the lights turn off.'], ['b', 'During the final scene.'], ['c', 'The lights turned off during the final scene.'], ['d', 'The dark theatre in the final scene.']] },
  'c0.se.complete.11': { answer: 'a', choices: [['a', 'My cousins from Calgary are visiting.'], ['b', 'My cousins from Calgary.'], ['c', 'Visiting from Calgary this week.'], ['d', 'Since my cousins live in Calgary.']] },
  'c0.se.complete.12': { answer: 'b', choices: [['a', 'Running quickly toward the gate.'], ['b', 'The child ran quickly toward the gate.'], ['c', 'The child near the open gate.'], ['d', 'Toward the open gate.']] },
  'c0.se.complete.13': { answer: 'c', choices: [['a', 'Although the recipe looked simple.'], ['b', 'The recipe on the counter.'], ['c', 'The recipe looked simple, but it took an hour.'], ['d', 'Taking almost an hour to finish.']] },
  'c0.se.complete.14': { answer: 'a', choices: [['a', 'There are three messages in the folder.'], ['b', 'Three messages in the folder.'], ['c', 'Three messages that arrived today.'], ['d', 'Inside the shared folder.']] },
  'c0.se.complete.15': { answer: 'b', choices: [['a', 'While everyone was listening.'], ['b', 'Everyone listened quietly.'], ['c', 'Everyone in the quiet room.'], ['d', 'Listening quietly to the speaker.']] },
  'c0.se.complete.16': { answer: 'a', choices: [['a', 'The blue canoe belongs to our team.'], ['b', 'The blue canoe by the dock.'], ['c', 'Belonging to our team this season.'], ['d', 'Beside the wooden dock.']] },
  'c0.se.complete.17': { answer: 'c', choices: [['a', 'Such a surprising ending.'], ['b', 'After a surprising ending.'], ['c', 'The ending surprised us.'], ['d', 'Because the ending surprised us.']] },
  'c0.se.complete.18': { answer: 'b', choices: [['a', 'Whenever the alarm sounds.'], ['b', 'The class follows the safety plan.'], ['c', 'The safety plan on the wall.'], ['d', 'Following the safety plan carefully.']] },
  'c0.se.complete.19': { answer: 'a', choices: [['a', 'Place wet umbrellas in the rack.'], ['b', 'Wet umbrellas in the rack.'], ['c', 'Wet umbrellas that drip on the floor.'], ['d', 'Dripping onto the front hallway.']] },
  'c0.se.complete.20': { answer: 'b', choices: [['a', 'After the council meeting ended.'], ['b', 'The council released its decision.'], ['c', 'The long council meeting on Tuesday.'], ['d', 'Releasing the decision on Tuesday.']] },
  'c0.se.complete.21': { answer: 'c', choices: [['a', 'Behind the community centre.'], ['b', 'Because practice ended early.'], ['c', 'Practice ended early today.'], ['d', 'The early end of practice.']] },
  'c0.se.complete.22': { answer: 'a', choices: [['a', 'Turn left at the library.'], ['b', 'At the library on the left.'], ['c', 'Turning left at the library.'], ['d', 'When you reach the library.']] },
  'c0.se.complete.23': { answer: 'b', choices: [['a', 'Why the door was open.'], ['b', 'Why was the door open?'], ['c', 'The open door at the back.'], ['d', 'Leaving the back door open.']] },
  'c0.se.complete.24': { answer: 'a', choices: [['a', 'The concert begins at seven.'], ['b', 'Before the concert at seven.'], ['c', 'The concert on Friday evening.'], ['d', 'Beginning at seven on Friday.']] },
};

// --- Finding A3, punctuation pack --------------------------------------------------------------
// Each wrong option carries a DIFFERENT error, so the item tests the capital and the end mark
// separately: one option gets the capital wrong, one gets the end mark wrong, and one gets both wrong.
// A learner who has only noticed that "something looks off" still has to decide which thing.
export const punctuationReplacements = {
  'c0.pu.capitals-endmarks.03': { answer: 'a', choices: [['a', 'The library closes at six.'], ['b', 'the library closes at six?'], ['c', 'The library closes at six'], ['d', 'the library closes at six.']] },
  'c0.pu.capitals-endmarks.04': { answer: 'b', choices: [['a', 'Where is my notebook.'], ['b', 'Where is my notebook?'], ['c', 'where is my notebook?'], ['d', 'where is my notebook.']] },
  'c0.pu.capitals-endmarks.06': { answer: 'a', choices: [['a', 'I asked Mateo for help.'], ['b', 'I asked mateo for help.'], ['c', 'i asked Mateo for help.'], ['d', 'i asked mateo for help.']] },
  'c0.pu.capitals-endmarks.07': { answer: 'b', choices: [['a', 'We travelled to red deer.'], ['b', 'We travelled to Red Deer.'], ['c', 'We travelled to Red deer.'], ['d', 'we travelled to Red Deer.']] },
  'c0.pu.capitals-endmarks.08': { answer: 'a', choices: [['a', 'Please pass the ruler.'], ['b', 'please pass the ruler?'], ['c', 'Please pass the ruler?'], ['d', 'please pass the ruler.']] },
  'c0.pu.capitals-endmarks.12': { answer: 'b', choices: [['a', 'a Wrinkle in Time'], ['b', 'A Wrinkle in Time'], ['c', 'a wrinkle in time'], ['d', 'A wrinkle in Time']] },
  'c0.pu.capitals-endmarks.13': { answer: 'a', choices: [['a', 'We visit Grandma Lee on Sunday.'], ['b', 'We visit grandma Lee on sunday.'], ['c', 'We visit Grandma Lee on sunday.'], ['d', 'we visit Grandma Lee on Sunday.']] },
  'c0.pu.capitals-endmarks.14': { answer: 'b', choices: [['a', 'Where should we meet.'], ['b', 'Where should we meet?'], ['c', 'where should we meet?'], ['d', 'where should we meet.']] },
  'c0.pu.capitals-endmarks.17': { answer: 'a', choices: [['a', 'Have you seen the keys?'], ['b', 'Have you seen the keys!'], ['c', 'Have you seen the keys.'], ['d', 'have you seen the keys?']] },
  'c0.pu.capitals-endmarks.19': { answer: 'b', choices: [['a', 'danger falling rocks.'], ['b', 'Danger! Falling rocks.'], ['c', 'Danger! falling rocks.'], ['d', 'danger! Falling rocks.']] },
  'c0.pu.capitals-endmarks.21': { answer: 'a', choices: [['a', 'The snow melted quickly.'], ['b', 'The snow melted quickly?'], ['c', 'the snow melted quickly.'], ['d', 'the snow melted quickly?']] },
  'c0.pu.capitals-endmarks.22': { answer: 'b', choices: [['a', 'My friend moved to nova scotia.'], ['b', 'My friend moved to Nova Scotia.'], ['c', 'My friend moved to Nova scotia.'], ['d', 'my friend moved to Nova Scotia.']] },
};

// --- Finding A3, pronoun pack ------------------------------------------------------------------
// Where the slot takes a single pronoun the wrong options are the four forms a child actually reaches
// for: the other case, the reflexive ("Jordan and myself"), and the possessive. Where the item offers
// whole sentences, each wrong sentence gets a different word wrong — including one that gets the first
// pronoun right and the second wrong — so a learner cannot pass by noticing that a sentence "looks
// wrong" without working out which word is at fault.
export const pronounReplacements = {
  'c0.gr.subject-object-pronouns.03': { answer: 'a', choices: [['a', 'She'], ['b', 'Her'], ['c', 'Herself'], ['d', 'Hers']] },
  'c0.gr.subject-object-pronouns.04': { answer: 'b', choices: [['a', 'we'], ['b', 'us'], ['c', 'they'], ['d', 'ourselves']] },
  'c0.gr.subject-object-pronouns.05': { answer: 'a', choices: [['a', 'I'], ['b', 'me'], ['c', 'myself'], ['d', 'mine']] },
  'c0.gr.subject-object-pronouns.06': { answer: 'b', choices: [['a', 'I'], ['b', 'me'], ['c', 'myself'], ['d', 'mine']] },
  'c0.gr.subject-object-pronouns.08': { answer: 'a', choices: [['a', 'him'], ['b', 'he'], ['c', 'his'], ['d', 'himself']] },
  'c0.gr.subject-object-pronouns.09': { answer: 'b', choices: [['a', 'Her and I checked the list.'], ['b', 'She and I checked the list.'], ['c', 'Her and me checked the list.'], ['d', 'She and me checked the list.']] },
  'c0.gr.subject-object-pronouns.10': { answer: 'a', choices: [['a', 'The message surprised them.'], ['b', 'The message surprised they.'], ['c', 'The message surprised their.'], ['d', 'The message surprised themselves.']] },
  'c0.gr.subject-object-pronouns.12': { answer: 'b', choices: [['a', 'she'], ['b', 'her'], ['c', 'they']] },
  'c0.gr.subject-object-pronouns.13': { answer: 'a', choices: [['a', 'They'], ['b', 'Them'], ['c', 'Their'], ['d', 'Theirs']] },
  'c0.gr.subject-object-pronouns.15': { answer: 'b', choices: [['a', 'Someone left their bottle; them can claim it at the desk.'], ['b', 'Someone left their bottle; they can claim it at the desk.'], ['c', 'Someone left their bottle; their can claim it at the desk.'], ['d', 'Someone left their bottle; themselves can claim it at the desk.']] },
  'c0.gr.subject-object-pronouns.16': { answer: 'a', choices: [['a', 'me'], ['b', 'I'], ['c', 'myself'], ['d', 'mine']] },
  'c0.gr.subject-object-pronouns.18': { answer: 'b', choices: [['a', 'her'], ['b', 'she'], ['c', 'herself'], ['d', 'hers']] },
  'c0.gr.subject-object-pronouns.19': { answer: 'a', choices: [['a', 'They gave the receipt to me.'], ['b', 'Them gave the receipt to I.'], ['c', 'They gave the receipt to I.'], ['d', 'Them gave the receipt to me.']] },
  'c0.gr.subject-object-pronouns.20': { answer: 'b', choices: [['a', 'Her and him measured the water.'], ['b', 'She and he measured the water.'], ['c', 'Her and he measured the water.'], ['d', 'She and him measured the water.']] },
  'c0.gr.subject-object-pronouns.22': { answer: 'a', choices: [['a', 'We'], ['b', 'Us'], ['c', 'Ourselves'], ['d', 'Our']] },
  'c0.gr.subject-object-pronouns.23': { answer: 'b', choices: [['a', 'The guide showed we the map.'], ['b', 'The guide showed us the map.'], ['c', 'The guide showed our the map.'], ['d', 'The guide showed ourselves the map.']] },
  'c0.gr.subject-object-pronouns.24': { answer: 'a', choices: [['a', 'He and I arrived early.'], ['b', 'Him and me arrived early.'], ['c', 'Him and I arrived early.'], ['d', 'He and me arrived early.']] },
};

// --- Finding A3, the one nonsense distractor ---------------------------------------------------
// `runnning` has three n's: no child would choose it, so the item was really a two-option question
// wearing three options. `runeing` replaces it with the mistake the rule is actually about, applying
// the silent-e rule from `hoping` to a word that needs the doubled consonant instead. This item keeps
// three options on purpose; see THREE_OPTION_ITEMS.
export const spellingReplacements = {
  'c0.sp.patterns.03': { answer: 'b', choices: [['a', 'runing'], ['b', 'running'], ['c', 'runeing']] },
};

// --- Finding A3, assessment Part B -------------------------------------------------------------
// Twelve sentence prompts per form, each a straight two-way choice. Each wrong option now carries a
// different error from the others, so a learner cannot pass by eliminating the one option that "looks
// wrong" without deciding which word is at fault. Two kinds of fourth option were deliberately not
// used: a form that is correct under a different reading (a consistent past tense where the item tests
// consistency, a plural possessive where the item tests the singular, a list without the final comma),
// because an option that can be argued for makes the question unfair.
export const assessmentSentenceReplacements = {
  'c0.assessment.a.21': { answer: 'b', choices: [['a', 'we'], ['b', 'us'], ['c', 'ourselves'], ['d', 'our']] },
  'c0.assessment.a.22': { answer: 'a', choices: [['a', 'she'], ['b', 'her'], ['c', 'herself'], ['d', 'hers']] },
  'c0.assessment.a.23': { answer: 'b', choices: [['a', 'When Ava called Mia, she was outside.'], ['b', 'Ava was outside when she called Mia.'], ['c', 'After Ava called Mia, she went outside.'], ['d', 'She was outside when Ava called Mia.']] },
  'c0.assessment.a.24': { answer: 'a', choices: [['a', 'Each of the labels is numbered.'], ['b', 'Each of the labels are numbered.'], ['c', 'Each of the labels were numbered.'], ['d', 'Each of the label is numbered.']] },
  'c0.assessment.a.25': { answer: 'b', choices: [['a', 'We opened the box and examine the page.'], ['b', 'We opened the box and examined the page.'], ['c', 'We open the box and examined the page.'], ['d', 'We opened the box and examining the page.']] },
  'c0.assessment.a.26': { answer: 'a', choices: [['a', 'The archivist’s notes were clear.'], ['b', 'The archivists notes were clear.'], ['c', 'The archivist notes were clear.'], ['d', 'The archivists’s notes were clear.']] },
  'c0.assessment.a.27': { answer: 'b', choices: [['a', 'After the rain stopped.'], ['b', 'The runners returned to the track.'], ['c', 'The runners on the wet track.'], ['d', 'Returning to the wet track.']] },
  'c0.assessment.a.28': { answer: 'a', choices: [['a', 'We waited because the gate was locked.'], ['b', 'Because the locked gate.'], ['c', 'Because the gate was locked outside.'], ['d', 'Waiting outside the locked gate.']] },
  'c0.assessment.a.29': { answer: 'b', choices: [['a', 'The bell, rang everyone entered.'], ['b', 'The bell rang, and everyone entered.'], ['c', 'The bell rang everyone entered.'], ['d', 'The bell rang, everyone entered.']] },
  'c0.assessment.a.30': { answer: 'a', choices: [['a', 'Where did the folder go?'], ['b', 'Where did the folder go.'], ['c', 'Where did the folder go!'], ['d', 'where did the folder go?']] },
  'c0.assessment.a.31': { answer: 'b', choices: [['a', 'We packed paper ink and string.'], ['b', 'We packed paper, ink, and string.'], ['c', 'We packed, paper ink and string.'], ['d', 'We packed paper, ink, and, string.']] },
  'c0.assessment.a.32': { answer: 'a', choices: [['a', 'Maya, please check this line.'], ['b', 'Maya please, check this line.'], ['c', 'Maya please check this line.'], ['d', 'maya, please check this line.']] },
  'c0.assessment.b.21': { answer: 'a', choices: [['a', 'them'], ['b', 'they'], ['c', 'their'], ['d', 'themselves']] },
  'c0.assessment.b.22': { answer: 'b', choices: [['a', 'him'], ['b', 'he'], ['c', 'himself'], ['d', 'his']] },
  'c0.assessment.b.23': { answer: 'a', choices: [['a', 'Sofia put the book away after she read it.'], ['b', 'After Sofia spoke with Lina, she put the book away.'], ['c', 'After Sofia spoke with Lina, she read it.'], ['d', 'She put the book away after Sofia spoke with Lina.']] },
  'c0.assessment.b.24': { answer: 'b', choices: [['a', 'Neither of the pages have a date.'], ['b', 'Neither of the pages has a date.'], ['c', 'Neither of the pages have dates.'], ['d', 'Neither of the page has a date.']] },
  'c0.assessment.b.25': { answer: 'a', choices: [['a', 'I compare the pages and record the changes.'], ['b', 'I compare the pages and recorded the changes.'], ['c', 'I compared the pages and record the changes.'], ['d', 'I comparing the pages and record the changes.']] },
  'c0.assessment.b.26': { answer: 'b', choices: [['a', 'The students notebook was open.'], ['b', 'The student’s notebook was open.'], ['c', 'The student notebook was open.'], ['d', 'The students’s notebook was open.']] },
  'c0.assessment.b.27': { answer: 'a', choices: [['a', 'Our class visited the museum.'], ['b', 'Near the museum entrance.'], ['c', 'Our class at the museum entrance.'], ['d', 'Visiting the museum on Tuesday.']] },
  'c0.assessment.b.28': { answer: 'b', choices: [['a', 'While waiting bus.'], ['b', 'We boarded while the bus was waiting.'], ['c', 'While the bus was waiting outside.'], ['d', 'Waiting outside for the bus.']] },
  'c0.assessment.b.29': { answer: 'a', choices: [['a', 'I found the date, so I wrote it down.'], ['b', 'I found, the date I wrote it down.'], ['c', 'I found the date I wrote it down.'], ['d', 'I found the date, I wrote it down.']] },
  'c0.assessment.b.30': { answer: 'b', choices: [['a', 'Please close the case?'], ['b', 'Please close the case.'], ['c', 'please close the case.'], ['d', 'please close the case?']] },
  'c0.assessment.b.31': { answer: 'a', choices: [['a', 'The box held maps, notes, and photographs.'], ['b', 'The box held maps notes and photographs.'], ['c', 'The box held, maps notes and photographs.'], ['d', 'The box held maps, notes, and, photographs.']] },
  'c0.assessment.b.32': { answer: 'b', choices: [['a', 'Please Amira, read the title.'], ['b', 'Please, Amira, read the title.'], ['c', 'Please Amira read the title.'], ['d', 'please, Amira, read the title.']] },
};

// --- Finding A3, assessment decoding -----------------------------------------------------------
// Each wrong split breaks the word in a different wrong place, so the item measures where the
// syllable boundary falls rather than which option looks least odd.
export const assessmentDecodingReplacements = {
  'c0.assessment.a.09': { answer: 'a', choices: [['a', 'splen-did'], ['b', 'spl-endid'], ['c', 'sple-ndid'], ['d', 'splend-id']] },
  'c0.assessment.a.10': { answer: 'b', choices: [['a', 'ast-onish'], ['b', 'as-ton-ish'], ['c', 'as-to-nish'], ['d', 'a-ston-ish']] },
  'c0.assessment.b.09': { answer: 'a', choices: [['a', 'fran-tic'], ['b', 'frant-ic'], ['c', 'fra-ntic'], ['d', 'f-rantic']] },
  'c0.assessment.b.10': { answer: 'a', choices: [['a', 're-mem-ber'], ['b', 'remem-ber'], ['c', 'rem-em-ber'], ['d', 're-me-mber']] },
};

// --- Finding B8, assessment listening ----------------------------------------------------------
// The four listening contrasts per form were EAL minimal pairs taken from the ESL benchmarks:
// ship/sheep, bit/beat, live/leave, pull/pool. The parent confirmed on 2026-09-17 that both children
// are native English speakers, for whom those pairs measure nothing. These replacements keep the
// same shape — listen, then choose — but target what a Grade 5/6 speller actually confuses:
// homophones in a spoken sentence, the three sounds of the -ed ending, and where the apostrophe goes
// in a spoken possessive. All eight are Part A and already blocked on the listening check, so no
// evidence changes hands; the parent's check will cover the new audio when it is recorded.
// INSTALL DEPENDENCY, found while drafting. `testLabAudio.js#contrastRows` builds two rows for every
// listening item: the word the app speaks, and one distractor spoken as a comparison, so the parent can
// answer "can you hear the difference between the two sides?". For a minimal pair that is the right
// question. For these replacements it is not: `their`, `there` and `they're` sound identical on purpose,
// and so do `your` and `you're`. A comparison row would ask the parent to hear a difference that is not
// supposed to exist, and a fair answer would read as a defect. The -ed and possessive items have the same
// shape. Installing this correction therefore means giving these items a single audio row that asks
// whether the spoken sentence is clear and says what it should, which is the dictation question, not the
// contrast one. The correction record carries `requiresTestLabChange` so this cannot be installed by
// accident, and a test asserts that any correction touching spoken content declares it.
export const assessmentListeningReplacements = {
  'c0.assessment.a.13': { answer: 'a', spokenText: 'Their bikes are outside.', prompt: 'Listen to sentence A1, then choose the word that belongs in it.', choices: [['a', 'their'], ['b', 'there'], ['c', 'they’re']] },
  'c0.assessment.a.14': { answer: 'b', spokenText: 'We will be there by six.', prompt: 'Listen to sentence A2, then choose the word that belongs in it.', choices: [['a', 'their'], ['b', 'there'], ['c', 'they’re']] },
  'c0.assessment.a.15': { answer: 'a', spokenText: 'wanted', prompt: 'Listen to word A3, then choose how its -ed ending sounds.', choices: [['a', 'It adds a syllable: want-ed.'], ['b', 'It sounds like a d.'], ['c', 'It sounds like a t.']] },
  'c0.assessment.a.16': { answer: 'c', spokenText: 'The girls’ coats were wet.', prompt: 'Listen to sentence A4. More than one girl owns the coats. Choose the correct spelling.', choices: [['a', 'girls'], ['b', 'girl’s'], ['c', 'girls’']] },
  'c0.assessment.b.13': { answer: 'b', spokenText: 'You’re late again.', prompt: 'Listen to sentence B1, then choose the word that belongs in it.', choices: [['a', 'your'], ['b', 'you’re'], ['c', 'yours']] },
  'c0.assessment.b.14': { answer: 'a', spokenText: 'Your coat is here.', prompt: 'Listen to sentence B2, then choose the word that belongs in it.', choices: [['a', 'your'], ['b', 'you’re'], ['c', 'yours']] },
  'c0.assessment.b.15': { answer: 'c', spokenText: 'jumped', prompt: 'Listen to word B3, then choose how its -ed ending sounds.', choices: [['a', 'It adds a syllable: jump-ed.'], ['b', 'It sounds like a d.'], ['c', 'It sounds like a t.']] },
  'c0.assessment.b.16': { answer: 'b', spokenText: 'The dog’s bowl is empty.', prompt: 'Listen to sentence B4. One dog owns the bowl. Choose the correct spelling.', choices: [['a', 'dogs'], ['b', 'dog’s'], ['c', 'dogs’']] },
};

// --- Finding B1, story prose -------------------------------------------------------------------
// The episodes were written for a Grade 5/6 reader and landed around grade 9 to 10, with the fact box
// at 12 to 14. A first rewrite took them to grade 5, and the parent rejected it on 2026-09-18: a grade 5
// reading level gives a Grade 5/6 reader nothing to stretch for. These rewrites aim at grade 7 to 8
// instead — a year or two above the children, which is where a good novel for this age sits — and land
// at 7.6 and 7.5. The fact box is brought further down, to 8.4 and 8.7, because it is the part that says
// what is real and what is invented, and that has to be understood rather than admired.
//
// Every documented claim, every invented-element disclosure and the fiction label are kept exactly as
// they were; the sentences get shorter and a few noun phrases get unpacked. The reveal also stops
// speaking about the child in the third person ("The learner's corrections show") while the recap
// already said "you".
export const storyReplacements = {
  'c0.story.01': {
    intro: 'In the Alberta archive, a catalogue box holds a copy of a page from William Caxton’s workshop. The archivist explains that Caxton brought the printing press to England in the 1470s, though printing had been used in Asia long before that. In the box, a modern exhibit label and the copied proof disagree. Which words belong to the old record, and which ones were added later?',
    recap: 'The label and the proof did not agree, so you used spelling and capitals to tell them apart. Your corrections pointed to a second sheet, marked in pencil by a checker nobody has named.',
    problem: 'A copied exhibit label has a changed spelling and a missing capital. Nobody can tell where its words came from.',
    reveal: 'Your corrections show that the doubtful line came from the modern exhibit label, not from the old printed page. The archive can now keep the two layers apart. A pencilled mark on the second sheet shows that someone else checked the copy, but that person never signed a name.',
    historyBehindMystery: 'Documented: The National Archives links William Caxton to England’s first printing press. It also holds a printed item from 1476. The British Library records that printing was used in China long before it reached Europe. Invented: this archive box, the exhibit label, the proof and the pencilled clue. Uncertain: historians are careful about who first brought in a new tool, and about when.',
  },
  'c0.story.02': {
    intro: 'The second sheet looks like a printer’s working copy, but it was invented for this story and is not a real archive item. Real collections of printing papers do hold letters, notes, drafts and changes made by hand. On this sheet, one margin note is only a fragment. Another is a complete direction. Finding the complete thought will show you where the copy travelled next.',
    recap: 'The margin notes mixed fragments with one complete direction. Finding the complete thought sent you to a port register and to a letter with a different name on the cover.',
    problem: 'The margin mixes sentence fragments with complete directions.',
    reveal: 'Only the complete sentence gives an instruction that an archive worker could follow. It tells you to compare the port register with the cover of a letter. The fragments are still useful clues, but they cannot carry the whole instruction. The name on the cover is not the one you expected, and that opens the next part of the case.',
    historyBehindMystery: 'Documented: British Library records about printing history include letters, notes and drafts. Some were copied by hand, and some were corrected by hand. The National Archives keeps an item connected with Caxton’s early printing in England. Invented: the margin directions, the port file and the puzzle about the name on the cover. No sentence in this episode is shown as a quote from a real document.',
  },
};

// --- Finding B1, explanations ------------------------------------------------------------------
// A learner reads the explanation unaided, so it has to sit at or below the level the lesson teaches.
// Two packs read above it, carried there by long noun phrases: "the last syllable is stressed and
// ends vowel-consonant", "the family title is part of the name". Each rewrite keeps the rule and the
// example and simply says it in shorter sentences.
export const explanationReplacements = {
  'c0.sp.patterns.11': 'Beginning has two n letters. You stress the last part of be-GIN, so the n doubles before -ing.',
  'c0.sp.patterns.13': 'Happy ends in y after a consonant. The y changes to i, so happy becomes happiness.',
  'c0.sp.patterns.14': 'Noticeable keeps the e from notice. The e keeps the c soft, so it sounds like an s.',
  'c0.sp.patterns.17': 'Analyzed comes from analyze, which ends in yze. Some Canadian writers spell it analyse, but that form is not offered here.',
  'c0.sp.patterns.22': 'Admitted has two t letters. You stress the last part of ad-MIT, so the t doubles before -ed.',
  'c0.sp.patterns.23': 'Rely ends in y after a consonant. The y changes to i, so rely becomes reliable.',
  'c0.sp.patterns.24': 'Colour is the usual Canadian spelling. Color is used in the United States, but this question asks for the Canadian form.',
  'c0.pu.capitals-endmarks.09': 'Capitalize Our at the start. The sentence tells us something, so it ends with a period.',
  'c0.pu.capitals-endmarks.15': 'Edmonton and Alberta are names of places, so both take a capital. The sentence also needs a capital at the start and a period at the end.',
  'c0.pu.capitals-endmarks.18': 'Capitalize the first word. Aunt Rosa takes a capital too, because Aunt is part of her name here. End the request with a period.',
  'c0.pu.capitals-endmarks.20': 'Capitalize Who at the start. The exhibit asks a question, so it ends with a question mark.',
  'c0.pu.capitals-endmarks.24': 'This line shows strong feeling. It starts with a capital and ends with an exclamation mark.',
};

// The six resolved records' replacements, in the shape `installReplacements` takes. An explanation
// rewrite becomes a field update; every other entry replaces the options and the key together.
// `storyReplacements` is deliberately absent: an episode is not an item, and its record is still open.
export const INSTALLED_ITEM_REPLACEMENTS = {
  ...sentenceReplacements,
  ...punctuationReplacements,
  ...pronounReplacements,
  ...spellingReplacements,
  ...assessmentSentenceReplacements,
  ...assessmentDecodingReplacements,
  ...assessmentListeningReplacements,
  ...Object.fromEntries(Object.entries(explanationReplacements).map(([id, explanation]) => [id, { explanation }])),
};

// --- OPEN-05, the questions that always had three options ------------------------------------------
//
// DRAFTED 2026-09-18, NOT INSTALLED. These are `corr.c0.014`, proposed by Claude and waiting for the
// parent, exactly as `corr.c0.007` to `corr.c0.013` waited: a correction's proposer may never resolve
// it, so this text sits here until the parent reads it and says yes. It is deliberately absent from
// `INSTALLED_ITEM_REPLACEMENTS`.
//
// The 2026-09-17 audit found questions with TWO options. These 44 always had three, so no record
// covered them, and a blind guess on three is still one in three. 30 of them can carry an honest
// fourth. The other 14 cannot, and `THREE_OPTION_ITEMS` says why for each: padding a closed answer set
// recreates the `runnning` fault rather than fixing anything.
//
// Every fourth option here is a misspelling a child actually writes, not a letter jumble. Two kinds
// were considered and refused: a form that is correct under another reading (`color` for `colour`,
// "On Monday we begin." without the optional comma), and a visually absurd one that nobody would pick.
export const fourthOptionReplacements = {
  // Spelling. Each fourth is a real error of a different kind from the other two: a missing double,
  // an extra silent e, a vowel a child hears rather than sees, or two rules applied at once.
  'c0.sp.patterns.04': { answer: 'a', choices: [['a', 'making'], ['b', 'makeing'], ['c', 'makking'], ['d', 'makeking']] },
  'c0.sp.patterns.05': { answer: 'c', choices: [['a', 'richh'], ['b', 'riche'], ['c', 'rich'], ['d', 'ritch']] },
  'c0.sp.patterns.06': { answer: 'b', choices: [['a', 'wach'], ['b', 'watch'], ['c', 'wotch'], ['d', 'watche']] },
  'c0.sp.patterns.07': { answer: 'a', choices: [['a', 'impossible'], ['b', 'inpossible'], ['c', 'impossable'], ['d', 'imposible']] },
  'c0.sp.patterns.08': { answer: 'c', choices: [['a', 'seet'], ['b', 'sete'], ['c', 'seat'], ['d', 'seate']] },
  'c0.sp.patterns.09': { answer: 'b', choices: [['a', 'chaseing'], ['b', 'chasing'], ['c', 'chassing'], ['d', 'chaising']] },
  'c0.sp.patterns.10': { answer: 'a', choices: [['a', 'careless'], ['b', 'carless'], ['c', 'careles'], ['d', 'carelless']] },
  'c0.sp.patterns.11': { answer: 'c', choices: [['a', 'begining'], ['b', 'begginning'], ['c', 'beginning'], ['d', 'beggining']] },
  'c0.sp.patterns.12': { answer: 'b', choices: [['a', 'neccessary'], ['b', 'necessary'], ['c', 'necesary'], ['d', 'nessecary']] },
  'c0.sp.patterns.13': { answer: 'a', choices: [['a', 'happiness'], ['b', 'happyness'], ['c', 'hapiness'], ['d', 'happieness']] },
  'c0.sp.patterns.14': { answer: 'c', choices: [['a', 'noticable'], ['b', 'noticeible'], ['c', 'noticeable'], ['d', 'noticible']] },
  'c0.sp.patterns.15': { answer: 'a', choices: [['a', 'musician'], ['b', 'musicain'], ['c', 'musitian'], ['d', 'muscian']] },
  'c0.sp.patterns.16': { answer: 'b', choices: [['a', 'prefered'], ['b', 'preferred'], ['c', 'preffered'], ['d', 'prefferred']] },
  'c0.sp.patterns.17': { answer: 'c', choices: [['a', 'analized'], ['b', 'annalysed'], ['c', 'analyzed'], ['d', 'analised']] },
  'c0.sp.patterns.18': { answer: 'a', choices: [['a', 'occasion'], ['b', 'ocassion'], ['c', 'occassion'], ['d', 'ocasion']] },
  'c0.sp.patterns.19': { answer: 'b', choices: [['a', 'inviteing'], ['b', 'inviting'], ['c', 'invitting'], ['d', 'enviting']] },
  'c0.sp.patterns.20': { answer: 'c', choices: [['a', 'electrican'], ['b', 'electritian'], ['c', 'electrician'], ['d', 'electricion']] },
  'c0.sp.patterns.21': { answer: 'a', choices: [['a', 'silent'], ['b', 'silant'], ['c', 'sillent'], ['d', 'cilent']] },
  'c0.sp.patterns.22': { answer: 'c', choices: [['a', 'admited'], ['b', 'addmitted'], ['c', 'admitted'], ['d', 'addmited']] },
  'c0.sp.patterns.23': { answer: 'b', choices: [['a', 'relyable'], ['b', 'reliable'], ['c', 'reliible'], ['d', 'relible']] },
  'c0.sp.patterns.24': { answer: 'a', choices: [['a', 'colour'], ['b', 'collour'], ['c', 'colur'], ['d', 'coulour']] },
  // Punctuation. The fourth gets the end mark right and the capital wrong, so the two are tested apart.
  'c0.pu.capitals-endmarks.05': { answer: 'c', choices: [['a', 'look out.'], ['b', 'Look out?'], ['c', 'Look out!'], ['d', 'look out!']] },
  'c0.pu.capitals-endmarks.11': { answer: 'c', choices: [['a', 'What a remarkable view?'], ['b', 'What a remarkable view.'], ['c', 'What a remarkable view!'], ['d', 'what a remarkable view!']] },
  'c0.pu.capitals-endmarks.16': { answer: 'c', choices: [['a', 'On monday, we begin.'], ['b', 'on Monday, we begin?'], ['c', 'On Monday, we begin.'], ['d', 'on monday, we begin.']] },
  'c0.pu.capitals-endmarks.24': { answer: 'c', choices: [['a', 'that was close?'], ['b', 'That was close.'], ['c', 'That was close!'], ['d', 'that was close!']] },
  // Pronouns. The fourth is the reflexive or the possessive, which is the error children actually make.
  'c0.gr.subject-object-pronouns.07': { answer: 'c', choices: [['a', 'Them'], ['b', 'Us'], ['c', 'They'], ['d', 'Themselves']] },
  'c0.gr.subject-object-pronouns.11': { answer: 'c', choices: [['a', 'me'], ['b', 'him'], ['c', 'I'], ['d', 'myself']] },
  'c0.gr.subject-object-pronouns.14': { answer: 'c', choices: [['a', 'we'], ['b', 'they'], ['c', 'us'], ['d', 'our']] },
  'c0.gr.subject-object-pronouns.17': { answer: 'c', choices: [['a', 'Us thanked they.'], ['b', 'Them thanked we.'], ['c', 'We thanked them.'], ['d', 'We thanked they.']] },
  'c0.gr.subject-object-pronouns.21': { answer: 'c', choices: [['a', 'I'], ['b', 'we'], ['c', 'me'], ['d', 'myself']] },
};
