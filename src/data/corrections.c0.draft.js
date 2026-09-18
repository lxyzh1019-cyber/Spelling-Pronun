// Drafted replacements from the 2026-09-17 content audit, awaiting the parent's review.
//
// These are `improvement` corrections, not defects: every affected item teaches and grades correctly
// today. What is wrong is how well it measures. A fragment that is the only option without an end mark
// can be picked without reading the words; a two-option question is a coin toss, and `deriveMastery`
// reaches `developing` after three correct answers without modelling chance. Because none of this is
// false teaching, the items keep running while the drafts wait, and installing a draft is what the
// parent's approval does.
//
// Each entry names the audit finding it closes and carries the exact replacement text, so the parent
// reads what the child would see rather than a description of it. `test/correctionDrafts.test.js`
// proves every draft actually satisfies the rule its finding names.

// --- Finding A2 + A3, sentence pack ------------------------------------------------------------
// Every fragment gains an end mark, so the full stop stops marking the answer out, and every
// two-option question gains a third option. The third option is always a fragment of a DIFFERENT
// kind from the second (a phrase where the other is a clause, and so on), so the item still teaches
// that completeness is about a subject and a predicate rather than about length or punctuation.
export const sentenceReplacements = {
  'c0.se.complete.03': { answer: 'a', choices: [['a', 'The fox crossed the frozen pond.'], ['b', 'Across the frozen pond.'], ['c', 'The fox on the frozen pond.']] },
  'c0.se.complete.04': { answer: 'a', choices: [['a', 'Our neighbour repairs bicycles.'], ['b', 'Beside our neighbour’s garage.'], ['c', 'Our neighbour with the red toolbox.']] },
  'c0.se.complete.05': { answer: 'b', choices: [['a', 'Before the next stop.'], ['b', 'Check the route before the next stop.'], ['c', 'Checking the route carefully.']] },
  'c0.se.complete.06': { answer: 'a', choices: [['a', 'Did the package arrive?'], ['b', 'When the package arrived.'], ['c', 'The package from the post office.']] },
  'c0.se.complete.07': { answer: 'c', choices: [['a', 'The noisy machine.'], ['b', 'Working after lunch.'], ['c', 'The noisy machine stopped after lunch.']] },
  'c0.se.complete.08': { answer: 'b', choices: [['a', 'Because the trail was muddy.'], ['b', 'The trail was muddy after the storm.'], ['c', 'The muddy trail after the storm.']] },
  'c0.se.complete.09': { answer: 'a', choices: [['a', 'Please close the window.'], ['b', 'Near the open window.'], ['c', 'Closing the window quietly.']] },
  'c0.se.complete.10': { answer: 'c', choices: [['a', 'If the lights turn off.'], ['b', 'During the final scene.'], ['c', 'The lights turned off during the final scene.']] },
  'c0.se.complete.11': { answer: 'a', choices: [['a', 'My cousins from Calgary are visiting.'], ['b', 'My cousins from Calgary.'], ['c', 'Visiting from Calgary this week.']] },
  'c0.se.complete.12': { answer: 'b', choices: [['a', 'Running quickly toward the gate.'], ['b', 'The child ran quickly toward the gate.'], ['c', 'The child near the open gate.']] },
  'c0.se.complete.13': { answer: 'c', choices: [['a', 'Although the recipe looked simple.'], ['b', 'The recipe on the counter.'], ['c', 'The recipe looked simple, but it took an hour.']] },
  'c0.se.complete.14': { answer: 'a', choices: [['a', 'There are three messages in the folder.'], ['b', 'Three messages in the folder.'], ['c', 'Three messages that arrived today.']] },
  'c0.se.complete.15': { answer: 'b', choices: [['a', 'While everyone was listening.'], ['b', 'Everyone listened quietly.'], ['c', 'Everyone in the quiet room.']] },
  'c0.se.complete.16': { answer: 'a', choices: [['a', 'The blue canoe belongs to our team.'], ['b', 'The blue canoe by the dock.'], ['c', 'Belonging to our team this season.']] },
  'c0.se.complete.17': { answer: 'c', choices: [['a', 'Such a surprising ending.'], ['b', 'After a surprising ending.'], ['c', 'The ending surprised us.']] },
  'c0.se.complete.18': { answer: 'b', choices: [['a', 'Whenever the alarm sounds.'], ['b', 'The class follows the safety plan.'], ['c', 'The safety plan on the wall.']] },
  'c0.se.complete.19': { answer: 'a', choices: [['a', 'Place wet umbrellas in the rack.'], ['b', 'Wet umbrellas in the rack.'], ['c', 'Wet umbrellas that drip on the floor.']] },
  'c0.se.complete.20': { answer: 'b', choices: [['a', 'After the council meeting ended.'], ['b', 'The council released its decision.'], ['c', 'The long council meeting on Tuesday.']] },
  'c0.se.complete.21': { answer: 'c', choices: [['a', 'Behind the community centre.'], ['b', 'Because practice ended early.'], ['c', 'Practice ended early today.']] },
  'c0.se.complete.22': { answer: 'a', choices: [['a', 'Turn left at the library.'], ['b', 'At the library on the left.'], ['c', 'Turning left at the library.']] },
  'c0.se.complete.23': { answer: 'b', choices: [['a', 'Why the door was open.'], ['b', 'Why was the door open?'], ['c', 'The open door at the back.']] },
  'c0.se.complete.24': { answer: 'a', choices: [['a', 'The concert begins at seven.'], ['b', 'Before the concert at seven.'], ['c', 'The concert on Friday evening.']] },
};

