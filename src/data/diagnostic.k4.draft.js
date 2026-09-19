// The below-grade diagnostic: three questions each for the sixteen skills Alberta finishes with
// before Grade 5.
//
// WHAT THIS IS FOR. The parent asked to test the 知识点 from before Grade 5 and let the evidence say
// whether the children need a separate catch-up app. These sixteen are the skills where being behind
// matters most: Alberta states them for the last time at Grade 2, 3 or 4, so nothing later in the
// curriculum comes back to them. A Grade 5 child who cannot do these will not be taught them again.
//
// WHAT THIS IS NOT. It is not a lesson and it is not an assessment. It teaches nothing, offers no
// help, and gives no repair step — a diagnostic that taught would measure the teaching. It is not
// mastery evidence either: every item here is `draft`, and `evidenceEligible` already excludes
// unreleased content, so a right answer locates a gap and proves nothing about mastery. It never
// produces a score and never uses the word "behind" about a child; it reports, per skill, whether
// there is enough evidence to say the foundation is solid there.
//
// SHORT AND WIDE ON PURPOSE. Three questions per skill, not twenty-four. The job is to find WHICH of
// the sixteen need work, so that the packs that get built next are the ones that are actually needed.
// Three is enough to tell "solid" from "not solid" and small enough that a child can cover all
// sixteen in one sitting.
//
// PRINT-BASED ON PURPOSE, like the foundation packs. The phonics rows are answered by looking at
// spelling, never by listening: audio needs a human to check it before it can be trusted, and the
// assessment's Part A prompts have been stuck behind that gate since 2026-09-08.
//
// EVERY ROW NAMES THE GRADE IT PROBES, and that grade is checked against the ladder by test — so a
// row cannot claim to probe Grade 2 work while asking something Alberta states at Grade 6.

const row = (id, skillId, probesGrade, prompt, answer, choices, locates) => ({
  id: `d1.${id}`,
  version: 1,
  skillId,
  // `primarySkill` as well as `skillId`, because `buildAttempt` reads the former. A row without it
  // produced `skillIds: [undefined]`, which would have bucketed all 48 answers under one key in any
  // skill-wise aggregation. The diagnostic keeps its own store and never calls `buildAttempt`, but a
  // row that is wrong in a way that only shows up elsewhere is still wrong.
  primarySkill: skillId,
  probesGrade,
  prompt,
  acceptedAnswers: [answer],
  choices: choices.map(([choiceId, text]) => ({ id: choiceId, text })),
  // What a wrong answer tells you. A diagnostic that only recorded right/wrong would say a child is
  // not solid without saying what to build, which is the thing this is supposed to produce.
  locates,
  evaluator: 'choice',
  responseType: 'choice',
  role: 'diagnostic',
  releaseStatus: 'not_released',
  reviewStatus: 'needs_independent_challenge',
  integrationStatus: 'not_integrated',
  status: 'draft_needs_independent_challenge',
});

