// G1 packs: the grammar that makes writing read as correct.
//
// WHY THESE THREE FIRST. Ten of the eleven declared grammar skills had no content at all — only
// `GR.subject-object-pronouns` was built. Subject-verb agreement and tense are the two Alberta
// states at every grade from 2 to 6, so a Grade 5 or 6 child is squarely at grade on both, and they
// are what a reader notices first when they are wrong. Noun-pronoun agreement is stated for the
// first time at Grade 5, so it is exactly at grade too.
//
// WHAT MAKES A GOOD AGREEMENT QUESTION, and what makes a useless one. "The dog ___ loudly" with
// bark/barks tests nothing: the ear answers it. The cases worth asking are the ones where the ear is
// actively misled — a long phrase between the subject and the verb, a collective noun, a subject
// that looks plural and is not, `each`/`every`/`neither`, and inverted order where the subject comes
// after the verb. Those are where a Grade 6 child who "knows" agreement still gets it wrong.
//
// Tense is the same: nobody misses a lone past-tense verb. What goes wrong is CONSISTENCY across a
// sentence or a paragraph, and irregular forms that sound plausible either way.

import { makePack as buildPack } from './packBuilder.js';
import { finaliseDraftPacks } from './draftBatch.js';
import correctionData from './corrections.c0.json' with { type: 'json' };
import pilotApprovalData from './pilotApproval.batches.json' with { type: 'json' };

const choice = (prompt, answer, choices, explanation, transferGroup, outcomeIds) => ({ prompt, acceptedAnswers: [answer], choices, explanation, transferGroup, outcomeIds });
const example = (prompt, explanation, transferGroup, outcomeIds) => ({ prompt, explanation, transferGroup, outcomeIds });

function makePack(skillId, title, rule, helpSteps, rows) {
  return buildPack({ prefix: 'g1', batch: 'G1', skillId, title, rule, helpSteps, rows });
}

const AGREEMENT = ['conventions.grade5.05', 'conventions.grade6.05'];
const TENSE = ['conventions.grade5.04', 'conventions.grade6.04'];
const NOUN_PRONOUN = ['conventions.grade5.08'];