// --- Finding A3, punctuation pack --------------------------------------------------------------
// The third option always carries a DIFFERENT error from the second, so the item tests the capital
// and the end mark separately instead of offering one right answer against one obviously wrong one.
export const punctuationReplacements = {
  'c0.pu.capitals-endmarks.03': { answer: 'a', choices: [['a', 'The library closes at six.'], ['b', 'the library closes at six?'], ['c', 'The library closes at six']] },
  'c0.pu.capitals-endmarks.04': { answer: 'b', choices: [['a', 'Where is my notebook.'], ['b', 'Where is my notebook?'], ['c', 'where is my notebook?']] },
  'c0.pu.capitals-endmarks.06': { answer: 'a', choices: [['a', 'I asked Mateo for help.'], ['b', 'I asked mateo for help.'], ['c', 'i asked Mateo for help.']] },
  'c0.pu.capitals-endmarks.07': { answer: 'b', choices: [['a', 'We travelled to red deer.'], ['b', 'We travelled to Red Deer.'], ['c', 'We travelled to Red deer.']] },
  'c0.pu.capitals-endmarks.08': { answer: 'a', choices: [['a', 'Please pass the ruler.'], ['b', 'please pass the ruler?'], ['c', 'Please pass the ruler?']] },
  'c0.pu.capitals-endmarks.12': { answer: 'b', choices: [['a', 'a Wrinkle in Time'], ['b', 'A Wrinkle in Time'], ['c', 'A Wrinkle In Time']] },
  'c0.pu.capitals-endmarks.13': { answer: 'a', choices: [['a', 'We visit Grandma Lee on Sunday.'], ['b', 'We visit grandma Lee on sunday.'], ['c', 'We visit Grandma Lee on sunday.']] },
  'c0.pu.capitals-endmarks.14': { answer: 'b', choices: [['a', 'Where should we meet.'], ['b', 'Where should we meet?'], ['c', 'where should we meet?']] },
  'c0.pu.capitals-endmarks.17': { answer: 'a', choices: [['a', 'Have you seen the keys?'], ['b', 'Have you seen the keys!'], ['c', 'Have you seen the keys.']] },
  'c0.pu.capitals-endmarks.19': { answer: 'b', choices: [['a', 'danger falling rocks.'], ['b', 'Danger! Falling rocks.'], ['c', 'Danger! falling rocks.']] },
  'c0.pu.capitals-endmarks.21': { answer: 'a', choices: [['a', 'The snow melted quickly.'], ['b', 'The snow melted quickly?'], ['c', 'the snow melted quickly.']] },
  'c0.pu.capitals-endmarks.22': { answer: 'b', choices: [['a', 'My friend moved to nova scotia.'], ['b', 'My friend moved to Nova Scotia.'], ['c', 'My friend moved to Nova scotia.']] },
};

