import { applyCorrections } from '../learning/contentCorrections.js';
import { applyPilotApproval } from '../learning/pilotApproval.js';
import pilotApprovalData from './pilotApproval.c0.json' with { type: 'json' };
import correctionData from './corrections.c0.json' with { type: 'json' };
const base = {
  version: 1,
  difficulty: 1,
  prerequisites: [],
  helpSteps: ['You may ask for help, but this answer will be marked assisted.'],
  commonErrors: [],
  authorStatus: 'draft',
  reviewStatus: 'independently_challenged',
  releaseStatus: 'not_released',
  sourceIds: ['ab-elal-2022-overview', 'ab-eal-benchmarks-4-6'],
  secondarySkills: [],
};

// What a receptive decoding result may be said to show. The learner reads the printed word, then
// picks the recording that matches it. That is recognition of a spelling-to-sound relationship; it
// is not evidence that the learner can read an unfamiliar word aloud unaided, and the report says so.
export const RECEPTIVE_DECODING_REPORT_LABEL = 'recognizing a plausible pronunciation from spelling';

export const C0_ASSESSMENT_NOTICE = 'Partially integrated C0 assessment preview: all prompts completed challenge review; 28 Part-B prompts completed educational/source review and app integration. The 40 Part-A prompts remain blocked by human-audio or specialist review. No result can affect placement or mastery.';

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
    authorStatus: values.part === 'B' ? 'reviewed' : base.authorStatus,
    reviewStatus: values.part === 'B' ? 'reviewed' : base.reviewStatus,
    integrationStatus: values.part === 'B' ? 'integrated' : 'not_integrated',
  };
}

const formBanks = {
  A: {
    spelling: ['adventure', 'carefully', 'planned', 'disappear', 'celebration', 'comfortable', 'independent', 'transportation'],
    decoding: [
      ['Choose the syllable break that helps you read “splendid”.', 'a', [['a', 'splen-did'], ['b', 'spl-endid']]],
      ['Choose the syllable break that helps you read “astonish”.', 'b', [['a', 'ast-onish'], ['b', 'as-ton-ish']]],
    ],
    receptiveDecoding: [
      {
        word: 'Narpish', skill: 'PH.syllables', answer: 'b',
        target: 'NAR-pish: ar as in car, then a short i as in sit.',
        options: [
          ['a', 'nay pish', 'Reads the a as the long a in name.'],
          ['b', 'nar pish', 'The expected reading: NAR-pish.'],
          ['c', 'nar peesh', 'Reads the i as the long e in see.'],
        ],
      },
      {
        word: 'Vemicate', skill: 'PH.multisyllable', answer: 'a',
        target: 'VEM-ih-kayt: a short e, a weak middle syllable, then a long a in the final syllable.',
        options: [
          ['a', 'vem ih kayt', 'The expected reading: VEM-ih-kayt.'],
          ['b', 'veem ih kayt', 'Reads the first e as the long e in see.'],
          ['c', 'vem ih kat', 'Reads the final a as the short a in cat, ignoring the silent e.'],
        ],
      },
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
      ['Choose the sentence with correct list commas.', 'PU.list-commas', 'b', [['a', 'We packed paper ink and string.'], ['b', 'We packed paper, ink, and string.']], 'The commas clearly separate the three listed items; the final serial comma is an accepted clarity choice.'],
      ['Choose the correctly punctuated direct address.', 'PU.direct-address', 'a', [['a', 'Maya, please check this line.'], ['b', 'Maya please, check this line.']], 'The comma after Maya separates the person being addressed from the request.'],
    ],
    editing: 'Edit this sentence so it says that Mia, one person, checks the two labels now, and that the labels are different from each other. Exactly four things need fixing: a capital, subject–verb agreement, a pronoun, and an end mark. “mia check the two labels because her are different”',
    editingKey: {
      intendedMeaning: 'Mia, one person, checks two labels in the present; the labels differ from each other.',
      modelAnswer: 'Mia checks the two labels because they are different.',
      targets: [
        'Capital: mia becomes Mia.',
        'Subject–verb agreement: check becomes checks, because Mia is singular.',
        'Pronoun: her becomes they, referring to the two labels.',
        'End mark: add a period.',
      ],
      notAccepted: 'Changing are to were. The intended meaning is present tense, and they are is already correct with the plural antecedent labels, so a past-tense rewrite changes the meaning instead of repairing an error.',
    },
    writing: 'Write two sentences explaining how you would check whether two copied notes match.',
  },
  B: {
    spelling: ['remarkable', 'readiness', 'stopping', 'impatient', 'observation', 'temperature', 'responsible', 'communication'],
    decoding: [
      ['Choose the syllable break that helps you read “frantic”.', 'a', [['a', 'fran-tic'], ['b', 'frant-ic']]],
      ['Choose the syllable break that helps you read “remember”.', 'a', [['a', 're-mem-ber'], ['b', 'remem-ber']]],
    ],
    receptiveDecoding: [
      {
        word: 'Tembish', skill: 'PH.syllables', answer: 'c',
        target: 'TEM-bish: a short e as in bed, then a short i as in sit.',
        options: [
          ['a', 'teem bish', 'Reads the e as the long e in see.'],
          ['b', 'tem beesh', 'Reads the i as the long e in see.'],
          ['c', 'tem bish', 'The expected reading: TEM-bish.'],
        ],
      },
      {
        word: 'Lopadent', skill: 'PH.multisyllable', answer: 'a',
        target: 'LOH-puh-dent: an open first syllable with a long o, a weak middle syllable, then a short e.',
        options: [
          ['a', 'loh puh dent', 'The expected reading: LOH-puh-dent, using the open-syllable pattern.'],
          ['b', 'lop uh dent', 'Closes the first syllable, giving the short o in hop.'],
          ['c', 'loh pay dent', 'Reads the middle a as the long a in name.'],
        ],
      },
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
      ['Choose the sentence with correct list commas.', 'PU.list-commas', 'a', [['a', 'The box held maps, notes, and photographs.'], ['b', 'The box held maps notes and photographs.']], 'The commas clearly separate the three listed items; the final serial comma is an accepted clarity choice.'],
      ['Choose the correctly punctuated direct address.', 'PU.direct-address', 'b', [['a', 'Please Amira, read the title.'], ['b', 'Please, Amira, read the title.']], 'The commas around Amira separate the person being addressed from the request.'],
    ],
    editing: 'Edit this sentence so it says that yesterday the group inspected one teacher’s folder carefully. Exactly four things need fixing: a capital, verb tense, a possessive apostrophe, and an end mark. “yesterday we inspect the teachers folder carefully”',
    editingKey: {
      intendedMeaning: 'Yesterday the group inspected one teacher’s folder carefully.',
      modelAnswer: 'Yesterday we inspected the teacher’s folder carefully.',
      targets: [
        'Capital: yesterday becomes Yesterday.',
        'Verb tense: inspect becomes inspected, because yesterday sets the past.',
        'Possessive apostrophe: teachers becomes teacher’s, one teacher owning the folder.',
        'End mark: add a period.',
      ],
      notAccepted: 'Reading teachers as plural and writing teachers’. The stated meaning names one teacher, so a plural reading is recorded as a reasonable alternative for review rather than marked right or wrong.',
    },
    writing: 'Write two sentences explaining what you would do when a document has no date.',
  },
};

