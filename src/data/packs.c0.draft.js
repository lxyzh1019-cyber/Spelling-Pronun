const ROLE_SEQUENCE = [
  'worked_example', 'worked_example',
  ...Array(6).fill('guided'),
  ...Array(10).fill('independent'),
  ...Array(2).fill('transfer'),
  ...Array(4).fill('delayed_review'),
];

const defaultSourceIds = ['ab-elal-2022-overview', 'ab-eal-benchmarks-4-6'];

function makePack(skillId, title, rule, helpSteps, rows, options = {}) {
  if (rows.length !== 24) throw new Error(`${skillId} must contain 24 rows`);
  const sourceIds = options.sourceIds || defaultSourceIds;
  const reviewStatus = options.reviewStatus || 'needs_independent_challenge';
  return {
    id: `c0.pack.${skillId.toLowerCase()}`,
    version: 1,
    status: options.status || 'draft_needs_independent_challenge',
    skillId,
    title,
    rule,
    sourceIds,
    items: rows.map((row, index) => {
      const role = ROLE_SEQUENCE[index];
      const displayOnly = role === 'worked_example';
      return {
        id: `c0.${skillId.toLowerCase()}.${String(index + 1).padStart(2, '0')}`,
        version: 1,
        primarySkill: skillId,
        secondarySkills: [],
        role,
        difficulty: index < 8 ? 1 : index < 18 ? 2 : 3,
        prerequisites: [],
        prompt: row.prompt,
        responseType: displayOnly ? 'display' : row.responseType || 'choice',
        evaluator: displayOnly ? 'human_rubric' : row.evaluator || 'choice',
        ...(displayOnly ? { rubric: { displayOnly: true } } : { acceptedAnswers: row.acceptedAnswers }),
        ...(row.choices ? { choices: row.choices.map(([id, text]) => ({ id, text })) } : {}),
        explanation: row.explanation,
        helpSteps,
        commonErrors: row.commonErrors || [],
        evidenceEligibility: ['independent', 'transfer', 'delayed_review'].includes(role) ? `independent_${role}` : 'instruction_only',
        transferGroup: `${skillId.toLowerCase()}-${row.transferGroup || index + 1}`,
        authorStatus: 'draft',
        reviewStatus,
        sourceIds,
      };
    }),
  };
}

const choice = (prompt, answer, choices, explanation, transferGroup) => ({ prompt, acceptedAnswers: [answer], choices, explanation, transferGroup });
const text = (prompt, answers, explanation, evaluator = 'spelling', transferGroup) => ({ prompt, responseType: 'text', evaluator, acceptedAnswers: answers, explanation, transferGroup });
const example = (prompt, explanation, transferGroup) => ({ prompt, explanation, transferGroup });