// --- Finding A3, pronoun pack ------------------------------------------------------------------
// Where the slot takes a single pronoun the third option is the reflexive, because "Jordan and
// myself" is the error children actually make. Where the item offers whole sentences, the third
// sentence gets one of the two pronouns right and the other wrong, so a learner cannot pass by
// noticing that one sentence "looks wrong" without working out which word is at fault.
export const pronounReplacements = {
  'c0.gr.subject-object-pronouns.03': { answer: 'a', choices: [['a', 'She'], ['b', 'Her'], ['c', 'Herself']] },
  'c0.gr.subject-object-pronouns.04': { answer: 'b', choices: [['a', 'we'], ['b', 'us'], ['c', 'they']] },
  'c0.gr.subject-object-pronouns.05': { answer: 'a', choices: [['a', 'I'], ['b', 'me'], ['c', 'myself']] },
  'c0.gr.subject-object-pronouns.06': { answer: 'b', choices: [['a', 'I'], ['b', 'me'], ['c', 'myself']] },
  'c0.gr.subject-object-pronouns.08': { answer: 'a', choices: [['a', 'him'], ['b', 'he'], ['c', 'his']] },
  'c0.gr.subject-object-pronouns.09': { answer: 'b', choices: [['a', 'Her and I checked the list.'], ['b', 'She and I checked the list.'], ['c', 'Her and me checked the list.']] },
  'c0.gr.subject-object-pronouns.10': { answer: 'a', choices: [['a', 'The message surprised them.'], ['b', 'The message surprised they.'], ['c', 'The message surprised their.']] },
  'c0.gr.subject-object-pronouns.12': { answer: 'b', choices: [['a', 'she'], ['b', 'her'], ['c', 'hers']] },
  'c0.gr.subject-object-pronouns.13': { answer: 'a', choices: [['a', 'They'], ['b', 'Them'], ['c', 'Their']] },
  'c0.gr.subject-object-pronouns.15': { answer: 'b', choices: [['a', 'Someone left their bottle; them can claim it at the desk.'], ['b', 'Someone left their bottle; they can claim it at the desk.'], ['c', 'Someone left their bottle; their can claim it at the desk.']] },
  'c0.gr.subject-object-pronouns.16': { answer: 'a', choices: [['a', 'me'], ['b', 'I'], ['c', 'myself']] },
  'c0.gr.subject-object-pronouns.18': { answer: 'b', choices: [['a', 'her'], ['b', 'she'], ['c', 'herself']] },
  'c0.gr.subject-object-pronouns.19': { answer: 'a', choices: [['a', 'They gave the receipt to me.'], ['b', 'Them gave the receipt to I.'], ['c', 'They gave the receipt to I.']] },
  'c0.gr.subject-object-pronouns.20': { answer: 'b', choices: [['a', 'Her and him measured the water.'], ['b', 'She and he measured the water.'], ['c', 'Her and he measured the water.']] },
  'c0.gr.subject-object-pronouns.22': { answer: 'a', choices: [['a', 'We'], ['b', 'Us'], ['c', 'Ourselves']] },
  'c0.gr.subject-object-pronouns.23': { answer: 'b', choices: [['a', 'The guide showed we the map.'], ['b', 'The guide showed us the map.'], ['c', 'The guide showed our the map.']] },
  'c0.gr.subject-object-pronouns.24': { answer: 'a', choices: [['a', 'He and I arrived early.'], ['b', 'Him and me arrived early.'], ['c', 'Him and I arrived early.']] },
};

