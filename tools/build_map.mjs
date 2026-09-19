import fs from 'node:fs';
const ideas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// Coverage states. These are the only four, and they are deliberately not a percentage.
//   covered        — an app skill measures this, and content for it exists today
//   partial        — an app skill measures part of it; the rest is not built
//   not_built      — a machine-scorable outcome the app could measure and does not yet
//   not_measurable — the outcome needs a person: speaking, listening to a human, open writing,
//                    reading for enjoyment, or a judgement no answer key can make
const OVERRIDES = {
  'Conventions': {
    grade5: {
      1: ['covered', ['PU.capitals-endmarks']],
      2: ['covered', ['PU.capitals-endmarks']],
      3: ['not_measurable', [], 'Experimenting for effect is a composition choice; no key can mark it.'],
      4: ['not_built', ['GR.tense'], 'GR.tense is declared in skills.json with no content.'],
      5: ['not_built', ['GR.agreement'], 'GR.agreement is declared in skills.json with no content.'],
      6: ['covered', ['GR.subject-object-pronouns']],
      7: ['covered', ['GR.subject-object-pronouns']],
      8: ['not_built', ['GR.antecedents', 'GR.agreement'], 'Both skills are declared with no content.'],
      9: ['not_built', [], 'No app skill covers adverb placement.'],
      10: ['not_built', [], 'No app skill covers joining ideas with conjunctions; SE.combining is the nearest and has no content.'],
      11: ['partial', ['GR.subject-object-pronouns', 'GR.possessives'], 'Subject and object forms are covered; GR.possessives is declared with no content, and the other types have no skill at all.'],
      12: ['covered', ['SP.patterns']],
      13: ['covered', ['SP.patterns']],
      14: ['not_built', ['SP.wordparts', 'SP.inflections'], 'Both are declared with no lesson content; the assessment has two prefix/suffix prompts.'],
    },
    grade6: {
      1: ['covered', ['PU.capitals-endmarks']],
      2: ['covered', ['PU.capitals-endmarks']],
      3: ['not_measurable', [], 'Experimenting for effect is a composition choice; no key can mark it.'],
      4: ['not_built', ['GR.tense'], 'GR.tense is declared in skills.json with no content.'],
      5: ['not_built', ['GR.agreement'], 'GR.agreement is declared in skills.json with no content.'],
      6: ['not_built', ['SE.clauses'], 'SE.clauses is declared with no content.'],
      7: ['not_built', ['SE.combining', 'SE.clauses'], 'Both are declared with no content.'],
      8: ['covered', ['SP.patterns']],
      9: ['not_built', ['SP.wordparts', 'SP.inflections'], 'Both are declared with no content.'],
    },
  },
  'Vocabulary': {
    grade5: {
      4: ['not_built', ['SP.wordparts'], 'Bases and affixes: declared, no content.'],
      13: ['not_built', [], 'No app skill covers similes, metaphors or analogies.'],
      14: ['not_built', [], 'No app skill covers figurative meaning.'],
      12: ['not_built', [], 'No app skill covers context clues.'],
    },
    grade6: {
      3: ['not_built', ['SP.wordparts'], 'Greek and Latin roots: declared, no content.'],
      7: ['not_built', ['SP.wordparts'], 'Declared, no content.'],
      8: ['not_built', ['SP.wordparts'], 'Declared, no content.'],
      10: ['not_built', [], 'No app skill covers context clues.'],
      13: ['not_built', [], 'No app skill covers figurative meaning.'],
    },
  },
  'Writing': {
    grade5: { 8: ['not_built', ['ED.locate', 'ED.repair'], 'Both are declared; the assessment has one parent-marked editing prompt per form and no lesson content.'] },
    grade6: { 10: ['not_built', ['ED.locate', 'ED.repair'], 'Both are declared; the assessment has one parent-marked editing prompt per form and no lesson content.'] },
  },
};

// Everything not named above. The default says what kind of outcome the idea is, and each statement
// still carries its own text so the parent can disagree with any one of them.
const DEFAULTS = {
  'Text Forms and Structures': ['not_built', 'Recognising genre, structure, text features and character evidence can be asked as a question with a key; none is built.'],
  'Oral Language': ['not_measurable', 'Speaking, listening to a person, discussion and presentation. No answer key applies, and pronunciation is never auto-scored here.'],
  'Vocabulary': ['not_built', 'Word study is machine-scorable; none of it is built beyond the spelling pack.'],
  'Comprehension': ['not_built', 'Reading a passage and answering about it is machine-scorable; no passages exist.'],
  'Writing': ['not_measurable', 'Composition, research and publishing. A person marks these through the review queue; nothing is auto-scored.'],
  'Conventions': ['not_built', 'Machine-scorable; not built.'],
};
const NOT_MEASURABLE_VERBS = /^(Engage|Develop reading stamina|Listen|Recite|Sing|Experiment with creating|Read for enjoyment|Record words|Discuss|Share how|Consider how personal|Make connections between features of land)/;