function buildForm(form) {
  const bank = formBanks[form];
  const items = [];
  bank.spelling.forEach((word, index) => items.push(item(form, items.length + 1, { part: 'A', category: 'spelling_dictation', primarySkill: index < 4 ? 'SP.patterns' : 'SP.wordparts', prompt: `Listen to spelling item ${form}${index + 1}, then type the word.`, spokenText: word, audioStatus: 'synthetic_preview', responseType: 'text', evaluator: 'spelling', acceptedAnswers: [word], evidenceEligibility: 'draft_audio_only', explanation: 'Scored from the first typed spelling; release audio must be independently checked before this item is eligible evidence.' })));
  bank.decoding.forEach(([prompt, answer, choices]) => items.push(item(form, items.length + 1, { part: 'A', category: 'decoding', primarySkill: 'PH.syllables', prompt, responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: choices.map(([id, text]) => ({ id, text })), explanation: 'Use vowel patterns and pronounceable word parts rather than counting letters.' })));
  bank.receptiveDecoding.forEach((entry) => items.push(item(form, items.length + 1, {
    part: 'A',
    category: 'receptive_decoding',
    primarySkill: entry.skill,
    version: 2,
    printedWord: entry.word,
    prompt: `Look at the invented word “${entry.word}”. Which recording best matches how its spelling would normally be read?`,
    responseType: 'audio_choice',
    evaluator: 'choice',
    acceptedAnswers: [entry.answer],
    // The learner sees only a numbered recording. The spoken text is the audio itself and the
    // checker note belongs to the listening check, so neither reveals the answer on screen.
    choices: entry.options.map(([id, spokenText, checkerNote], index) => ({ id, text: `Recording ${index + 1}`, spokenText, checkerNote })),
    audioStatus: 'synthetic_preview',
    evidenceEligibility: 'draft_audio_only',
    targetPronunciation: entry.target,
    reportedAs: RECEPTIVE_DECODING_REPORT_LABEL,
    optionalPractice: {
      prompt: `Now read “${entry.word}” aloud and record it, then play the recording you chose and compare them.`,
      responseType: 'recording',
      evaluator: 'self_comparison',
      scoring: 'Never scored. No qualified rater is available, so this recording is the learner’s own comparison and is never independent evidence.',
    },
    explanation: 'Use the vowel patterns and syllable shapes in the spelling to decide which reading fits. Choosing the matching recording shows that you can recognize a plausible pronunciation from a spelling. It does not show that you can read an unfamiliar word aloud unaided.',
  })));
  bank.listening.forEach(([first, second], index) => {
    const answer = index % 2 === 0 ? 'a' : 'b';
    items.push(item(form, items.length + 1, { part: 'A', category: 'listening', primarySkill: 'PR.discrimination', prompt: `Listen to contrast item ${form}${index + 1}, then choose the word you hear.`, spokenText: answer === 'a' ? first : second, audioStatus: 'synthetic_preview', responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: [{ id: 'a', text: first }, { id: 'b', text: second }], evidenceEligibility: 'draft_audio_only', explanation: 'This synthetic preview checks the flow only; reviewed human audio is required before listening evidence can count.' }));
  });
  const stressTargets = form === 'A' ? ['primary stress on PHO in photograph', 'primary stress on TA in invitation'] : ['primary stress on MA in information', 'primary stress on MU in community'];
  bank.speaking.forEach((prompt, index) => items.push(item(form, items.length + 1, { part: 'A', category: 'speaking', primarySkill: index < 2 ? 'PR.word-stress' : 'PR.sentence-reading', prompt: `Record yourself: ${prompt}`, responseType: 'recording', evaluator: 'human_rubric', rubric: { dimensions: ['intelligibility', 'target_pattern'], targetPattern: index < 2 ? stressTargets[index] : index === 2 ? 'intelligible word boundaries and phrase-final pause' : 'intelligible phrasing across the introductory clause and main clause', ratingScale: { meets: 'The whole sample is understandable and the named target is present.', developing: 'Meaning is mostly understandable but the named target is inconsistent.', retry: 'The recording is not clear enough to judge; request another recording without assigning a wrong score.' }, requiresHumanReview: true }, explanation: 'A human reviewer uses the named target and rating anchors; a transcript alone cannot determine pronunciation accuracy.' })));
  bank.sentences.forEach(([prompt, skill, answer, choices, explanation]) => items.push(item(form, items.length + 1, { part: 'B', category: 'sentence', primarySkill: skill, prompt, responseType: 'choice', evaluator: 'choice', acceptedAnswers: [answer], choices: choices.map(([id, text]) => ({ id, text })), explanation })));
  items.push(item(form, items.length + 1, { part: 'B', category: 'editing', primarySkill: 'ED.locate', version: 2, prompt: bank.editing, responseType: 'text', evaluator: 'human_rubric', rubric: { targets: 4, dimensions: ['locate', 'repair', 'preserve_meaning'], intendedMeaning: bank.editingKey.intendedMeaning, modelAnswer: bank.editingKey.modelAnswer, answerKey: bank.editingKey.targets, notAccepted: bank.editingKey.notAccepted, scoring: 'Award one point for each of the four named targets. The intended meaning is stated in the prompt, so a rewrite that changes the meaning is not a repair. Record any other reasonable alternative for review rather than marking it wrong.' }, explanation: 'The prompt states the intended meaning and the key names exactly four targets, so the count cannot be inferred differently by different readers.' }));
  items.push(item(form, items.length + 1, { part: 'B', category: 'writing', primarySkill: 'ED.explain', prompt: bank.writing, responseType: 'text', evaluator: 'human_rubric', rubric: { sentenceCount: 2, dimensions: ['complete_sentences', 'clear_sequence'], scoring: { complete_sentences: 'Both requested sentences express complete thoughts.', clear_sequence: 'The response gives a sensible check or next step in an order a reader can follow.', reviewRequired: 'A human records each dimension separately; spelling errors outside the named dimensions do not make the response wrong.' } }, explanation: 'Open writing remains pending until a human applies both visible rubric dimensions.' }));
  return { id: `c0.assessment.${form.toLowerCase()}`, form, version: 1, status: 'partial_integration', items };
}

const rawC0AssessmentForms = [buildForm('A'), buildForm('B')];
// Prompts with an open correction stay in the form for auditing but are stamped as quarantined;
// the runner withholds them and reports the reduced coverage.
export const c0AssessmentForms = rawC0AssessmentForms.map((form) => ({
  ...form,
  items: applyCorrections(form.items, correctionData.corrections).map((item) => applyPilotApproval(item, pilotApprovalData.approvals, form.id)),
}));
export const c0AssessmentItems = c0AssessmentForms.flatMap((form) => form.items);