const spellingRows = [
  example('Compare hop → hopping and hope → hoping.', 'In hopping, the final consonant doubles after one short vowel. In hoping, the silent e is dropped before -ing.', 'double-or-drop'),
  example('Compare picnic → picnicking and panic → panicking.', 'A final c is followed by k before -ing so the new form keeps the /k/ sound: picnicking and panicking.', 'c-before-ing'),
  choice('Choose the correct spelling for “run” with -ing.', 'b', [['a', 'runing'], ['b', 'running'], ['c', 'runnning']], 'Running doubles the final n because run ends in one short vowel followed by one consonant.', 'double-short-vowel'),
  choice('Choose the correct spelling for “make” with -ing.', 'a', [['a', 'making'], ['b', 'makeing'], ['c', 'makking']], 'Making drops the silent e before adding -ing.', 'drop-silent-e'),
  choice('Choose the word with the /ch/ sound after a short vowel.', 'c', [['a', 'richh'], ['b', 'riche'], ['c', 'rich']], 'Rich ends with ch; English usually uses tch after a single short vowel only when no consonant comes before the /ch/ sound.', 'ch-after-consonant'),
  choice('Choose the correct spelling for the small timepiece worn on a wrist.', 'b', [['a', 'wach'], ['b', 'watch'], ['c', 'wotch']], 'Watch uses tch after the short a sound.', 'tch-short-vowel'),
  choice('Choose the correct spelling for the opposite of “possible”.', 'a', [['a', 'impossible'], ['b', 'inpossible'], ['c', 'impossable']], 'The prefix in- changes to im- before p, producing impossible.', 'prefix-assimilation'),
  choice('Choose the word that correctly uses the long-e vowel team.', 'c', [['a', 'seet'], ['b', 'sete'], ['c', 'seat']], 'Seat uses ea for its long-e sound; vowel-team spellings must be learned word by word because exceptions exist.', 'vowel-team-ea'),
  choice('Which spelling completes “The puppy is ___ the ball”?', 'b', [['a', 'chaseing'], ['b', 'chasing'], ['c', 'chassing']], 'Chasing drops the silent e from chase before -ing.', 'drop-e-context'),
  choice('Choose the correct spelling of the word meaning “without care”.', 'a', [['a', 'careless'], ['b', 'carless'], ['c', 'careles']], 'Careless keeps the base word care and adds the suffix -less.', 'base-plus-suffix'),
  choice('Choose the correct spelling for “begin” with -ing.', 'c', [['a', 'begining'], ['b', 'begginning'], ['c', 'beginning']], 'Beginning doubles the final n because the last syllable is stressed and ends vowel-consonant.', 'stressed-final'),
  choice('Choose the correctly spelled word.', 'b', [['a', 'neccessary'], ['b', 'necessary'], ['c', 'necesary']], 'Necessary has one c and two s letters: ne-ces-sar-y.', 'necessary-pattern'),
  choice('Choose the correct spelling for “happy” with -ness.', 'a', [['a', 'happiness'], ['b', 'happyness'], ['c', 'hapiness']], 'Happiness changes final consonant-y to i before adding -ness.', 'y-to-i'),
  choice('Choose the correct spelling for “notice” with -able.', 'c', [['a', 'noticable'], ['b', 'noticeible'], ['c', 'noticeable']], 'Noticeable keeps the e so the c continues to represent its soft sound.', 'keep-e-soft-c'),
  choice('Choose the correctly spelled word for a person who performs music.', 'a', [['a', 'musician'], ['b', 'musicain'], ['c', 'musitian']], 'Musician uses the suffix -ian; the letter c before i represents the /sh/ sound here.', 'suffix-ian'),
  choice('Choose the correct spelling for “prefer” with -ed.', 'b', [['a', 'prefered'], ['b', 'preferred'], ['c', 'preffered']], 'Preferred doubles the final r because the final syllable is stressed.', 'stressed-r'),
  choice('Choose the word that completes “We ___ the results.”', 'c', [['a', 'analized'], ['b', 'annalysed'], ['c', 'analyzed']], 'Analyzed is an accepted Canadian spelling and uses yze in the base word analyze.', 'canadian-ize'),
  choice('Choose the correct spelling of the word meaning “a separate event”.', 'a', [['a', 'occasion'], ['b', 'ocassion'], ['c', 'occassion']], 'Occasion has two c letters and one s: oc-ca-sion.', 'occasion-pattern'),
  choice('A new club is “___” members. Choose the correct word.', 'b', [['a', 'inviteing'], ['b', 'inviting'], ['c', 'invitting']], 'Inviting drops the silent e from invite before -ing; the t does not double.', 'transfer-drop-e'),
  choice('Choose the correct spelling for a person who studies electricity.', 'c', [['a', 'electrican'], ['b', 'electritian'], ['c', 'electrician']], 'Electrician keeps electric and uses -ian; c before i represents /sh/.', 'transfer-ian'),
  choice('Choose the correct spelling: The room was completely ___.', 'a', [['a', 'silent'], ['b', 'silant'], ['c', 'sillent']], 'Silent uses i in the first syllable and one l; its related word silence can help.', 'review-silent'),
  choice('Choose the correct spelling for “admit” with -ed.', 'c', [['a', 'admited'], ['b', 'addmitted'], ['c', 'admitted']], 'Admitted doubles the final t because the last syllable is stressed and ends vowel-consonant.', 'review-double-t'),
  choice('Choose the correct spelling for “rely” with -able.', 'b', [['a', 'relyable'], ['b', 'reliable'], ['c', 'reliible']], 'Reliable changes the final y in rely to i before adding -able.', 'review-y-i'),
  choice('Choose the correctly spelled Canadian form.', 'a', [['a', 'colour'], ['b', 'collour'], ['c', 'colur']], 'Colour is the conventional Canadian spelling; color is a legitimate US variant but is not the convention targeted here.', 'review-canadian'),
];

