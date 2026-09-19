// Where Alberta puts each of this app's skills, grade by grade.
//
// This is the one hand-authored file in the ladder, and it is deliberately small: every entry is a
// list of outcome ids, never a sentence of prose about a grade. `tools/build_ladder.mjs` resolves
// each id against `curriculum.k6.json` and fails if one does not exist, so a rung cannot claim a
// grade that the curriculum does not actually state. The quotable evidence in the built ladder is
// Alberta's own wording, pulled through that resolution — nothing here is typed from memory.
//
// `introducedBy` is the earliest grade whose outcomes name the skill. `consolidatedBy` is the last
// K–6 grade that still names it specifically; for a skill Alberta keeps restating in general terms
// (capitalisation, spelling patterns) that is Grade 6, and for one it finishes with (apostrophes,
// phonics) it is earlier — which is the whole point of showing it to a child.
//
// NOTHING HERE IS VERIFIED. `mappingReviewedBy` in the built file is null and stays null until the
// parent reads it. A rung is a reading of the curriculum, and a reading can be wrong.

export const skillRungs = {
  // ——— Spelling ———
  'SP.patterns': {
    introducedBy: ['conventions.grade1.09', 'conventions.grade1.10'],
    consolidatedBy: ['conventions.grade5.12', 'conventions.grade5.13', 'conventions.grade6.08'],
    note: 'Alberta restates spelling patterns at every grade from 1 to 6; the wording moves from "recognize" to "apply".',
  },
  'SP.inflections': {
    introducedBy: ['vocabulary.grade1.09', 'vocabulary.grade1.10'],
    consolidatedBy: ['conventions.grade3.28', 'conventions.grade3.32', 'conventions.grade3.33'],
    alsoAt: ['conventions.grade4.22', 'conventions.grade5.14', 'conventions.grade6.09'],
    note: 'Named as its own outcome last at Grade 3 ("Recognize basic guidelines for adding inflectional endings"); after that it is folded into affix spelling.',
  },
  'SP.wordparts': {
    introducedBy: ['vocabulary.grade1.07', 'vocabulary.grade1.08'],
    consolidatedBy: ['conventions.grade5.14', 'conventions.grade6.09'],
    alsoAt: ['conventions.grade3.22', 'conventions.grade4.16', 'vocabulary.grade4.09'],
  },
  'SP.confusables': {
    introducedBy: ['vocabulary.grade2.07'],
    consolidatedBy: ['conventions.grade4.18'],
    note: 'Alberta names homophone spelling last at Grade 4. Grade 5 and Grade 6 say only that spelling patterns and affix knowledge are applied, so a Grade 5 child meeting this is revisiting Grade 4 work.',
  },

  // ——— Phonics and phonological awareness ———
  // Three of the nine organizing ideas stop before Grade 6: Phonological Awareness after Grade 2,
  // Phonics after Grade 3, Fluency after Grade 4. Everything below therefore consolidates early. That
  // is not a reason to withhold it from a Grade 5 child who needs it — it is the reason to say so.
  'PH.blend-segment': {
    introducedBy: ['phonological-awareness.kindergarten.16'],
    consolidatedBy: ['phonological-awareness.grade2.01', 'phonological-awareness.grade2.04', 'phonological-awareness.grade2.05'],
  },
  'PH.vowels': {
    introducedBy: ['phonics.grade1.07', 'phonics.grade1.10', 'phonics.grade1.11'],
    consolidatedBy: ['phonics.grade3.04'],
    alsoAt: ['phonics.grade2.04', 'phonics.grade2.05', 'phonics.grade1.12'],
  },
  'PH.digraphs-clusters': {
    introducedBy: ['phonics.grade1.09'],
    consolidatedBy: ['phonics.grade3.01', 'phonics.grade3.02'],
    alsoAt: ['phonics.grade2.03', 'phonological-awareness.grade2.03'],
  },
  'PH.syllables': {
    introducedBy: ['phonological-awareness.kindergarten.11', 'phonological-awareness.kindergarten.14'],
    consolidatedBy: ['vocabulary.grade3.11', 'phonics.grade3.04'],
  },
  'PH.multisyllable': {
    introducedBy: ['phonological-awareness.grade1.06'],
    consolidatedBy: ['phonics.grade3.04', 'phonics.grade3.05'],
    alsoAt: ['comprehension.grade2.06'],
  },

  // ——— Grammar ———
  'GR.subject-object-pronouns': {
    introducedBy: ['conventions.grade2.08', 'conventions.grade2.11'],
    consolidatedBy: ['conventions.grade5.06', 'conventions.grade5.07'],
    alsoAt: ['conventions.grade3.09', 'conventions.grade3.10', 'conventions.grade4.08', 'conventions.grade4.09'],
  },
  'GR.antecedents': {
    introducedBy: ['conventions.grade5.08'],
    consolidatedBy: ['conventions.grade5.08'],
    note: 'Noun-pronoun agreement appears for the first time at Grade 5. This one is exactly at grade.',
  },
  'GR.agreement': {
    introducedBy: ['conventions.grade2.12'],
    consolidatedBy: ['conventions.grade6.05'],
    alsoAt: ['conventions.grade3.14', 'conventions.grade4.13', 'conventions.grade5.05'],
  },
  'GR.tense': {
    introducedBy: ['vocabulary.grade1.10'],
    consolidatedBy: ['conventions.grade6.04'],
    alsoAt: ['conventions.grade4.07', 'conventions.grade5.04'],
  },
  'GR.articles-plurals': {
    introducedBy: ['conventions.grade3.19'],
    consolidatedBy: ['conventions.grade4.21'],
    alsoAt: ['conventions.grade3.31'],
    note: 'Plurals are named; articles are not named as an outcome at any K–6 grade. The rung is the plural half only.',
  },
  'GR.possessives': {
    introducedBy: ['conventions.grade3.15', 'conventions.grade3.20', 'conventions.grade3.21'],
    consolidatedBy: ['conventions.grade4.05', 'conventions.grade4.10'],
    alsoAt: ['conventions.grade3.30', 'conventions.grade4.21'],
  },
  // Alberta names the category, not the five types. Grade 5 Conventions says "Distinguish between
  // different types of pronouns used in a sentence" and lists none, so each of these five sits under
  // one outcome and none of them has an outcome of its own. See `disputedByLadder` below.
  'GR.reflexives': { introducedBy: ['conventions.grade5.11'], consolidatedBy: ['conventions.grade5.11'], note: 'Alberta names the class of pronoun types at Grade 5 without listing which types.' },
  'GR.relative': { introducedBy: ['conventions.grade5.11'], consolidatedBy: ['conventions.grade5.11'], note: 'Alberta names the class of pronoun types at Grade 5 without listing which types.' },
  'GR.interrogative': { introducedBy: ['conventions.grade5.11'], consolidatedBy: ['conventions.grade5.11'], note: 'Alberta names the class of pronoun types at Grade 5 without listing which types.' },
  'GR.demonstrative': { introducedBy: ['conventions.grade5.11'], consolidatedBy: ['conventions.grade5.11'], note: 'Alberta names the class of pronoun types at Grade 5 without listing which types.' },
  'GR.indefinite': { introducedBy: ['conventions.grade5.11'], consolidatedBy: ['conventions.grade5.11'], note: 'Alberta names the class of pronoun types at Grade 5 without listing which types.' },

  // ——— Sentences ———
  'SE.complete': {
    introducedBy: ['conventions.kindergarten.04'],
    consolidatedBy: ['conventions.grade3.09', 'conventions.grade3.10'],
    alsoAt: ['conventions.grade1.06', 'conventions.grade2.07', 'conventions.grade2.11'],
    note: 'Subject and predicate are named as outcomes for the last time at Grade 3. A Grade 5 child doing this pack is revisiting.',
  },
  'SE.fragments': {
    introducedBy: ['conventions.grade3.09', 'conventions.grade3.10'],
    consolidatedBy: ['conventions.grade6.06'],
    note: 'Alberta never uses the word "fragment". Identifying the subject and the predicate is the outcome that makes a fragment visible, and clause work at Grade 6 is where it is finally settled.',
  },
  'SE.clauses': {
    introducedBy: ['conventions.grade6.06'],
    consolidatedBy: ['conventions.grade6.06'],
    note: 'Independent and dependent clauses appear for the first time at Grade 6. A Grade 5 child meeting this is working ahead.',
  },
  'SE.runons': {
    introducedBy: ['conventions.grade6.07'],
    consolidatedBy: ['conventions.grade6.07'],
    note: 'Alberta never uses the phrase "run-on". Telling a simple sentence from a compound one at Grade 6 is the nearest stated outcome.',
  },
  'SE.combining': {
    introducedBy: ['conventions.grade3.11'],
    consolidatedBy: ['conventions.grade6.07'],
    alsoAt: ['conventions.grade4.12', 'conventions.grade5.10'],
  },

  // ——— Punctuation ———
  'PU.capitals-endmarks': {
    introducedBy: ['conventions.kindergarten.01', 'conventions.kindergarten.02', 'conventions.kindergarten.03'],
    consolidatedBy: ['conventions.grade4.01', 'conventions.grade4.02'],
    alsoAt: ['conventions.grade1.02', 'conventions.grade1.05', 'conventions.grade2.01', 'conventions.grade2.05', 'conventions.grade3.01', 'conventions.grade3.02'],
    note: 'Grade 5 and Grade 6 restate this only in the general form "Apply capitalization/punctuation to support effective written communication". The specific rules are finished by Grade 4.',
  },
  'PU.list-commas': {
    introducedBy: ['conventions.grade3.03'],
    consolidatedBy: ['conventions.grade4.03'],
  },
  'PU.clause-commas': {
    introducedBy: ['conventions.grade3.03'],
    consolidatedBy: ['conventions.grade4.03'],
    note: 'Alberta says "a pause between parts of sentences" rather than naming clauses, and does so at Grade 3 and Grade 4 only.',
  },
  'PU.introductory': {
    introducedBy: ['conventions.grade4.03'],
    consolidatedBy: ['conventions.grade4.03'],
    note: 'The comma after a transition word is named at Grade 4 and nowhere else.',
  },
  'PU.apostrophes': {
    introducedBy: ['conventions.grade2.06'],
    consolidatedBy: ['conventions.grade4.05'],
    alsoAt: ['conventions.grade3.06', 'conventions.grade3.07', 'conventions.grade3.20', 'conventions.grade3.21', 'conventions.grade3.30', 'conventions.grade4.21'],
  },
  'PU.dialogue': {
    introducedBy: ['conventions.grade3.04'],
    consolidatedBy: ['conventions.grade4.04'],
    alsoAt: ['conventions.grade3.05'],
  },

  // ——— Editing ———
  'ED.locate': {
    introducedBy: ['writing.grade1.06'],
    consolidatedBy: ['writing.grade6.10'],
    alsoAt: ['writing.grade2.06', 'writing.grade3.08', 'writing.grade4.10', 'writing.grade5.08'],
  },
  'ED.repair': {
    introducedBy: ['writing.grade1.06'],
    consolidatedBy: ['writing.grade6.09', 'writing.grade6.10'],
    alsoAt: ['writing.grade3.07', 'writing.grade4.09', 'writing.grade5.07'],
  },

  // ——— Vocabulary ———
  'VO.affixes': {
    introducedBy: ['vocabulary.grade1.07', 'vocabulary.grade1.08'],
    consolidatedBy: ['vocabulary.grade6.07', 'vocabulary.grade6.08'],
    alsoAt: ['vocabulary.grade2.14', 'vocabulary.grade3.07', 'vocabulary.grade4.10', 'vocabulary.grade5.04'],
  },
  'VO.roots': {
    introducedBy: ['vocabulary.grade4.12'],
    consolidatedBy: ['vocabulary.grade6.03'],
    alsoAt: ['vocabulary.grade5.01'],
  },
  'VO.context': {
    introducedBy: ['vocabulary.grade5.12'],
    consolidatedBy: ['vocabulary.grade6.10'],
    alsoAt: ['comprehension.grade6.09'],
    note: 'Using context to work out a word is named for the first time at Grade 5. This one is exactly at grade.',
  },
  'VO.figurative': {
    introducedBy: ['vocabulary.grade3.05'],
    consolidatedBy: ['vocabulary.grade6.12', 'vocabulary.grade6.13'],
    alsoAt: ['vocabulary.grade4.08', 'vocabulary.grade5.13', 'vocabulary.grade5.14'],
  },

  // ——— Reading comprehension ———
  'RC.literal': {
    introducedBy: ['comprehension.grade1.19'],
    consolidatedBy: ['comprehension.grade6.11'],
    alsoAt: ['comprehension.grade2.16', 'comprehension.grade5.05'],
  },
  'RC.inference': {
    introducedBy: ['comprehension.grade3.09'],
    consolidatedBy: ['comprehension.grade6.10', 'comprehension.grade6.11'],
    alsoAt: ['comprehension.grade4.09', 'comprehension.grade4.11', 'comprehension.grade5.06'],
  },
  'RC.main-idea': {
    introducedBy: ['comprehension.grade1.09'],
    consolidatedBy: ['comprehension.grade6.04'],
    alsoAt: ['comprehension.grade2.08', 'comprehension.grade3.11', 'comprehension.grade4.12', 'comprehension.grade5.04'],
  },
  'RC.perspective': {
    introducedBy: ['comprehension.grade5.10'],
    consolidatedBy: ['comprehension.grade6.15'],
    alsoAt: ['comprehension.grade5.13', 'comprehension.grade6.13', 'comprehension.grade6.14'],
    note: 'Perspective is a Grade 5 and Grade 6 idea. Nothing below Grade 5 names it.',
  },
};