// --- Finding A3, the one nonsense distractor ---------------------------------------------------
// `runnning` has three n's: no child would choose it, so the item was really a two-option question
// wearing three options. `runeing` replaces it with the mistake the rule is actually about, applying
// the silent-e rule from `hoping` to a word that needs the doubled consonant instead.
export const spellingReplacements = {
  'c0.sp.patterns.03': { answer: 'b', choices: [['a', 'runing'], ['b', 'running'], ['c', 'runeing']] },
};

// --- Finding A3, assessment Part B -------------------------------------------------------------
// Twelve sentence prompts per form, each a straight two-way choice. The third option carries a
// different error from the second, so a learner cannot pass by eliminating the one option that
// "looks wrong" without deciding which word is at fault.
export const assessmentSentenceReplacements = {
  'c0.assessment.a.21': { answer: 'b', choices: [['a', 'we'], ['b', 'us'], ['c', 'ourselves']] },
  'c0.assessment.a.22': { answer: 'a', choices: [['a', 'she'], ['b', 'her'], ['c', 'herself']] },
  'c0.assessment.a.23': { answer: 'b', choices: [['a', 'When Ava called Mia, she was outside.'], ['b', 'Ava was outside when she called Mia.'], ['c', 'After Ava called Mia, she went outside.']] },
  'c0.assessment.a.24': { answer: 'a', choices: [['a', 'Each of the labels is numbered.'], ['b', 'Each of the labels are numbered.'], ['c', 'Each of the labels were numbered.']] },
  'c0.assessment.a.25': { answer: 'b', choices: [['a', 'We opened the box and examine the page.'], ['b', 'We opened the box and examined the page.'], ['c', 'We open the box and examined the page.']] },
  'c0.assessment.a.26': { answer: 'a', choices: [['a', 'The archivist’s notes were clear.'], ['b', 'The archivists notes were clear.'], ['c', 'The archivist notes were clear.']] },
  'c0.assessment.a.27': { answer: 'b', choices: [['a', 'After the rain stopped.'], ['b', 'The runners returned to the track.'], ['c', 'The runners on the wet track.']] },
  'c0.assessment.a.28': { answer: 'a', choices: [['a', 'We waited because the gate was locked.'], ['b', 'Because the locked gate.'], ['c', 'Because the gate was locked outside.']] },
  'c0.assessment.a.29': { answer: 'b', choices: [['a', 'The bell, rang everyone entered.'], ['b', 'The bell rang, and everyone entered.'], ['c', 'The bell rang everyone entered.']] },
  'c0.assessment.a.30': { answer: 'a', choices: [['a', 'Where did the folder go?'], ['b', 'Where did the folder go.'], ['c', 'Where did the folder go!']] },
  'c0.assessment.a.31': { answer: 'b', choices: [['a', 'We packed paper ink and string.'], ['b', 'We packed paper, ink, and string.'], ['c', 'We packed, paper ink and string.']] },
  'c0.assessment.a.32': { answer: 'a', choices: [['a', 'Maya, please check this line.'], ['b', 'Maya please, check this line.'], ['c', 'Maya please check this line.']] },
  'c0.assessment.b.21': { answer: 'a', choices: [['a', 'them'], ['b', 'they'], ['c', 'theirs']] },
  'c0.assessment.b.22': { answer: 'b', choices: [['a', 'him'], ['b', 'he'], ['c', 'himself']] },
  'c0.assessment.b.23': { answer: 'a', choices: [['a', 'Sofia put the book away after she read it.'], ['b', 'After Sofia spoke with Lina, she put the book away.'], ['c', 'After Sofia spoke with Lina, she read it.']] },
  'c0.assessment.b.24': { answer: 'b', choices: [['a', 'Neither of the pages have a date.'], ['b', 'Neither of the pages has a date.'], ['c', 'Neither of the pages have dates.']] },
  'c0.assessment.b.25': { answer: 'a', choices: [['a', 'I compare the pages and record the changes.'], ['b', 'I compare the pages and recorded the changes.'], ['c', 'I compared the pages and record the changes.']] },
  'c0.assessment.b.26': { answer: 'b', choices: [['a', 'The students notebook was open.'], ['b', 'The student’s notebook was open.'], ['c', 'The student notebook was open.']] },
  'c0.assessment.b.27': { answer: 'a', choices: [['a', 'Our class visited the museum.'], ['b', 'Near the museum entrance.'], ['c', 'Our class at the museum entrance.']] },
  'c0.assessment.b.28': { answer: 'b', choices: [['a', 'While waiting bus.'], ['b', 'We boarded while the bus was waiting.'], ['c', 'While the bus was waiting outside.']] },
  'c0.assessment.b.29': { answer: 'a', choices: [['a', 'I found the date, so I wrote it down.'], ['b', 'I found, the date I wrote it down.'], ['c', 'I found the date I wrote it down.']] },
  'c0.assessment.b.30': { answer: 'b', choices: [['a', 'Please close the case?'], ['b', 'Please close the case.'], ['c', 'please close the case.']] },
  'c0.assessment.b.31': { answer: 'a', choices: [['a', 'The box held maps, notes, and photographs.'], ['b', 'The box held maps notes and photographs.'], ['c', 'The box held, maps notes and photographs.']] },
  'c0.assessment.b.32': { answer: 'b', choices: [['a', 'Please Amira, read the title.'], ['b', 'Please, Amira, read the title.'], ['c', 'Please Amira read the title.']] },
};