const rawGrammarPacks = [
  makePack(
    'GR.agreement',
    'Making the Verb Match the Subject',
    'A verb has to match the subject in number: one thing does, more than one thing do. The trap is that the subject is not always the noun nearest the verb.',
    [
      'Find the verb first — the word that says what happens.',
      'Then ask who or what is doing it. That is the subject, and it may be several words earlier.',
      'Cross out anything between the subject and the verb. It never changes the match.',
      'One subject takes the verb you would use with "he"; more than one takes the verb you would use with "they".',
    ],
    [
      example('Read this: "The box of old letters was heavy." The subject is "box", not "letters". One box, so "was".', 'The words between the subject and the verb are there to describe the box. Crossing them out leaves "The box was heavy", which settles it.', 1, AGREEMENT),
      example('Read this: "The boxes of old paper were heavy." Same shape, plural subject, so "were".', 'Only the subject changed. The phrase in the middle is identical, which is what shows it never mattered.', 1, AGREEMENT),

      choice('Which word is the subject? "The bag of apples ___ on the table."', 'a',
        [['a', 'bag'], ['b', 'apples'], ['c', 'table'], ['d', 'the']],
        'One bag is sitting there. "Of apples" tells you what is in the bag and is not doing anything.', 2, AGREEMENT),
      choice('Which is correct? "The list of names ___ on my desk."', 'b',
        [['a', 'are'], ['b', 'is'], ['c', 'were'], ['d', 'have been']],
        'One list, so the verb matches "list". The plural "names" sits between them and changes nothing.', 3, AGREEMENT),
      choice('Which is correct? "My brother and my sister ___ at the same school."', 'c',
        [['a', 'is'], ['b', 'was'], ['c', 'are'], ['d', 'goes']],
        'Two people joined by "and" make a plural subject, however singular each one is on its own.', 4, AGREEMENT),
      choice('Which is correct? "Each of the players ___ a number."', 'a',
        [['a', 'has'], ['b', 'have'], ['c', 'are having'], ['d', 'were having']],
        '"Each" means one at a time, so the subject is singular even though "players" is plural and sits right before the verb.', 5, AGREEMENT),
      choice('Which is correct? "There ___ three reasons for the delay."', 'd',
        [['a', 'is'], ['b', 'was'], ['c', 'has been'], ['d', 'were']],
        'The subject comes after the verb here. "Three reasons" is what there were, so the verb matches that.', 6, AGREEMENT),
      choice('Why is "The team of scientists are meeting" worth a second look?', 'b',
        [['a', 'it is always wrong'], ['b', 'the subject is "team", which is one thing, so "is meeting" matches; "are" treats the team as its members'], ['c', 'the verb is in the wrong tense'], ['d', 'it needs a comma']],
        'A word naming a group can be treated as one thing or as its members, which is why this one is a judgement rather than a rule. The safer reading in school writing is one team.', 7, AGREEMENT),

      choice('Which is correct? "The sound of the waves ___ me sleep."', 'b',
        [['a', 'help'], ['b', 'helps'], ['c', 'are helping'], ['d', 'have helped']],
        'One sound does the helping. "Of the waves" describes which sound and never changes the match.', 8, AGREEMENT),
      choice('Which is correct? "Neither of the answers ___ right."', 'a',
        [['a', 'is'], ['b', 'are'], ['c', 'were'], ['d', 'have been']],
        '"Neither" means not one of them, taken one at a time, so it is singular despite "answers" sitting beside the verb.', 9, AGREEMENT),
      choice('Which is correct? "The children in the front row ___ singing."', 'c',
        [['a', 'is'], ['b', 'was'], ['c', 'are'], ['d', 'has been']],
        '"Children" is plural. "In the front row" says which children and does not affect the verb.', 10, AGREEMENT),
      choice('Which sentence has the verb matching the wrong word?', 'd',
        [['a', 'The jar of coins is heavy.'], ['b', 'The coins in the jar are heavy.'], ['c', 'The jars of coins are heavy.'], ['d', 'The jar of coins are heavy.']],
        'One of these matches the verb to the plural noun in the middle instead of to the single jar that is actually the subject.', 11, AGREEMENT),
      choice('Which is correct? "Mathematics ___ my favourite subject."', 'a',
        [['a', 'is'], ['b', 'are'], ['c', 'were'], ['d', 'have been']],
        'A word can end in s and still name one thing. This is one subject.', 12, AGREEMENT),
      choice('Which is correct? "Here ___ the keys you lost."', 'b',
        [['a', 'is'], ['b', 'are'], ['c', 'has been'], ['d', 'was']],
        'The subject follows the verb again. More than one key, so the plural verb.', 13, AGREEMENT),
      choice('Which is correct? "Everyone in both classes ___ the trip."', 'c',
        [['a', 'enjoy'], ['b', 'are enjoying'], ['c', 'enjoyed'], ['d', 'have enjoy']],
        '"Everyone" is singular, and the past form "enjoyed" is the same for one or many, so it fits either way — the wrong options fail on number or on form.', 14, AGREEMENT),
      choice('Which is correct? "The dog, along with the two cats, ___ fed at six."', 'a',
        [['a', 'is'], ['b', 'are'], ['c', 'were'], ['d', 'have been']],
        '"Along with" adds information without adding to the subject. Only "and" makes a subject plural.', 15, AGREEMENT),
      choice('In "The reasons for the change were explained", what decides the verb?', 'b',
        [['a', 'the word "change"'], ['b', 'the word "reasons"'], ['c', 'the word "explained"'], ['d', 'the word "for"']],
        'The subject is what the sentence is about, and here that is more than one reason.', 16, AGREEMENT),
      choice('Which sentence is correct?', 'd',
        [['a', 'One of my friends live nearby.'], ['b', 'One of my friends are nearby.'], ['c', 'One of my friends were nearby.'], ['d', 'One of my friends lives nearby.']],
        '"One" is the subject, so the verb is singular however many friends there are.', 17, AGREEMENT),

      choice('Write it correctly: "The pile of books ___ on the floor." Which fits?', 'a',
        [['a', 'was'], ['b', 'were'], ['c', 'have been'], ['d', 'are']],
        'One pile, so the singular verb, whatever is in the pile.', 18, AGREEMENT),
      choice('A friend writes "Each of the answers are correct." What should change?', 'c',
        [['a', 'change "answers" to "answer"'], ['b', 'nothing'], ['c', 'change "are" to "is"'], ['d', 'add a comma']],
        '"Each" is the subject and is singular, so the verb moves rather than the noun.', 19, AGREEMENT),

      choice('Which is correct? "The box of tools ___ missing."', 'b',
        [['a', 'are'], ['b', 'is'], ['c', 'were'], ['d', 'have been']],
        'One box is missing; the tools inside it do not change the match.', 20, AGREEMENT),
      choice('Which is correct? "Both of the windows ___ open."', 'c',
        [['a', 'is'], ['b', 'has been'], ['c', 'are'], ['d', 'was']],
        '"Both" means two, so the subject is plural.', 21, AGREEMENT),
      choice('Which sentence is correct?', 'a',
        [['a', 'The bunch of grapes was small.'], ['b', 'The bunch of grapes were small.'], ['c', 'The bunches of grapes was small.'], ['d', 'The bunch of grape were small.']],
        'One bunch takes the singular verb, and the plural inside the phrase is not the subject.', 22, AGREEMENT),
      choice('Why does the word right before a verb so often give the wrong answer?', 'd',
        [['a', 'it is usually misspelled'], ['b', 'it is usually a verb too'], ['c', 'there is no reason'], ['d', 'a describing phrase often ends in a plural noun, and the ear matches the verb to whatever it heard last']],
        'Crossing out everything between the subject and the verb is the fix, because it makes the eye check what the ear skipped.', 23, AGREEMENT),
    ],
  ),

  makePack(
    'GR.tense',
    'Keeping the Time Steady',
    'Tense says when something happens. Within one piece of writing it has to stay steady: if you start in the past, stay in the past unless the meaning genuinely changes.',
    [
      'Find the time words first — yesterday, last week, now, tomorrow.',
      'Check the verb agrees with them.',
      'Read the whole sentence and ask whether the time shifts without a reason.',
      'Irregular verbs do not take -ed. If it sounds odd, it probably is.',
    ],
    [
      example('Read this: "Yesterday she walks to school." The time word says it already happened; the verb says it is happening now.', 'One of the two has to move. "Yesterday she walked" keeps what the writer meant; "Every day she walks" changes it.', 1, TENSE),
      example('Read this: "He opened the door and sees the empty room." The sentence starts in the past and slips into the present halfway.', 'Nothing in the meaning justifies the shift, so it reads as a mistake rather than a choice.', 1, TENSE),

      choice('Which is correct? "Last summer we ___ to the coast."', 'b',
        [['a', 'go'], ['b', 'went'], ['c', 'are going'], ['d', 'will go']],
        '"Last summer" is finished time, so the verb has to be the past form.', 2, TENSE),
      choice('What is wrong with "He opened the door and sees the empty room."?', 'c',
        [['a', 'nothing'], ['b', 'a spelling mistake'], ['c', 'the tense shifts from past to present for no reason'], ['d', 'it needs a comma']],
        'Both halves describe the same moment, so both verbs should be in the same time.', 3, TENSE),
      choice('Which is the past form of "bring"?', 'a',
        [['a', 'brought'], ['b', 'bringed'], ['c', 'brang'], ['d', 'broughten']],
        'This verb is irregular, so it does not take -ed however natural that sounds.', 4, TENSE),
      choice('Which sentence keeps its tense steady?', 'd',
        [['a', 'She picked up the pen and writes her name.'], ['b', 'She picks up the pen and wrote her name.'], ['c', 'She is picking up the pen and wrote her name.'], ['d', 'She picked up the pen and wrote her name.']],
        'Both actions happen at the same moment, so both verbs are in the same time.', 5, TENSE),
      choice('Which is correct? "By the time we arrived, the film ___ already started."', 'b',
        [['a', 'has'], ['b', 'had'], ['c', 'have'], ['d', 'is']],
        'Two past moments, and one came first. "Had started" marks the earlier one.', 6, TENSE),
      choice('Which sentence is in the future?', 'c',
        [['a', 'She was reading.'], ['b', 'She reads every night.'], ['c', 'She will read it tomorrow.'], ['d', 'She has read it.']],
        'Only one of these says the reading has not happened yet.', 7, TENSE),

      choice('Which is correct? "We ___ the film last night and enjoyed it."', 'a',
        [['a', 'watched'], ['b', 'watch'], ['c', 'are watching'], ['d', 'will watch']],
        '"Last night" fixes the time, and the second verb in the sentence is already past, so both must match.', 8, TENSE),
      choice('Which is the past form of "catch"?', 'd',
        [['a', 'catched'], ['b', 'cought'], ['c', 'catchen'], ['d', 'caught']],
        'Another irregular verb; the -ed form is not English however regular it looks.', 9, TENSE),
      choice('Which sentence shifts tense without a reason?', 'b',
        [['a', 'I knew the answer, but I said nothing.'], ['b', 'I knew the answer, but I say nothing.'], ['c', 'I know the answer, but I say nothing.'], ['d', 'I will know the answer, but I will say nothing.']],
        'Two of these are steady in the past, one is steady in the present, and one starts in the past and slips.', 10, TENSE),
      choice('Which is correct? "She has ___ that book three times."', 'c',
        [['a', 'readed'], ['b', 'red'], ['c', 'read'], ['d', 'reading']],
        'The form after "has" is the same spelling as the present here, which is what makes it easy to get wrong.', 11, TENSE),
      choice('Which is correct? "Every morning he ___ the bus at eight."', 'a',
        [['a', 'catches'], ['b', 'caught'], ['c', 'will catch'], ['d', 'is catching yesterday']],
        '"Every morning" is a repeated habit, which takes the present.', 12, TENSE),
      choice('When is shifting tense in the middle of a paragraph correct?', 'd',
        [['a', 'never'], ['b', 'whenever the sentence is long'], ['c', 'only in stories'], ['d', 'when the meaning genuinely moves in time — "I knew then what I know now"']],
        'The rule is about unintended shifts. A shift the reader can follow, because the meaning moved, is a choice.', 13, TENSE),
      choice('Which is correct? "They ___ here since Monday."', 'b',
        [['a', 'are'], ['b', 'have been'], ['c', 'was'], ['d', 'will be']],
        '"Since Monday" means it started in the past and is still true, which is what this form is for.', 14, TENSE),
      choice('Which is the past form of "teach"?', 'c',
        [['a', 'teached'], ['b', 'teachen'], ['c', 'taught'], ['d', 'teaught']],
        'Irregular again, and it follows the same pattern as "catch" and "bring".', 15, TENSE),
      choice('Which sentence is correct?', 'a',
        [['a', 'While she was cooking, the phone rang.'], ['b', 'While she is cooking, the phone rang.'], ['c', 'While she was cooking, the phone rings.'], ['d', 'While she cooks, the phone rang.']],
        'One action was going on when the other interrupted it, and both belong to the same past moment.', 16, TENSE),
      choice('Which time word does NOT fit "She will finish it ___"?', 'b',
        [['a', 'tomorrow'], ['b', 'last week'], ['c', 'soon'], ['d', 'next month']],
        'The verb says it has not happened yet, so a finished time contradicts it.', 17, TENSE),

      choice('Fix the shift: "He picked up the letter and reads it twice." Which is right?', 'a',
        [['a', 'He picked up the letter and read it twice.'], ['b', 'He picks up the letter and read it twice.'], ['c', 'He picked up the letter and reading it twice.'], ['d', 'He picked up the letter and will read it twice.']],
        'The first verb sets the time, and the second moves to match rather than the other way round.', 18, TENSE),
      choice('A friend writes "Yesterday I bringed my lunch." What should change?', 'c',
        [['a', 'change "yesterday" to "today"'], ['b', 'nothing'], ['c', 'change "bringed" to "brought"'], ['d', 'add a comma']],
        'The time word is what the writer meant, so the irregular verb is what has to be corrected.', 19, TENSE),

      choice('Which is correct? "Last night the wind ___ all the leaves down."', 'b',
        [['a', 'blowed'], ['b', 'blew'], ['c', 'blown'], ['d', 'blows']],
        'Past time and an irregular verb, so neither the -ed form nor the present fits.', 20, TENSE),
      choice('Which sentence keeps its tense steady?', 'c',
        [['a', 'She stood up and waves.'], ['b', 'She stands up and waved.'], ['c', 'She stood up and waved.'], ['d', 'She is standing up and waved.']],
        'Both verbs describe the same moment, so both are in the same time.', 21, TENSE),
      choice('Which is correct? "I ___ that film already, so I will skip it."', 'a',
        [['a', 'have seen'], ['b', 'seen'], ['c', 'have saw'], ['d', 'did seen']],
        'It happened before now and still matters now, which is what this form says. "Seen" cannot stand alone.', 22, TENSE),
      choice('Why does an unintended tense shift matter to a reader?', 'd',
        [['a', 'it is a spelling error'], ['b', 'it makes the sentence longer'], ['c', 'it does not matter'], ['d', 'the reader tracks when things happened, so a shift with no reason makes them re-read to work out whether the time really changed']],
        'A shift the meaning justifies is a choice; one it does not is a stumble, and the reader cannot tell which until they have gone back.', 23, TENSE),
    ],
  ),

  makePack(
    'GR.antecedents',
    'Pronouns That Match What They Stand For',
    'A pronoun stands in for a noun, and it has to match that noun in number. It also has to be clear which noun it stands for — if two are possible, the sentence has to be reworded.',
    [
      'Find the pronoun — he, she, it, they, them, their.',
      'Ask which noun it stands for. That noun is its antecedent.',
      'Check they match: one thing takes it, more than one takes they.',
      'If more than one noun could be the answer, the pronoun is unclear and the sentence needs rewording.',
    ],
    [
      example('Read this: "Every student brought their own lunch." "Every student" is one at a time; "their" is the form English now uses when the person is unspecified.', 'This one is a live question in English. Alberta’s own source recognises singular they, so it is accepted here — but a writer who prefers "his or her" is not wrong either.', 1, NOUN_PRONOUN),
      example('Read this: "When Ana met Priya, she was late." Either of them could be "she".', 'Nothing in the sentence settles it. The fix is not a different pronoun but a rewording: "Ana was late when she met Priya."', 1, NOUN_PRONOUN),

      choice('What does "it" stand for? "The gate was open, so we closed it."', 'a',
        [['a', 'the gate'], ['b', 'we'], ['c', 'open'], ['d', 'nothing']],
        'The pronoun stands in for the thing that was acted on, which is named earlier in the sentence.', 2, NOUN_PRONOUN),
      choice('Which is correct? "The books were heavy, so I carried ___ in a bag."', 'c',
        [['a', 'it'], ['b', 'him'], ['c', 'them'], ['d', 'its']],
        'More than one book, so the pronoun standing in for them has to be plural.', 3, NOUN_PRONOUN),
      choice('Which sentence has an unclear pronoun?', 'b',
        [['a', 'When Ana met Priya, Ana was late.'], ['b', 'When Ana met Priya, she was late.'], ['c', 'Ana was late when she met Priya.'], ['d', 'Priya was late when Ana met her.']],
        'One of these leaves the reader unable to tell which person the pronoun stands for.', 4, NOUN_PRONOUN),
      choice('Which is correct? "The team lost ___ first match."', 'a',
        [['a', 'its'], ['b', 'their'], ['c', 'it’s'], ['d', 'his']],
        'Treated as one team, the possessive is singular — and it takes no apostrophe, like every possessive form of "it".', 5, NOUN_PRONOUN),
      choice('Which noun does "they" stand for? "The dogs chased the cats until they got tired."', 'd',
        [['a', 'the dogs, certainly'], ['b', 'the cats, certainly'], ['c', 'nobody'], ['d', 'either — the sentence does not say, which is the problem']],
        'Both nouns are plural, so number cannot settle it. The sentence has to be reworded to say which.', 6, NOUN_PRONOUN),
      choice('How would you fix "The dogs chased the cats until they got tired."?', 'b',
        [['a', 'change "they" to "it"'], ['b', 'name whichever animals got tired: "until the dogs got tired"'], ['c', 'add a comma'], ['d', 'change "chased" to "chase"']],
        'When no pronoun can be clear, the noun goes back in.', 7, NOUN_PRONOUN),

      choice('Which is correct? "Each of the girls brought ___ own pencil."', 'c',
        [['a', 'they’re'], ['b', 'there'], ['c', 'her'], ['d', 'them']],
        '"Each" takes one at a time, and every one of them is a girl, so the singular form is available and precise.', 8, NOUN_PRONOUN),
      choice('Which sentence is clear about who "he" is?', 'a',
        [['a', 'Marcus told Ben that Marcus would drive.'], ['b', 'Marcus told Ben that he would drive.'], ['c', 'He told Ben that he would drive.'], ['d', 'Marcus told him that he would drive.']],
        'Repeating the name is clumsy but unambiguous; the others leave at least one pronoun the reader cannot resolve.', 9, NOUN_PRONOUN),
      choice('Which is correct? "Neither of the boys remembered ___ ticket."', 'b',
        [['a', 'their'], ['b', 'his'], ['c', 'them'], ['d', 'its']],
        '"Neither" is singular — not one of them, taken one at a time — and both are boys, so the singular form fits.', 10, NOUN_PRONOUN),
      choice('What is wrong with "The jury gave their verdict, and it left the room."?', 'd',
        [['a', 'nothing'], ['b', 'a spelling mistake'], ['c', '"verdict" is wrong'], ['d', 'the jury is plural in the first half and singular in the second']],
        'A group noun can be treated either way, but not both ways in one sentence.', 11, NOUN_PRONOUN),
      choice('Which is correct? "Somebody left ___ coat on the chair."', 'a',
        [['a', 'their'], ['b', 'they'], ['c', 'them'], ['d', 'its']],
        'The person is unknown, and English uses "their" for an unspecified single person.', 12, NOUN_PRONOUN),
      choice('Which sentence has a pronoun with no noun to stand for at all?', 'c',
        [['a', 'The lamp flickered, then it went out.'], ['b', 'Ana called, and she sounded tired.'], ['c', 'In the report, it says the road is closed.'], ['d', 'The boxes were full, so we moved them.']],
        'A report does not say anything; there is no noun the pronoun replaces. "The report says" fixes it.', 13, NOUN_PRONOUN),
      choice('Which is correct? "The class finished ___ projects on Friday."', 'b',
        [['a', 'its'], ['b', 'their'], ['c', 'it’s'], ['d', 'his']],
        'The projects belong to the members rather than to the class as one thing, so the plural reading is the natural one here.', 14, NOUN_PRONOUN),
      choice('Which is correct? "One of the players lost ___ boots."', 'a',
        [['a', 'his or her'], ['b', 'their boot'], ['c', 'its'], ['d', 'them']],
        '"One" is the subject and is singular. Either a singular form or "their" works; what does not work is a pronoun that disagrees in number.', 15, NOUN_PRONOUN),
      choice('Which rewording removes the ambiguity from "Sam told Kai that his bag was open."?', 'd',
        [['a', 'Sam told Kai that their bag was open.'], ['b', 'Sam told Kai that its bag was open.'], ['c', 'Sam told him that his bag was open.'], ['d', '"Sam told Kai, “Your bag is open.”"']],
        'Quoting what was said settles whose bag it was, which no choice of pronoun can do on its own.', 16, NOUN_PRONOUN),
      choice('Why does an unclear pronoun matter more than an awkward repetition?', 'c',
        [['a', 'it does not'], ['b', 'repetition is always wrong'], ['c', 'a reader can skim past a repeated name, but an unclear pronoun makes them stop and guess'], ['d', 'unclear pronouns are misspelled']],
        'Clarity outranks elegance. Repeating the noun is the fix when no pronoun can be unambiguous.', 17, NOUN_PRONOUN),

      choice('Fix this: "The windows were dirty, so I washed it." Which is right?', 'b',
        [['a', 'The windows were dirty, so I washed its.'], ['b', 'The windows were dirty, so I washed them.'], ['c', 'The window were dirty, so I washed it.'], ['d', 'The windows was dirty, so I washed it.']],
        'The pronoun moves to match the plural noun, rather than the noun shrinking to match the pronoun.', 18, NOUN_PRONOUN),
      choice('A friend writes "When Priya met Ana, she smiled." What would you suggest?', 'a',
        [['a', 'name whoever smiled, because either could be "she"'], ['b', 'change "she" to "they"'], ['c', 'change "met" to "meets"'], ['d', 'nothing — it is clear']],
        'Both nouns are singular and female, so nothing in the sentence resolves the pronoun.', 19, NOUN_PRONOUN),

      choice('Which is correct? "The chairs were broken, so we replaced ___."', 'c',
        [['a', 'it'], ['b', 'its'], ['c', 'them'], ['d', 'him']],
        'More than one chair, so the pronoun is plural.', 20, NOUN_PRONOUN),
      choice('Which is correct? "Every player must bring ___ own water bottle."', 'b',
        [['a', 'they'], ['b', 'their'], ['c', 'them'], ['d', 'its']],
        '"Every player" is unspecified, and this is the form English uses for that.', 21, NOUN_PRONOUN),
      choice('Which sentence is clearest?', 'd',
        [['a', 'The coach told the captain he was wrong.'], ['b', 'He told the captain he was wrong.'], ['c', 'The coach told him he was wrong.'], ['d', 'The coach admitted to the captain that the coach was wrong.']],
        'Clumsy but unmistakable. The others each leave a pronoun that could point at either person.', 22, NOUN_PRONOUN),
      choice('What is an antecedent?', 'a',
        [['a', 'the noun a pronoun stands in for'], ['b', 'a kind of verb'], ['c', 'the first word of a sentence'], ['d', 'a punctuation mark']],
        'The word means "goes before", which is usually where it sits — and the whole skill is making sure the reader can find it.', 23, NOUN_PRONOUN),
    ],
  ),
];

export const grammarPacks = finaliseDraftPacks(rawGrammarPacks, {
  corrections: correctionData.corrections,
  approvals: pilotApprovalData.approvals,
});
export const grammarItems = grammarPacks.flatMap((pack) => pack.items);
