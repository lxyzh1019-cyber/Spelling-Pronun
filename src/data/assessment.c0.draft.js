const base = {
  version: 1,
  difficulty: 1,
  prerequisites: [],
  helpSteps: ['You may ask for help, but this answer will be marked assisted.'],
  commonErrors: [],
  authorStatus: 'draft',
  reviewStatus: 'independently_challenged',
  sourceIds: ['ab-elal-2022-overview', 'ab-eal-benchmarks-4-6'],
  secondarySkills: [],
};

function item(form, number, values) {
  return {
    ...base,
    id: `c0.assessment.${form.toLowerCase()}.${String(number).padStart(2, '0')}`,
    form,
    order: number,
    role: 'assessment',
    transferGroup: `assessment-${form}-${number}`,
    evidenceEligibility: values.evaluator === 'human_rubric' ? 'pending_human_review' : 'independent_first_answer',
    ...values,
  };
}

const formBanks = {
  A: {
    spelling: ['adventure', 'carefully', 'planned', 'disappear', 'celebration', 'comfortable', 'independent', 'transportation'],
    decoding: [
      ['Choose the syllable break that helps you read “splendid”.', 'a', [['a', 'splen-did'], ['b', 'spl-endid']]],
      ['Choose the syllable break that helps you read “astonish”.', 'b', [['a', 'ast-onish'], ['b', 'as-ton-ish']]],
      ['“Narpish” is an invented word pronounced NAR-pish. Choose the matching syllable break.', 'a', [['a', 'nar-pish'], ['b', 'narp-ish']]],
      ['“Vemicate” is an invented word pronounced VEM-ih-kayt. Choose the matching syllable break.', 'b', [['a', 'vemic-ate'], ['b', 'vem-i-cate']]],
    ],
    listening: [['ship', 'sheep'], ['bit', 'beat'], ['full', 'fool'], ['cap', 'cab']],
    speaking: ['photograph', 'invitation', 'Read: The careful reader checked every heading.', 'Read: Before the exhibit opened, the team reviewed the final proof.'],
    sentences: [
      ['Choose the word that completes the sentence: Priya gave the map to ___.', 'GR.subject-object-pronouns', 'b', [['a', 'we'], ['b', 'us']], 'Us is the object of the preposition to.'],
      ['Choose the word that completes the sentence: Liam and ___ checked the list.', 'GR.subject-object-pronouns', 'a', [['a', 'she'], ['b', 'her']], 'She is the subject form because Liam and she perform checked.'],
      ['Choose the sentence with clear pronoun reference.', 'GR.antecedents', 'b', [['a', 'When Ava called Mia, she was outside.'], ['b', 'Ava was outside when she called Mia.']], 'In choice b, Ava is the sentence subject and she clearly continues to refer to Ava.'],
      ['Choose the sentence with correct agreement.', 'GR.agreement', 'a', [['a', 'Each of the labels is numbered.'], ['b', 'Each of the labels are numbered.']], 'Each is singular, so it takes the singular verb is.'],
      ['Choose the sentence with consistent past tense.', 'GR.tense', 'b', [['a', 'We opened the box and examine the page.'], ['b', 'We opened the box and examined the page.']], 'Opened and examined are both past-tense verbs.'],
      ['Choose the sentence that shows ownership correctly.', 'GR.possessives', 'a', [['a', 'The archivist’s notes were clear.'], ['b', 'The archivists notes were clear.']], 'The apostrophe and s show that the notes belong to one archivist.'],
      ['Choose the complete sentence.', 'SE.complete', 'b', [['a', 'After the rain stopped.'], ['b', 'The runners returned to the track.']], 'The runners is the subject and returned to the track is a complete predicate.'],
      ['Choose the best repair for the fragment “Because the gate was locked.”', 'SE.fragments', 'a', [['a', 'We waited because the gate was locked.'], ['b', 'Because the locked gate.']], 'Choice a adds an independent clause, We waited, to complete the because-clause.'],
      ['Choose the best repair for “The bell rang, everyone entered.”', 'SE.runons', 'b', [['a', 'The bell, rang everyone entered.'], ['b', 'The bell rang, and everyone entered.']], 'Choice b joins the two complete thoughts with a comma and the conjunction and.'],
      ['Choose the sentence with correct end punctuation.', 'PU.capitals-endmarks', 'a', [['a', 'Where did the folder go?'], ['b', 'Where did the folder go.']], 'A direct question ends with a question mark.'],
      ['Choose the sentence with correct list commas.', 'PU.list-commas', 'b', [['a', 'We packed paper ink and string.'], ['b', 'We packed paper, ink, and string.']], 'Commas separate the three listed items: paper, ink, and string.'],
      ['Choose the correctly punctuated direct address.', 'PU.direct-address', 'a', [['a', 'Maya, please check this line.'], ['b', 'Maya please, check this line.']], 'The comma after Maya separates the person being addressed from the request.'],
    ],
    editing: 'Edit this sentence for exactly four targets: a capital, an end mark, subject–verb agreement, and a pronoun. “mia check the two labels because her are different”',
    writing: 'Write two sentences explaining how you would check whether two copied notes match.',
  },
  B: {
    spelling: ['remarkable', 'readiness', 'stopping', 'impatient', 'observation', 'temperature', 'responsible', 'communication'],
    decoding: [
      ['Choose the syllable break that helps you read “frantic”.', 'a', [['a', 'fran-tic'], ['b', 'frant-ic']]],
      ['Choose the syllable break that helps you read “remember”.', 'a', [['a', 're-mem-ber'], ['b', 'remem-ber']]],
      ['“Tembish” is an invented word pronounced TEM-bish. Choose the matching syllable break.', 'b', [['a', 'temb-ish'], ['b', 'tem-bish']]],
      ['“Lopadent” is an invented word pronounced LOH-puh-dent. Choose the matching syllable break.', 'a', [['a', 'lo-pa-dent'], ['b', 'lopad-ent']]],
    ],
    listening: [['live', 'leave'], ['sit', 'seat'], ['pull', 'pool'], ['rice', 'rise']],
    speaking: ['information', 'community', 'Read: The curious student compared both copies.', 'Read: After the letter arrived, we recorded its date and condition.'],
    sentences: [
      ['Choose the word that completes the sentence: The guide showed ___ the display.', 'GR.subject-object-pronouns', 'a', [['a', 'them'], ['b', 'they']], 'Them is the indirect object receiving what the guide showed.'],
      ['Choose the word that completes the sentence: Noor and ___ found the envelope.', 'GR.subject-object-pronouns', 'b', [['a', 'him'], ['b', 'he']], 'He is the subject form because Noor and he perform found.'],
      ['Choose the sentence with clear pronoun reference.', 'GR.antecedents', 'a', [['a', 'Sofia put the book away after she read it.'], ['b', 'After Sofia spoke with Lina, she put the book away.']], 'In choice a, she refers to Sofia and it refers to the book; choice b leaves she unclear.'],
      ['Choose the sentence with correct agreement.', 'GR.agreement', 'b', [['a', 'Neither of the pages have a date.'], ['b', 'Neither of the pages has a date.']], 'Neither is singular here, so it takes the singular verb has.'],
      ['Choose the sentence with consistent present tense.', 'GR.tense', 'a', [['a', 'I compare the pages and record the changes.'], ['b', 'I compare the pages and recorded the changes.']], 'Compare and record are both present-tense verbs.'],
      ['Choose the sentence that shows ownership correctly.', 'GR.possessives', 'b', [['a', 'The students notebook was open.'], ['b', 'The student’s notebook was open.']], 'The apostrophe and s show that the notebook belongs to one student.'],
      ['Choose the complete sentence.', 'SE.complete', 'a', [['a', 'Our class visited the museum.'], ['b', 'Near the museum entrance.']], 'Our class is the subject and visited the museum is the predicate.'],
      ['Choose the best repair for the fragment “While the bus was waiting.”', 'SE.fragments', 'b', [['a', 'While waiting bus.'], ['b', 'We boarded while the bus was waiting.']], 'Choice b adds the independent clause We boarded to complete the while-clause.'],
      ['Choose the best repair for “I found the date, I wrote it down.”', 'SE.runons', 'a', [['a', 'I found the date, so I wrote it down.'], ['b', 'I found, the date I wrote it down.']], 'Choice a joins the two complete thoughts with a comma and the conjunction so.'],
      ['Choose the sentence with correct end punctuation.', 'PU.capitals-endmarks', 'b', [['a', 'Please close the case?'], ['b', 'Please close the case.']], 'A mild command with please normally ends with a period.'],
      ['Choose the sentence with correct list commas.', 'PU.list-commas', 'a', [['a', 'The box held maps, notes, and photographs.'], ['b', 'The box held maps notes and photographs.']], 'Commas separate the three listed items: maps, notes, and photographs.'],
      ['Choose the correctly punctuated direct address.', 'PU.direct-address', 'b', [['a', 'Please Amira, read the title.'], ['b', 'Please, Amira, read the title.']], 'The commas around Amira separate the person being addressed from the request.'],
    ],
    editing: 'Edit this sentence for exactly four targets: a capital, an end mark, verb tense, and a possessive apostrophe. “yesterday we inspect the teachers folder carefully”',
    writing: 'Write two sentences explaining what you would do when a document has no date.',
  },
};