// --- Finding A3, assessment decoding -----------------------------------------------------------
export const assessmentDecodingReplacements = {
  'c0.assessment.a.09': { answer: 'a', choices: [['a', 'splen-did'], ['b', 'spl-endid'], ['c', 'sple-ndid']] },
  'c0.assessment.a.10': { answer: 'b', choices: [['a', 'ast-onish'], ['b', 'as-ton-ish'], ['c', 'as-to-nish']] },
  'c0.assessment.b.09': { answer: 'a', choices: [['a', 'fran-tic'], ['b', 'frant-ic'], ['c', 'fra-ntic']] },
  'c0.assessment.b.10': { answer: 'a', choices: [['a', 're-mem-ber'], ['b', 'remem-ber'], ['c', 'rem-em-ber']] },
};

// --- Finding B8, assessment listening ----------------------------------------------------------
// The four listening contrasts per form were EAL minimal pairs taken from the ESL benchmarks:
// ship/sheep, bit/beat, live/leave, pull/pool. The parent confirmed on 2026-09-17 that both children
// are native English speakers, for whom those pairs measure nothing. These replacements keep the
// same shape — listen, then choose — but target what a Grade 5/6 speller actually confuses:
// homophones in a spoken sentence, the three sounds of the -ed ending, and where the apostrophe goes
// in a spoken possessive. All eight are Part A and already blocked on the listening check, so no
// evidence changes hands; the parent's check will cover the new audio when it is recorded.
export const assessmentListeningReplacements = {
  'c0.assessment.a.13': { answer: 'a', spokenText: 'Their bikes are outside.', prompt: 'Listen to the sentence, then choose the word that belongs in it.', choices: [['a', 'their'], ['b', 'there'], ['c', 'they’re']] },
  'c0.assessment.a.14': { answer: 'b', spokenText: 'We will be there by six.', prompt: 'Listen to the sentence, then choose the word that belongs in it.', choices: [['a', 'their'], ['b', 'there'], ['c', 'they’re']] },
  'c0.assessment.a.15': { answer: 'a', spokenText: 'wanted', prompt: 'Listen to the word, then choose how its -ed ending sounds.', choices: [['a', 'It adds a syllable: want-ed.'], ['b', 'It sounds like a d.'], ['c', 'It sounds like a t.']] },
  'c0.assessment.a.16': { answer: 'c', spokenText: 'The girls’ coats were wet.', prompt: 'Listen to the sentence. More than one girl owns the coats. Choose the correct spelling.', choices: [['a', 'girls'], ['b', 'girl’s'], ['c', 'girls’']] },
  'c0.assessment.b.13': { answer: 'b', spokenText: 'You’re late again.', prompt: 'Listen to the sentence, then choose the word that belongs in it.', choices: [['a', 'your'], ['b', 'you’re'], ['c', 'yours']] },
  'c0.assessment.b.14': { answer: 'a', spokenText: 'Your coat is here.', prompt: 'Listen to the sentence, then choose the word that belongs in it.', choices: [['a', 'your'], ['b', 'you’re'], ['c', 'yours']] },
  'c0.assessment.b.15': { answer: 'c', spokenText: 'jumped', prompt: 'Listen to the word, then choose how its -ed ending sounds.', choices: [['a', 'It adds a syllable: jump-ed.'], ['b', 'It sounds like a d.'], ['c', 'It sounds like a t.']] },
  'c0.assessment.b.16': { answer: 'b', spokenText: 'The dog’s bowl is empty.', prompt: 'Listen to the sentence. One dog owns the bowl. Choose the correct spelling.', choices: [['a', 'dogs'], ['b', 'dog’s'], ['c', 'dogs’']] },
};