const out = {
  version: 1,
  status: 'mapping_awaiting_parent_verification',
  source: {
    title: 'English Language Arts and Literature (K–6)',
    jurisdiction: 'Alberta',
    publisher: 'Alberta Education',
    dated: 'April 2022',
    implemented: 'September 2023',
    providedBy: 'parent',
    providedAt: '2026-09-18',
    providedAs: 'PDF supplied by the parent. This container cannot reach curriculum.learnalberta.ca, alberta.ca or open.alberta.ca, so the curriculum could not be fetched.',
    extraction: 'Every statement below is lifted from the PDF’s own text layer with column positions preserved, so it is attributed to the grade whose column it physically sits in. Grade 5 and Grade 6 share a page in two columns, and reading the page as flat text interleaves them. Nothing here is typed from memory or paraphrased.',
  },
  mappingReviewedBy: null,
  mappingReviewNote: 'The statements are the curriculum’s own words. The coverage decision beside each one is Claude’s judgement and has not been checked by the parent. Until it is, no part of this app may be described as covering the Alberta curriculum.',
  coverageStates: {
    covered: 'An app skill measures this outcome and content for it exists today.',
    partial: 'An app skill measures part of this outcome; the rest is not built.',
    not_built: 'A machine-scorable outcome the app could measure and does not yet.',
    not_measurable: 'The outcome needs a person: speaking, listening to a human, open writing, reading for enjoyment, or a judgement no answer key can make.',
  },
  gradesCovered: ['Grade 5', 'Grade 6'],
  organizingIdeasNotInGrade56: [
    { name: 'Phonological Awareness', lastGrade: 'Grade 2', note: 'Alberta ends this organizing idea after Grade 2.' },
    { name: 'Phonics', lastGrade: 'Grade 4', note: 'Alberta ends this organizing idea after Grade 4. There is no phonics outcome at Grade 5 or Grade 6, so phonics content cannot be described as Grade 5/6 Alberta curriculum. It may still be worth having as support, labelled as the Grade 1–4 foundation it is.' },
    { name: 'Fluency', lastGrade: 'Grade 4', note: 'Alberta ends this organizing idea after Grade 4.' },
  ],
  // Where the app's existing content actually sits against this curriculum. Two of the four packs
  // teach outcomes Alberta places below Grade 5, which does not make them useless — a child who needs
  // them needs them — but it does mean they cannot be reported as a Grade 5/6 check.
  appContentPlacement: [
    {
      packId: 'c0.pack.se.complete',
      teaches: 'A complete sentence has a subject and a predicate; telling a sentence from a fragment.',
      albertaGrade: 'Grade 3',
      matchingStatements: [
        'Grade 3 Conventions, Knowledge: "A sentence has two main parts, a subject and a predicate."',
        'Grade 3 Conventions, Skills & Procedures: "Identify the subject of a variety of sentences." and "Identify the predicate of a variety of sentences."',
      ],
      sourcePage: 41,
      note: 'The nearest Grade 5/6 outcome is Grade 6 Conventions, "Use independent and dependent clauses in sentences" and "Differentiate between simple and compound sentences" \u2014 a level above this pack, not the same level.',
    },
    {
      packId: 'c0.pack.pu.capitals-endmarks',
      teaches: 'Capital at the start of a sentence and in proper names; choosing the end mark.',
      albertaGrade: 'Grade 3 to Grade 4',
      matchingStatements: [
        'Grade 3 and Grade 4 Conventions, Skills & Procedures: "Capitalize words appropriately in different contexts." and "Include a variety of punctuation at the end of sentences."',
      ],
      sourcePage: 40,
      note: 'Grade 5/6 states this only in the general form "Apply capitalization to support effective written communication", and adds parentheses at Grade 5 and the colon at Grade 6, neither of which this pack teaches.',
    },
    {
      packId: 'c0.pack.gr.subject-object-pronouns',
      teaches: 'Subject and object pronoun forms.',
      albertaGrade: 'Grade 5',
      matchingStatements: [
        'Grade 5 Conventions, Skills & Procedures: "Determine nouns or pronouns that are the subject in a variety of sentences." and "Determine nouns or pronouns that are the object in a variety of sentences."',
      ],
      sourcePage: 60,
      note: 'At grade level. Grade 4 states the same outcome with "Identify" rather than "Determine".',
    },
    {
      packId: 'c0.pack.sp.patterns',
      teaches: 'Spelling patterns: doubling, dropping silent e, y to i, Canadian spellings.',
      albertaGrade: 'Grade 5',
      matchingStatements: [
        'Grade 5 Conventions, Skills & Procedures: "Investigate spelling patterns within and across words." and "Apply knowledge of spelling patterns to spell unfamiliar words."',
      ],
      sourcePage: 60,
      note: 'At grade level.',
    },
  ],
  // An app skill with no Grade 5/6 outcome. Every one of these is a deliberate statement, not an
  // oversight: some belong to an earlier grade, some to a curriculum this is not (the EAL benchmarks),
  // and some are conventions Alberta simply does not name at this level.
  skillsWithNoGrade56Outcome: {
    'SP.confusables': 'Homophone confusion is not a named Grade 5/6 outcome. It sits under the general Grade 6 understanding that spelling accuracy is helped by making spelling-meaning connections.',
    'SP.dictation': 'Dictation is a method of asking, not an outcome Alberta names.',
    'PH.blend-segment': 'Alberta ends the Phonics organizing idea after Grade 4.',
    'PH.vowels': 'Alberta ends the Phonics organizing idea after Grade 4.',
    'PH.digraphs-clusters': 'Alberta ends the Phonics organizing idea after Grade 4.',
    'PH.syllables': 'Alberta ends the Phonics organizing idea after Grade 4.',
    'PH.multisyllable': 'Alberta ends the Phonics organizing idea after Grade 4.',
    'PR.discrimination': 'ELAL has no pronunciation organizing idea at any grade. These skills came from the EAL benchmarks, and both children are native English speakers.',
    'PR.target-sounds': 'ELAL has no pronunciation organizing idea at any grade; see PR.discrimination.',
    'PR.endings': 'ELAL has no pronunciation organizing idea at any grade; see PR.discrimination.',
    'PR.word-stress': 'ELAL has no pronunciation organizing idea at any grade; see PR.discrimination.',
    'PR.sentence-reading': 'ELAL has no pronunciation organizing idea at any grade; see PR.discrimination. Reading aloud appears under Fluency, which ends after Grade 4.',
    'GR.reflexives': 'Not named at Grade 5 or Grade 6.',
    'GR.relative': 'Not named. Grade 6 names clauses without naming the relative pronoun.',
    'GR.interrogative': 'Not named at Grade 5 or Grade 6.',
    'GR.demonstrative': 'Not named at Grade 5 or Grade 6.',
    'GR.indefinite': 'Not named at Grade 5 or Grade 6.',
    'GR.articles-plurals': 'Complex plurals are a Grade 4 outcome; articles are not named.',
    'SE.complete': 'Subject and predicate is a Grade 3 outcome. See appContentPlacement.',
    'SE.fragments': 'Not named at Grade 5 or Grade 6. Grade 6 says a clause "is not always a complete sentence" without naming the fragment.',
    'SE.runons': 'Not named. Grade 6 names the compound sentence without naming the run-on.',
    'PU.list-commas': 'Separating items in a list is a Grade 3 to Grade 4 outcome.',
    'PU.direct-address': 'Not named anywhere in K\u20136.',
    'PU.introductory': 'Following a transition word with a comma is a Grade 4 outcome.',
    'PU.clause-commas': 'A comma for a pause between parts of a sentence is a Grade 3 to Grade 4 outcome.',
    'PU.apostrophes': 'Contractions and possessives are a Grade 3 to Grade 4 outcome.',
    'PU.dialogue': 'Quotation marks for a speaker are a Grade 3 to Grade 4 outcome.',
    'ED.explain': 'Alberta names editing only as "Edit writing for spelling, punctuation, and grammar". Explaining the repair is not a named outcome.',
    'ED.transfer': 'Alberta names editing only as "Edit writing for spelling, punctuation, and grammar". Transferring the repair is not a named outcome.',
  },
  organizingIdeas: [],
};

