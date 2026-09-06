const common = {
  version: 1,
  difficulty: 1,
  prerequisites: [],
  helpSteps: ['Find the part the rule is about.', 'Compare it with the worked example.'],
  commonErrors: [],
  evidenceEligibility: 'fixture_only',
  authorStatus: 'engineering_fixture',
  reviewStatus: 'not_reviewed',
  secondarySkills: [],
  sourceIds: [],
};

export const PILOT_FIXTURE_NOTICE = 'Engineering preview: these sample items exercise the learning flow and are not reviewed release content.';

export const pilotItems = [
  {
    ...common,
    id: 'fixture.se.complete.01',
    primarySkill: 'SE.complete',
    role: 'independent',
    prompt: 'Which group of words is a complete sentence?',
    responseType: 'choice',
    evaluator: 'choice',
    acceptedAnswers: ['b'],
    choices: [{ id: 'a', text: 'After the bell rang' }, { id: 'b', text: 'The class opened its books.' }, { id: 'c', text: 'Running beside the fence' }],
    explanation: 'A complete sentence expresses a complete thought and has a subject and a predicate.',
    transferGroup: 'se-complete-subject-predicate',
  },
  {
    ...common,
    id: 'fixture.se.complete.transfer.01',
    primarySkill: 'SE.complete',
    role: 'transfer',
    prompt: 'Choose the complete sentence in this new setting.',
    responseType: 'choice',
    evaluator: 'choice',
    acceptedAnswers: ['c'],
    choices: [{ id: 'a', text: 'Near the old printing press' }, { id: 'b', text: 'Because the page was missing' }, { id: 'c', text: 'Maya examined the torn page.' }],
    explanation: '“Maya” is the subject and “examined the torn page” tells what she did.',
    transferGroup: 'se-complete-subject-predicate-transfer',
  },
  {
    ...common,
    id: 'fixture.sp.patterns.01',
    primarySkill: 'SP.patterns',
    role: 'independent',
    prompt: 'Choose the correctly spelled word.',
    responseType: 'choice',
    evaluator: 'choice',
    acceptedAnswers: ['a'],
    choices: [{ id: 'a', text: 'printing' }, { id: 'b', text: 'printting' }, { id: 'c', text: 'prinnting' }],
    explanation: 'The base word print keeps one t before -ing.',
    transferGroup: 'sp-patterns-base',
  },
  {
    ...common,
    id: 'fixture.pu.capitals.01',
    primarySkill: 'PU.capitals-endmarks',
    role: 'independent',
    prompt: 'Type this sentence with correct capitals and punctuation: the proof is ready',
    responseType: 'text',
    evaluator: 'punctuation',
    acceptedAnswers: ['The proof is ready.'],
    allowReview: false,
    explanation: 'Begin the sentence with a capital letter and finish the statement with a period.',
    transferGroup: 'pu-capitals-statements',
  },
  {
    ...common,
    id: 'fixture.gr.pronouns.01',
    primarySkill: 'GR.subject-object-pronouns',
    role: 'independent',
    prompt: 'Choose the pronoun that completes the sentence: Sam and ___ read the note.',
    responseType: 'choice',
    evaluator: 'choice',
    acceptedAnswers: ['she'],
    choices: [{ id: 'her', text: 'her' }, { id: 'she', text: 'she' }],
    explanation: 'The pronoun is part of the subject, so use the subject pronoun “she.”',
    transferGroup: 'gr-subject-pronouns',
  },
];

export const pilotLesson = {
  id: 'pilot-se-complete',
  title: 'The Complete Clue',
  primarySkill: 'SE.complete',
  rule: 'A complete sentence tells a complete thought. It needs a subject and a predicate.',
  examples: [
    { text: 'The printer checked the page.', note: 'Complete: who + what happened.' },
    { text: 'Beside the noisy machine', note: 'Not complete: it does not tell what happened.' },
  ],
  itemId: 'fixture.se.complete.01',
  transferItemId: 'fixture.se.complete.transfer.01',
};

export const assessmentFixtures = {
  A: ['fixture.sp.patterns.01', 'fixture.se.complete.01', 'fixture.pu.capitals.01', 'fixture.gr.pronouns.01'],
  B: ['fixture.gr.pronouns.01', 'fixture.pu.capitals.01', 'fixture.sp.patterns.01', 'fixture.se.complete.01'],
};

export const pilotEpisode = {
  id: 'fixture.episode.01',
  chapter: 1,
  title: 'The Printer’s Proof',
  intro: 'At a modern Alberta archive, a newly scanned page looks different from an older printed proof. The archivist asks you to inspect the sentences before anyone changes the catalogue.',
  taskIds: ['fixture.se.complete.01', 'fixture.se.complete.transfer.01'],
  reveal: 'The incomplete line is not part of the manuscript at all—it is a printer’s margin note. One mystery is solved, but a missing signature raises a new question.',
  historical: false,
  fictionLabel: 'Fictional reconstruction',
  sourceIds: [],
};

export function itemById(id) {
  return pilotItems.find((item) => item.id === id);
}