export const diagnosticItems = [
  // ——— SE.complete — Alberta states subject and predicate last at Grade 3 ———
  row('se.complete.01', 'SE.complete', 'Grade 3', 'Which one is a complete sentence?', 'b',
    [['a', 'Running along the wet path behind the school.'], ['b', 'The dog ran along the wet path.'], ['c', 'Because the path was wet that morning.'], ['d', 'The wet path behind the old school.']],
    'Telling a complete sentence from a group of words that has no subject or no verb.'),
  row('se.complete.02', 'SE.complete', 'Grade 3', 'What is the subject of this sentence? "The tall boy in the blue coat dropped his key."', 'c',
    [['a', 'dropped'], ['b', 'his key'], ['c', 'The tall boy in the blue coat'], ['d', 'in the blue coat']],
    'Finding the whole subject, not just the first noun.'),
  row('se.complete.03', 'SE.complete', 'Grade 3', 'Which group of words is missing a verb?', 'a',
    [['a', 'The two cats on the warm windowsill.'], ['b', 'The two cats slept.'], ['c', 'Cats sleep.'], ['d', 'They slept on the windowsill.']],
    'Noticing when a long group of words still has nothing happening in it.'),

  // ——— PU.capitals-endmarks — stated for the last time at Grade 4 ———
  row('pu.capitals.01', 'PU.capitals-endmarks', 'Grade 4', 'Which sentence uses capital letters correctly?', 'b',
    [['a', 'last tuesday we drove to red deer.'], ['b', 'Last Tuesday we drove to Red Deer.'], ['c', 'Last tuesday we drove to red Deer.'], ['d', 'last Tuesday We drove to Red deer.']],
    'Capitals on days, place names and the first word together, not one rule at a time.'),
  row('pu.capitals.02', 'PU.capitals-endmarks', 'Grade 4', 'Which end mark belongs here? "Would you pass me the blue pen"', 'c',
    [['a', 'a period'], ['b', 'an exclamation mark'], ['c', 'a question mark'], ['d', 'a comma']],
    'Choosing the end mark from what the sentence does, not from how it starts.'),
  row('pu.capitals.03', 'PU.capitals-endmarks', 'Grade 4', 'Which sentence is punctuated correctly?', 'd',
    [['a', 'What a mess this room is.'], ['b', 'Where did you put my bag.'], ['c', 'Please close the door?'], ['d', 'Please close the door.']],
    'Telling a command from a question when both are polite.'),

  // ——— PU.apostrophes — contractions at Grade 2, possession by Grade 4 ———
  row('pu.apostrophes.01', 'PU.apostrophes', 'Grade 4', 'Which sentence uses the apostrophe correctly?', 'a',
    [['a', "The girls' coats were all on one hook."], ['b', "The girl's coats were all on one hook, and there were six girls."], ['c', 'The girls coats were all on one hook.'], ['d', "The girls's coats were all on one hook."]],
    'Where the apostrophe goes when the owner is plural and already ends in s.'),
  row('pu.apostrophes.02', 'PU.apostrophes', 'Grade 3', 'Which is the correct short form of "does not"?', 'b',
    [['a', 'doesnt'], ['b', "doesn't"], ['c', "does'nt"], ['d', "do'esnt"]],
    'Putting the apostrophe where the missing letters were.'),
  row('pu.apostrophes.03', 'PU.apostrophes', 'Grade 4', 'Which sentence is correct?', 'c',
    [['a', "Its a long walk to the bus, and the dog hurt it's paw."], ['b', "It's a long walk to the bus, and the dog hurt it's paw."], ['c', "It's a long walk to the bus, and the dog hurt its paw."], ['d', "Its' a long walk to the bus, and the dog hurt its paw."]],
    "Telling it's from its — the one case where the apostrophe does not mean ownership."),

  // ——— PU.list-commas and PU.clause-commas — Grade 3 and Grade 4 ———
  row('pu.list.01', 'PU.list-commas', 'Grade 3', 'Which sentence uses commas correctly?', 'b',
    [['a', 'We packed apples bread cheese and a knife.'], ['b', 'We packed apples, bread, cheese, and a knife.'], ['c', 'We packed, apples bread cheese and a knife.'], ['d', 'We, packed apples, bread cheese and a knife.']],
    'Separating the items in a list.'),
  row('pu.list.02', 'PU.list-commas', 'Grade 3', 'How many commas does this sentence need? "She fed the cat the rabbit the fish and the noisy bird."', 'c',
    [['a', 'none'], ['b', 'two'], ['c', 'three'], ['d', 'five']],
    'Counting the gaps between list items rather than the items themselves.'),
  row('pu.clause.01', 'PU.clause-commas', 'Grade 4', 'Where does the comma belong? "When the rain finally stopped we went outside."', 'a',
    [['a', 'after stopped'], ['b', 'after rain'], ['c', 'after we'], ['d', 'no comma is needed']],
    'The comma at the join between two parts of a sentence.'),

  // ——— PU.introductory — stated only at Grade 4 ———
  row('pu.intro.01', 'PU.introductory', 'Grade 4', 'Which sentence is punctuated correctly?', 'b',
    [['a', 'However the bus was already gone.'], ['b', 'However, the bus was already gone.'], ['c', 'However the bus, was already gone.'], ['d', 'However the bus was already, gone.']],
    'The comma after a word that joins this sentence to the last one.'),
  row('pu.intro.02', 'PU.introductory', 'Grade 4', 'Which word here is a transition word that needs a comma after it?', 'd',
    [['a', 'quickly'], ['b', 'because'], ['c', 'under'], ['d', 'meanwhile']],
    'Recognising a transition word, as opposed to an ordinary adverb.'),

  // ——— PU.dialogue — Grade 3 into Grade 4 ———
  row('pu.dialogue.01', 'PU.dialogue', 'Grade 3', 'Which sentence uses quotation marks correctly?', 'a',
    [['a', 'Ella said, "The gate is locked."'], ['b', 'Ella said, The gate is locked.'], ['c', 'Ella said "The gate is locked".'], ['d', '"Ella said, the gate is locked."']],
    "Marking off exactly the speaker's own words, and where the end mark goes."),
  row('pu.dialogue.02', 'PU.dialogue', 'Grade 4', 'Which part of this sentence should be inside the quotation marks? Sam asked whether the shop was open.', 'd',
    [['a', 'Sam asked'], ['b', 'whether the shop was open'], ['c', 'the shop was open'], ['d', 'none of it — nobody is quoted here']],
    'Telling reported speech from quoted speech.'),

  // ——— SP.inflections — endings, stated last at Grade 3 ———
  row('sp.inflections.01', 'SP.inflections', 'Grade 3', 'Which spelling completes this? "All week we were ___ for rain."', 'b',
    [['a', 'hopeing'], ['b', 'hoping'], ['c', 'hopping'], ['d', 'hopeng']],
    'Dropping the silent e before an ending that starts with a vowel.'),
  row('sp.inflections.02', 'SP.inflections', 'Grade 3', 'Which spelling is correct?', 'c',
    [['a', 'carrys'], ['b', 'carryes'], ['c', 'carries'], ['d', 'carrie']],
    'Changing y to i before adding an ending.'),
  row('sp.inflections.03', 'SP.inflections', 'Grade 3', 'Which spelling is correct?', 'a',
    [['a', 'stopped'], ['b', 'stoped'], ['c', 'stopeed'], ['d', 'stopd']],
    'Doubling the final consonant after one short vowel.'),

  // ——— SP.confusables — homophones, stated last at Grade 4 ———
  row('sp.confusables.01', 'SP.confusables', 'Grade 4', 'Which sentence is correct?', 'c',
    [['a', 'There going to leave they’re bags over their.'], ['b', 'Their going to leave there bags over they’re.'], ['c', 'They’re going to leave their bags over there.'], ['d', 'They’re going to leave there bags over their.']],
    'Telling apart the three spellings of the same sound.'),
  row('sp.confusables.02', 'SP.confusables', 'Grade 4', 'Which word completes this correctly? "The team played well, so we were all ___ of them."', 'b',
    [['a', 'prowd'], ['b', 'proud'], ['c', 'proude'], ['d', 'praud']],
    'Spelling the ou sound in a common word.'),
  row('sp.confusables.03', 'SP.confusables', 'Grade 4', 'Which sentence is correct?', 'd',
    [['a', 'The cake tasted better then the pie, and than we left.'], ['b', 'The cake tasted better then the pie, and then we left.'], ['c', 'The cake tasted better than the pie, and than we left.'], ['d', 'The cake tasted better than the pie, and then we left.']],
    'Telling comparison (than) from sequence (then).'),

  // ——— GR.possessives — Grade 3 into Grade 4 ———
  row('gr.possessives.01', 'GR.possessives', 'Grade 3', 'Which one shows that the bike belongs to one boy?', 'a',
    [['a', "the boy's bike"], ['b', "the boys' bike"], ['c', 'the boys bike'], ['d', "the boys's bike"]],
    'Singular possession.'),
  row('gr.possessives.02', 'GR.possessives', 'Grade 4', 'Which word is a possessive adjective?', 'b',
    [['a', 'him'], ['b', 'his'], ['c', 'he'], ['d', 'himself']],
    'Telling a possessive adjective from an object pronoun.'),
  row('gr.possessives.03', 'GR.possessives', 'Grade 4', 'Which sentence is correct?', 'c',
    [['a', "The childrens' coats were wet."], ['b', "The childrens coats were wet."], ['c', "The children's coats were wet."], ['d', "The childrens's coats were wet."]],
    'Possession on a plural that does not end in s.'),

  // ——— GR.articles-plurals — plural forms, stated last at Grade 4 ———
  row('gr.plurals.01', 'GR.articles-plurals', 'Grade 3', 'What is the plural of "leaf"?', 'b',
    [['a', 'leafs'], ['b', 'leaves'], ['c', 'leafes'], ['d', 'leavs']],
    'Plurals where f changes to v.'),
  row('gr.plurals.02', 'GR.articles-plurals', 'Grade 4', 'Which plural is spelled correctly?', 'a',
    [['a', 'boxes'], ['b', 'boxs'], ['c', 'boxies'], ['d', 'boxen']],
    'Adding es after a hissing ending.'),
  row('gr.plurals.03', 'GR.articles-plurals', 'Grade 4', 'Which word is the same in the singular and the plural?', 'd',
    [['a', 'mouse'], ['b', 'goose'], ['c', 'child'], ['d', 'sheep']],
    'Plurals that do not change form at all.'),

  // ——— Phonics, all answered by looking at spelling ———
  row('ph.vowels.01', 'PH.vowels', 'Grade 2', 'In which word does the vowel say its LONG sound (its own name)?', 'c',
    [['a', 'hop'], ['b', 'cut'], ['c', 'cake'], ['d', 'bed']],
    'Hearing the long vowel and seeing what makes it long.'),
  row('ph.vowels.02', 'PH.vowels', 'Grade 3', 'Which word has an r-controlled vowel — where the r changes the vowel sound?', 'b',
    [['a', 'bat'], ['b', 'bird'], ['c', 'blue'], ['d', 'boat']],
    'Recognising that r after a vowel changes it.'),
  row('ph.vowels.03', 'PH.vowels', 'Grade 3', 'Which word does the silent e rule explain?', 'a',
    [['a', 'tape'], ['b', 'tap'], ['c', 'trap'], ['d', 'top']],
    'The silent e that makes the vowel before it long.'),

  row('ph.digraphs.01', 'PH.digraphs-clusters', 'Grade 2', 'Which word starts with a digraph — two letters making ONE sound?', 'd',
    [['a', 'stop'], ['b', 'plan'], ['c', 'green'], ['d', 'ship']],
    'Telling a digraph (one sound) from a cluster (two sounds run together).'),
  row('ph.digraphs.02', 'PH.digraphs-clusters', 'Grade 3', 'Which word ends with a consonant cluster — two sounds you can both hear?', 'b',
    [['a', 'wish'], ['b', 'hand'], ['c', 'path'], ['d', 'sing']],
    'Hearing both consonants at the end of a word.'),
  row('ph.digraphs.03', 'PH.digraphs-clusters', 'Grade 3', 'Which word contains a letter that represents no sound at all?', 'c',
    [['a', 'clap'], ['b', 'stamp'], ['c', 'knee'], ['d', 'plant']],
    'Silent letters in common spellings.'),

  row('ph.syllables.01', 'PH.syllables', 'Grade 2', 'How many syllables does "elephant" have?', 'c',
    [['a', 'one'], ['b', 'two'], ['c', 'three'], ['d', 'four']],
    'Counting beats in a familiar word.'),
  row('ph.syllables.02', 'PH.syllables', 'Grade 3', 'Which word has exactly two syllables?', 'a',
    [['a', 'garden'], ['b', 'cat'], ['c', 'computer'], ['d', 'butterfly']],
    'Counting beats when the word is unfamiliar in print.'),
  row('ph.syllables.03', 'PH.syllables', 'Grade 3', 'Every syllable has exactly one of these. Which?', 'b',
    [['a', 'one consonant'], ['b', 'one vowel sound'], ['c', 'one silent letter'], ['d', 'one capital letter']],
    'The rule that makes syllable counting reliable rather than a guess.'),

  row('ph.blend.01', 'PH.blend-segment', 'Grade 2', 'Which word do these sounds make? /s/ /t/ /r/ /ee/ /t/', 'a',
    [['a', 'street'], ['b', 'stream'], ['c', 'sheet'], ['d', 'stir']],
    'Blending separate sounds back into a word.'),
  row('ph.blend.02', 'PH.blend-segment', 'Grade 2', 'How many separate sounds are in the word "blend"?', 'd',
    [['a', 'three'], ['b', 'four'], ['c', 'six'], ['d', 'five']],
    'Counting sounds rather than letters.'),
  row('ph.blend.03', 'PH.blend-segment', 'Grade 2', 'Take the word "stand" and take away the /t/ sound. What word is left?', 'a',
    [['a', 'sand'], ['b', 'stan'], ['c', 'tand'], ['d', 'and']],
    'Deleting a sound from inside a cluster.'),

  row('ph.multi.01', 'PH.multisyllable', 'Grade 3', 'Where would you break "fantastic" into chunks to read it?', 'c',
    [['a', 'fa-ntas-tic'], ['b', 'fant-as-tic'], ['c', 'fan-tas-tic'], ['d', 'f-antas-tic']],
    'Chunking a long word at the syllable joins.'),
  row('ph.multi.02', 'PH.multisyllable', 'Grade 3', 'Which chunk of "unhelpful" is the base word?', 'b',
    [['a', 'un'], ['b', 'help'], ['c', 'ful'], ['d', 'helpful']],
    'Finding the base inside a long word, which is what makes it readable.'),
  row('ph.multi.03', 'PH.multisyllable', 'Grade 3', 'How would you chunk "remember" to read it?', 'a',
    [['a', 're-mem-ber'], ['b', 'rem-emb-er'], ['c', 'r-emem-ber'], ['d', 'reme-mber']],
    'Chunking when the first chunk is a prefix.'),
  row('pu.list.03', 'PU.list-commas', 'Grade 4', 'Which sentence does NOT need any commas?', 'c',
    [['a', 'I bought bread milk and jam.'], ['b', 'She is quick clever and kind.'], ['c', 'I bought bread and milk.'], ['d', 'We visited Banff Jasper and Canmore.']],
    'Knowing when a list is too short to need commas at all.'),
  row('pu.clause.02', 'PU.clause-commas', 'Grade 4', 'Which sentence is punctuated correctly?', 'a',
    [['a', 'Although it was late, the shop was still open.'], ['b', 'Although it was late the shop, was still open.'], ['c', 'Although, it was late the shop was still open.'], ['d', 'Although it was late the shop was still open,']],
    'The comma between a dependent part and the main part of a sentence.'),
  row('pu.clause.03', 'PU.clause-commas', 'Grade 4', 'Does this sentence need a comma? "I will call you when I get home."', 'd',
    [['a', 'Yes, after "you".'], ['b', 'Yes, after "call".'], ['c', 'Yes, after "when".'], ['d', 'No comma is needed.']],
    'Knowing that the comma is not needed when the main part comes first.'),
  row('pu.intro.03', 'PU.introductory', 'Grade 4', 'Which sentence is punctuated correctly?', 'a',
    [['a', 'For example, a magnet will not pick up a copper coin.'], ['b', 'For example a magnet, will not pick up a copper coin.'], ['c', 'For, example a magnet will not pick up a copper coin.'], ['d', 'For example a magnet will not pick up a copper coin.']],
    'The comma after a transition phrase, not just a single transition word.'),
  row('pu.dialogue.03', 'PU.dialogue', 'Grade 4', 'Which sentence is punctuated correctly?', 'b',
    [['a', '"Wait for me" she called, "I am nearly ready."'], ['b', '"Wait for me," she called. "I am nearly ready."'], ['c', '"Wait for me." she called, "I am nearly ready".'], ['d', '"Wait for me, she called. I am nearly ready."']],
    'Punctuating speech that is interrupted by who said it.'),
];

// A diagnostic form is the whole set, in a fixed order, so two sittings are comparable. It is not a
// pack: no worked examples, no guided items, no repair, no transfer.
export const diagnosticForm = {
  id: 'd1.form.below-grade-5',
  version: 1,
  status: 'draft_needs_independent_challenge',
  title: 'Where is the foundation solid?',
  // Nothing in this form measures a Grade 5 or Grade 6 outcome, and none of it is released, so it can
  // never contribute mastery evidence. Saying so in the data is stronger than saying it in a comment.
  curriculumOutcomeIds: [],
  producesMasteryEvidence: false,
  purpose: 'Locate which skills from before Grade 5 need building, so the next packs are the ones actually needed. It is not a test of the child and it produces no score.',
  items: diagnosticItems,
};