// Skills this app teaches that Alberta's English Language Arts and Literature curriculum does not
// place at any grade, K–6. They stay in the app — the parent asked for them explicitly — and the
// honest thing is to say they are not on the ladder rather than to invent a grade for them.
export const noCurriculumBasis = {
  'SP.dictation': 'Dictation is a way of asking a question, not a skill Alberta names.',
  'PR.discrimination': 'ELAL has no pronunciation organizing idea at any grade, K–6. These five skills came from the English-as-a-second-language benchmarks.',
  'PR.target-sounds': 'ELAL has no pronunciation organizing idea at any grade, K–6. These five skills came from the English-as-a-second-language benchmarks.',
  'PR.endings': 'ELAL has no pronunciation organizing idea at any grade, K–6. These five skills came from the English-as-a-second-language benchmarks.',
  'PR.word-stress': 'ELAL has no pronunciation organizing idea at any grade, K–6. These five skills came from the English-as-a-second-language benchmarks.',
  'PR.sentence-reading': 'ELAL has no pronunciation organizing idea at any grade, K–6. These five skills came from the English-as-a-second-language benchmarks.',
  'PU.direct-address': 'Alberta names list commas, clause commas and the comma after a transition word, but never the comma before or after a name being addressed.',
  'ED.explain': 'Saying why an error is an error is a way of asking a question. Alberta names editing, not explaining.',
  'ED.transfer': 'Applying a repaired rule to a fresh sentence is a property of how this app asks, not an outcome.',
};