const sentenceRows = [
  example('Compare “Under the old bridge.” with “The hikers waited under the old bridge.”', 'The first group has no complete statement. The second has a subject, the hikers, and a predicate telling what they did.', 'fragment-v-complete'),
  example('Compare “Birds migrate.” with “The bright red birds near our window migrate each autumn.”', 'Both are complete. A sentence can be short or long; completeness depends on expressing a full thought, not length.', 'length-not-test'),
  choice('Which group is a complete sentence?', 'b', [['a', 'Across the frozen pond'], ['b', 'The fox crossed the frozen pond.']], 'The fox is the subject and crossed the frozen pond is the predicate.', 'subject-predicate-1'),
  choice('Which group is a complete sentence?', 'a', [['a', 'Our neighbour repairs bicycles.'], ['b', 'Beside our neighbour’s garage']], 'Our neighbour names who; repairs bicycles tells what the neighbour does.', 'subject-predicate-2'),
  choice('Which group expresses a complete command?', 'b', [['a', 'Before the next stop'], ['b', 'Check the route before the next stop.']], 'A command can have an understood subject, you: “You check the route.”', 'command'),
  choice('Which group is a complete question?', 'a', [['a', 'Did the package arrive?'], ['b', 'When the package arrived']], 'Did the package arrive asks a complete question; the other group leaves the thought unfinished.', 'question'),
  choice('Which group has both a subject and a predicate?', 'c', [['a', 'The noisy machine'], ['b', 'Working after lunch'], ['c', 'The noisy machine stopped after lunch.']], 'The noisy machine is the subject and stopped after lunch is the predicate.', 'identify-parts'),
  choice('Choose the complete sentence.', 'b', [['a', 'Because the trail was muddy'], ['b', 'The trail was muddy after the storm.']], 'The second choice can stand alone and communicates a complete idea.', 'because-fragment'),
  choice('Which sentence is complete even though its subject is understood?', 'a', [['a', 'Please close the window.'], ['b', 'Near the open window.']], 'The command has the understood subject you and the predicate close the window.', 'understood-you'),
  choice('Choose the complete statement.', 'c', [['a', 'If the lights turn off'], ['b', 'During the final scene'], ['c', 'The lights turned off during the final scene.']], 'The third choice tells who or what and what happened without leaving an if-condition unfinished.', 'statement'),
  choice('Which group can stand alone as a sentence?', 'a', [['a', 'My cousins from Calgary are visiting.'], ['b', 'My cousins from Calgary']], 'Are visiting completes what the cousins are doing.', 'predicate-verb'),
  choice('Choose the complete sentence.', 'b', [['a', 'Running quickly toward the gate'], ['b', 'The child ran quickly toward the gate.']], 'The child supplies a subject, and ran supplies the finite verb in the predicate.', 'finite-verb'),
  choice('Which group communicates a complete thought?', 'c', [['a', 'Although the recipe looked simple'], ['b', 'The recipe on the counter'], ['c', 'The recipe looked simple, but it took an hour.']], 'The third choice completes both ideas and joins them with but.', 'complete-thought'),
  choice('Choose the complete sentence.', 'a', [['a', 'There are three messages in the folder.'], ['b', 'Three messages in the folder.']], 'The complete sentence includes the verb are and tells us that three messages exist in the folder.', 'there-are'),
  choice('Which group is a complete sentence?', 'b', [['a', 'While everyone was listening'], ['b', 'Everyone listened quietly.']], 'Everyone is the subject and listened quietly is the predicate; while makes the other group dependent.', 'dependent-marker'),
  choice('Choose the complete sentence.', 'a', [['a', 'The blue canoe belongs to our team.'], ['b', 'The blue canoe by the dock.']], 'Belongs to our team tells what is true about the blue canoe.', 'link-complete'),
  choice('Which group is complete?', 'c', [['a', 'Such a surprising ending'], ['b', 'After a surprising ending'], ['c', 'The ending surprised us.']], 'The ending is the subject and surprised us states what it did.', 'noun-verb'),
  choice('Choose the sentence, not the fragment.', 'b', [['a', 'Whenever the alarm sounds'], ['b', 'The class follows the safety plan.']], 'The second choice is independent; whenever makes the first choice wait for another idea.', 'independent'),
  choice('A museum sign needs a complete direction. Choose it.', 'a', [['a', 'Place wet umbrellas in the rack.'], ['b', 'Wet umbrellas in the rack.']], 'The command gives a complete action with the understood subject you.', 'transfer-sign'),
  choice('Which line could stand alone in a news report?', 'b', [['a', 'After the council meeting ended'], ['b', 'The council released its decision.']], 'The second line states a complete event; the first only introduces when something happened.', 'transfer-report'),
  choice('Choose the complete sentence.', 'c', [['a', 'Behind the community centre'], ['b', 'Because practice ended early'], ['c', 'Practice ended early today.']], 'Practice is the subject and ended early today is the predicate.', 'review-1'),
  choice('Which group is complete?', 'a', [['a', 'Turn left at the library.'], ['b', 'At the library on the left.']], 'Turn left is a complete command with an understood subject.', 'review-2'),
  choice('Choose the complete question.', 'b', [['a', 'Why the door was open'], ['b', 'Why was the door open?']], 'The second choice has question word order and asks a complete question.', 'review-3'),
  choice('Which group expresses a complete thought?', 'a', [['a', 'The concert begins at seven.'], ['b', 'Before the concert at seven.']], 'The concert is the subject and begins at seven completes the thought.', 'review-4'),
];