function buildForm(form) {
  const bank = formBanks[form];
  const items = [];
  bank.spelling.forEach((word, index) => items.push(item(form, items.length + 1, { part: 'A', category: 'spelling_dictation', primarySkill: index < 4 ? 'SP.patterns' : 'SP.wordparts', prompt: `Listen to spelling item ${form}${index + 1}, then type the word.`, spokenText: word, audioStatus: 'synthetic_preview', responseType: 'text', evaluator: 'spelling', acceptedAnswers: [word], evidenceEligibility: 'draft_audio_only', explanation: 'Scored from the first typed spelling; release audio must be independently checked before this item is eligible evidence.' })));
  bank.decoding.forEach(([prompt, answer, choices]) => items.push(item(form, items.length + 1, { part: 'A', category: 'decoding', primarySkill: 'PH.syllables', prompt, responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: choices.map(([id, text]) => ({ id, text })), explanation: 'Use vowel patterns and pronounceable word parts rather than counting letters.' })));
  bank.listening.forEach(([first, second], index) => {
    const answer = index % 2 === 0 ? 'a' : 'b';
    items.push(item(form, items.length + 1, { part: 'A', category: 'listening', primarySkill: 'PR.discrimination', prompt: `Listen to contrast item ${form}${index + 1}, then choose the word you hear.`, spokenText: answer === 'a' ? first : second, audioStatus: 'synthetic_preview', responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: [{ id: 'a', text: first }, { id: 'b', text: second }], evidenceEligibility: 'draft_audio_only', explanation: 'This synthetic preview checks the flow only; reviewed human audio is required before listening evidence can count.' }));
  });
  const stressTargets = form === 'A' ? ['primary stress on PHO in photograph', 'primary stress on TA in invitation'] : ['primary stress on MA in information', 'primary stress on MU in community'];
  bank.speaking.forEach((prompt, index) => items.push(item(form, items.length + 1, { part: 'A', category: 'speaking', primarySkill: index < 2 ? 'PR.word-stress' : 'PR.sentence-reading', prompt: `Record yourself: ${prompt}`, responseType: 'recording', evaluator: 'human_rubric', rubric: { dimensions: ['intelligibility', 'target_pattern'], targetPattern: index < 2 ? stressTargets[index] : index === 2 ? 'intelligible word boundaries and phrase-final pause' : 'intelligible phrasing across the introductory clause and main clause', ratingScale: { meets: 'The whole sample is understandable and the named target is present.', developing: 'Meaning is mostly understandable but the named target is inconsistent.', retry: 'The recording is not clear enough to judge; request another recording without assigning a wrong score.' }, requiresHumanReview: true }, explanation: 'A human reviewer uses the named target and rating anchors; a transcript alone cannot determine pronunciation accuracy.' })));
  bank.sentences.forEach(([prompt, skill, answer, choices, explanation]) => items.push(item(form, items.length + 1, { part: 'B', category: 'sentence', primarySkill: skill, prompt, responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: choices.map(([id, text]) => ({ id, text })), explanation })));
  items.push(item(form, items.length + 1, { part: 'B', category: 'editing', primarySkill: 'ED.locate', prompt: bank.editing, responseType: 'text', evaluator: 'human_rubric', rubric: { targets: 4, dimensions: ['locate', 'repair', 'preserve_meaning'], scoring: 'Award one point for each named correction only when the repaired sentence preserves the original meaning; record any reasonable alternative for human review.' }, explanation: 'A reviewer checks each of the four named targets separately and does not penalize an otherwise valid wording variant automatically.' }));
  items.push(item(form, items.length + 1, { part: 'B', category: 'writing', primarySkill: 'ED.explain', prompt: bank.writing, responseType: 'text', evaluator: 'human_rubric', rubric: { sentenceCount: 2, dimensions: ['complete_sentences', 'clear_sequence'], scoring: { complete_sentences: 'Both requested sentences express complete thoughts.', clear_sequence: 'The response gives a sensible check or next step in an order a reader can follow.', reviewRequired: 'A human records each dimension separately; spelling errors outside the named dimensions do not make the response wrong.' } }, explanation: 'Open writing remains pending until a human applies both visible rubric dimensions.' }));
  return { id: `c0.assessment.${form.toLowerCase()}`, form, version: 1, status: 'independently_challenged', items };
}

export const c0AssessmentForms = [buildForm('A'), buildForm('B')];
export const c0AssessmentItems = c0AssessmentForms.flatMap((form) => form.items);