// Where this reading of the curriculum contradicts something already written down. Recorded rather
// than quietly applied: the earlier file was read by a person, this ladder was not.
export const disputedByLadder = [
  {
    claimIn: 'src/data/curriculum.alberta.elal.json → skillsWithNoGrade56Outcome',
    claim: 'PH.blend-segment, PH.vowels, PH.digraphs-clusters, PH.syllables and PH.multisyllable have no Grade 5/6 outcome because "Alberta ends the Phonics organizing idea after Grade 4".',
    ladderFinds: 'Alberta ends Phonics after Grade 3, not Grade 4. Page 33 heads the Grade 3/Grade 4 spread but prints one set of columns, and the Grade 4 half of that table does not exist. Phonological Awareness ends after Grade 2 and Fluency after Grade 4.',
    effect: 'The conclusion (no Grade 5/6 outcome) is unchanged. The stated reason is off by one grade.',
  },
  {
    claimIn: 'src/data/curriculum.alberta.elal.json → skillsWithNoGrade56Outcome',
    claim: 'GR.reflexives, GR.relative, GR.interrogative, GR.demonstrative and GR.indefinite have no Grade 5/6 outcome.',
    ladderFinds: 'Grade 5 Conventions states "Distinguish between different types of pronouns used in a sentence" (conventions.grade5.11). It names the class without listing which types, so all five sit under one outcome — which is not the same as having none.',
    effect: 'Whether one outcome naming no types is evidence for five separate skills is a judgement for the parent. The ladder places them at Grade 5 and flags it here rather than deciding quietly.',
  },
];