const punctuationRows = [
  example('Compare “the meeting starts now” with “The meeting starts now.”', 'A written statement begins with a capital and ends with a period.', 'statement'),
  example('Compare “Did you bring the map?” with “Watch out!”', 'A direct question uses a question mark. A strong warning or exclamation may use an exclamation mark.', 'question-exclamation'),
  choice('Choose the correctly written statement.', 'a', [['a', 'The library closes at six.'], ['b', 'the library closes at six?']], 'The statement begins with capital T and ends with a period.', 'capital-period-1'),
  choice('Choose the correctly written question.', 'b', [['a', 'Where is my notebook.'], ['b', 'Where is my notebook?']], 'A direct question begins with a capital and ends with a question mark.', 'question-mark-1'),
  choice('Choose the correctly written warning.', 'c', [['a', 'look out.'], ['b', 'Look out?'], ['c', 'Look out!']], 'The warning begins with a capital; an exclamation mark matches its strong force.', 'exclamation-1'),
  choice('Which sentence uses a capital for a person’s name?', 'a', [['a', 'I asked Mateo for help.'], ['b', 'I asked mateo for help.']], 'Mateo is a proper name, so it begins with a capital letter.', 'proper-name'),
  choice('Which sentence capitalizes a Canadian place correctly?', 'b', [['a', 'We travelled to red deer.'], ['b', 'We travelled to Red Deer.']], 'Both words in the place name Red Deer begin with capitals.', 'place-name'),
  choice('Choose the correctly punctuated request.', 'a', [['a', 'Please pass the ruler.'], ['b', 'please pass the ruler?']], 'The polite command starts with a capital and normally ends with a period.', 'request-period'),
  text('Type this sentence with correct capitalization and an end mark: our class won the challenge', ['Our class won the challenge.'], 'Capitalize Our at the beginning and add a period because the sentence is a statement.', 'punctuation', 'edit-statement-1'),
  text('Type this direct question correctly: when does the film begin', ['When does the film begin?'], 'Capitalize When and use a question mark for the direct question.', 'punctuation', 'edit-question-1'),
  choice('Choose the line with the correct end mark.', 'c', [['a', 'What a remarkable view?'], ['b', 'What a remarkable view.'], ['c', 'What a remarkable view!']], 'The line expresses strong feeling rather than asking a question, so an exclamation mark fits.', 'exclamation-2'),
  choice('Which title is capitalized correctly?', 'b', [['a', 'a Wrinkle in Time'], ['b', 'A Wrinkle in Time']], 'The first word of a title is capitalized; short words such as in may remain lowercase.', 'title-capital'),
  choice('Choose the sentence with the correct capital letter.', 'a', [['a', 'We visit Grandma Lee on Sunday.'], ['b', 'We visit grandma Lee on sunday.']], 'Grandma Lee is used as a name and Sunday is a day name, so both begin with capitals.', 'family-day'),
  choice('Which sentence ends correctly?', 'b', [['a', 'Could you help me.'], ['b', 'Could you help me?']], 'Could you help me is a direct question and takes a question mark.', 'question-mark-2'),
  text('Correct the sentence: edmonton is the capital of alberta', ['Edmonton is the capital of Alberta.'], 'Edmonton and Alberta are proper names; the statement also needs an initial capital and period.', 'punctuation', 'proper-places'),
  choice('Choose the correctly written sentence.', 'c', [['a', 'On monday, we begin.'], ['b', 'on Monday, we begin?'], ['c', 'On Monday, we begin.']], 'The sentence and Monday begin with capitals, and the statement ends with a period.', 'day-statement'),
  choice('Which option asks a complete direct question?', 'a', [['a', 'Have you seen the keys?'], ['b', 'Have you seen the keys!']], 'A direct request for information ends with a question mark.', 'direct-question'),
  text('Correct the message: please call aunt rosa tonight', ['Please call Aunt Rosa tonight.'], 'Capitalize the first word and Aunt Rosa because the family title is part of the name; finish the request with a period.', 'punctuation', 'family-name'),
  choice('A trail sign needs a clear warning. Choose the best version.', 'b', [['a', 'danger falling rocks.'], ['b', 'Danger! Falling rocks.']], 'The capitalized warning and exclamation mark signal danger; the following statement is also capitalized and complete.', 'transfer-sign'),
  text('Write this exhibit question correctly: who made this wooden tool', ['Who made this wooden tool?'], 'Capitalize Who and add a question mark because the exhibit asks a direct question.', 'punctuation', 'transfer-exhibit'),
  choice('Choose the correctly punctuated statement.', 'a', [['a', 'The snow melted quickly.'], ['b', 'The snow melted quickly?']], 'This line gives information, so it ends with a period.', 'review-period'),
  choice('Choose the correctly capitalized sentence.', 'b', [['a', 'My friend moved to nova scotia.'], ['b', 'My friend moved to Nova Scotia.']], 'Nova Scotia is a proper place name, so both words begin with capitals.', 'review-place'),
  text('Correct the question: are we meeting on friday', ['Are we meeting on Friday?'], 'Capitalize the first word and Friday, then add a question mark.', 'punctuation', 'review-question'),
  choice('Choose the correctly written exclamation.', 'c', [['a', 'that was close?'], ['b', 'That was close.'], ['c', 'That was close!']], 'The strong reaction begins with a capital and appropriately ends with an exclamation mark.', 'review-exclamation'),
];