for (const idea of ideas) {
  const [defaultState, defaultNote] = DEFAULTS[idea.organizingIdea];
  const entry = {
    id: idea.organizingIdea.toLowerCase().replace(/[^a-z]+/g, '-'),
    name: idea.organizingIdea,
    statement: idea.statement,
    sourcePages: idea.pages,
    grades: {},
  };
  for (const [grade, key] of [['Grade 5', 'grade5'], ['Grade 6', 'grade6']]) {
    const over = OVERRIDES[idea.organizingIdea]?.[key] || {};
    entry.grades[key] = {
      grade,
      guidingQuestion: idea[key].guidingQuestion,
      learningOutcome: idea[key].learningOutcome,
      knowledge: idea[key].knowledge,
      understanding: idea[key].understanding,
      skillsAndProcedures: idea[key].skills.map((text, i) => {
        const n = i + 1;
        const [state, skillIds, note] = over[n] || [];
        const fallback = NOT_MEASURABLE_VERBS.test(text)
          ? ['not_measurable', 'Doing, enjoying or discussing; there is nothing for a key to mark.']
          : [defaultState, defaultNote];
        return {
          id: `${entry.id}.${key}.${String(n).padStart(2, '0')}`,
          text,
          coverage: state || fallback[0],
          skillIds: skillIds || [],
          note: note || fallback[1],
        };
      }),
    };
  }
  out.organizingIdeas.push(entry);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2) + '\n');

const all = out.organizingIdeas.flatMap((i) => Object.values(i.grades).flatMap((g) => g.skillsAndProcedures));
const tally = {};
for (const s of all) tally[s.coverage] = (tally[s.coverage] || 0) + 1;
console.log('statements mapped:', all.length, tally);