// --- Finding B1, story prose -------------------------------------------------------------------
// The episodes were written for a Grade 5/6 reader and landed around grade 9 to 10, with the fact
// box at 12 to 14. These rewrites keep every documented claim, every invented-element disclosure and
// the fiction label exactly as they were; only the sentences get shorter and the words plainer. The
// reveal also stops speaking about the child in the third person ("The learner's corrections show")
// while the recap already said "you".
export const storyReplacements = {
  'c0.story.01': {
    intro: 'A box in the Alberta archive holds a copy of a very old printed page. It is linked to the workshop of William Caxton. The archive worker tells you that Caxton brought the printing press to England in the 1470s. Printing was already in use in Asia long before that. Two labels sit in the box with the page. They do not agree. Which words come from the old page? Which ones did someone add much later?',
    recap: 'The two labels did not agree. You used spelling and capitals to tell them apart. Your work pointed to a second sheet. Someone had marked that sheet in pencil, but nobody knows who.',
    reveal: 'Your corrections show that the odd line came from the new label. It did not come from the old page. The archive can now keep the two apart. A pencil mark on the second sheet shows that someone else checked the copy. That person did not sign a name.',
    problem: 'A label in the box has a changed spelling and a missing capital. Nobody can tell where it came from.',
    historyBehindMystery: 'Documented: The National Archives links William Caxton to the first printing press in England and to a printed item from 1476. The British Library records that printing was used in China long before it reached Europe. Invented: the archive box, the label, the copied page and the pencil mark. Uncertain: historians are careful about who first brought in a new tool, and when.',
  },
  'c0.story.02': {
    intro: 'The second sheet looks like a printer’s working copy. It was invented for this story. It is not a real item from an archive. Real collections of printing papers do hold letters, notes, drafts and changes made by hand. On this sheet you find two notes in the margin. One of them is only a fragment. The other is a complete direction. Find the complete thought and you will learn where the copy went next.',
    recap: 'The margin notes mixed fragments with one complete direction. You found the complete thought. It sent you to a port record and to a letter with a different name on the cover.',
    reveal: 'Only the complete sentence tells a person what to do. It says to compare the port record with the cover of a letter. The fragments still help as clues, but they cannot carry the whole instruction. The name on the cover is not the one you expected. That opens the next part of the case.',
    problem: 'Some notes in the margin are whole sentences. Others are only parts of one.',
    historyBehindMystery: 'Documented: British Library records about early printing hold letters, notes and drafts. Some were copied out by hand, and some were changed by hand. The National Archives keeps an item linked to Caxton and his early work in England. Invented: the notes in the margin, the port file, and the puzzle about the name. No line here is shown as a quote from a real paper.',
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