const pronounRows = [
  example('Compare “She carried the box” with “The guide thanked her.”', 'She is a subject pronoun because it performs the action. Her is an object pronoun because it receives the action.', 'subject-object'),
  example('Compare “They called us” with “We called them.”', 'They and we are subject forms. Us and them are object forms.', 'plural-forms'),
  choice('Choose the pronoun: ___ found the missing page.', 'a', [['a', 'She'], ['b', 'Her']], 'She is the subject performing the action found.', 'subject-she'),
  choice('Choose the pronoun: The librarian helped ___.', 'b', [['a', 'we'], ['b', 'us']], 'Us is the object receiving the librarian’s help.', 'object-us'),
  choice('Choose the pronoun: Jordan and ___ sorted the cards.', 'a', [['a', 'I'], ['b', 'me']], 'Remove Jordan and: “I sorted the cards” shows that I is the subject form.', 'compound-subject-i'),
  choice('Choose the pronoun: The coach spoke to Maya and ___.', 'b', [['a', 'I'], ['b', 'me']], 'After to, the pronoun is an object. “The coach spoke to me” confirms the form.', 'compound-object-me'),
  choice('Choose the pronoun: ___ are ready to begin.', 'c', [['a', 'Them'], ['b', 'Us'], ['c', 'They']], 'They is a subject pronoun and performs the action are ready.', 'subject-they'),
  choice('Choose the pronoun: Please give the tickets to ___.', 'a', [['a', 'him'], ['b', 'he']], 'Him is the object of the preposition to.', 'object-him'),
  choice('Choose the sentence with the correct subject pronoun.', 'b', [['a', 'Her and I checked the list.'], ['b', 'She and I checked the list.']], 'She and I are both subject forms because they do the checking.', 'compound-subject'),
  choice('Choose the sentence with the correct object pronoun.', 'a', [['a', 'The message surprised them.'], ['b', 'The message surprised they.']], 'Them is the object receiving the action surprised.', 'object-them'),
  choice('Choose the pronoun: My brother and ___ made lunch.', 'c', [['a', 'me'], ['b', 'him'], ['c', 'I']], 'I is the subject form; “I made lunch” remains grammatical when the other subject is removed.', 'subject-i'),
  choice('Choose the pronoun: The teacher paired Sam with ___.', 'b', [['a', 'she'], ['b', 'her']], 'Her is the object of the preposition with.', 'object-her'),
  choice('Choose the pronoun: ___ invited Alex and me.', 'a', [['a', 'They'], ['b', 'Them']], 'They is the subject that performs invited.', 'subject-plural'),
  choice('Choose the pronoun: The storm did not frighten ___.', 'c', [['a', 'we'], ['b', 'they'], ['c', 'us']], 'Us is the object of the verb frighten.', 'object-after-verb'),
  choice('Choose the sentence that uses singular they correctly.', 'b', [['a', 'Someone left his or her bottle, but it may only belong to a boy or girl.'], ['b', 'Someone left their bottle; they can claim it at the desk.']], 'Singular they can refer to a person whose identity or gender is unknown.', 'singular-they'),
  choice('Choose the pronoun: Between you and ___, the puzzle was difficult.', 'a', [['a', 'me'], ['b', 'I']], 'Me is the object form after the preposition between.', 'between-me'),
  choice('Choose the sentence with matching pronoun roles.', 'c', [['a', 'Us thanked they.'], ['b', 'Them thanked we.'], ['c', 'We thanked them.']], 'We is the subject performing thanked, and them is the object receiving thanks.', 'roles-both'),
  choice('Choose the pronoun: Neither Noor nor ___ had seen the note.', 'b', [['a', 'her'], ['b', 'she']], 'She is part of the compound subject performing had seen.', 'nor-subject'),
  choice('At a service desk, choose the correct sentence.', 'a', [['a', 'They gave the receipt to me.'], ['b', 'Them gave the receipt to I.']], 'They is the subject; me is the object after to.', 'transfer-service'),
  choice('In a science report, choose the correct sentence.', 'b', [['a', 'Her and him measured the water.'], ['b', 'She and he measured the water.']], 'She and he are subject forms because both people perform measured.', 'transfer-report'),
  choice('Choose the pronoun: The invitation was for Aria and ___.', 'c', [['a', 'I'], ['b', 'we'], ['c', 'me']], 'Me is the object form because it follows the preposition for.', 'review-object-me'),
  choice('Choose the pronoun: ___ will present first.', 'a', [['a', 'We'], ['b', 'Us']], 'We is the subject form performing will present.', 'review-subject-we'),
  choice('Choose the correct sentence.', 'b', [['a', 'The guide showed we the map.'], ['b', 'The guide showed us the map.']], 'Us is the indirect object receiving what was shown.', 'review-object-us'),
  choice('Choose the correct sentence.', 'a', [['a', 'He and I arrived early.'], ['b', 'Him and me arrived early.']], 'He and I are subject pronouns because they perform arrived.', 'review-compound'),
];

export const c0PilotPacks = [
  makePack('SP.patterns', 'Spelling Patterns', 'Use the base word, vowel pattern, and ending together. Patterns help predict spelling, but legitimate exceptions and variants must be taught explicitly.', ['Say the base word.', 'Mark the vowel and final letters.', 'Try the applicable pattern, then check for an exception.'], spellingRows),
  makePack('SE.complete', 'Complete Sentences', 'A complete sentence expresses a complete thought and has a subject and a predicate. Commands may have an understood subject.', ['Find who or what the words are about.', 'Find what that subject is or does.', 'Ask whether the thought can stand alone.'], sentenceRows, {
    status: 'independently_challenged',
    reviewStatus: 'independently_challenged',
    sourceIds: [
      'ab-elal-2022-overview',
      'ca-language-portal-subject',
      'ca-language-portal-predicate',
      'ca-language-portal-recognizing-clauses',
      'ca-language-portal-sentence-structure',
      'ca-language-portal-fragments',
    ],
  }),
  makePack('PU.capitals-endmarks', 'Capitals and End Marks', 'Begin sentences and proper names with capitals. Choose a period, question mark, or exclamation mark from the sentence’s purpose.', ['Find the beginning and any proper names.', 'Decide whether the sentence states, asks, or strongly exclaims.', 'Check the matching final mark.'], punctuationRows),
  makePack('GR.subject-object-pronouns', 'Subject and Object Pronouns', 'Use subject forms for who or what performs the action and object forms after verbs or prepositions.', ['Find the verb.', 'Ask who performs it and who receives it.', 'Remove the other noun in a compound to check the pronoun form.'], pronounRows),
];

export const c0PilotItems = c0PilotPacks.flatMap((pack) => pack.items);
