// C1 packs: the first content built from the Alberta curriculum mapping.
//
// `src/data/curriculum.alberta.elal.json` found that the app measured 9 of the 214 Grade 5/6
// outcomes, all in Conventions, and that 108 more are machine-scorable and absent. The parent chose
// Vocabulary and Comprehension first, on 2026-09-18, because they are the largest of those and
// because reading is what everything later rests on.
//
// STATUS. Every pack here is `draft`. Nothing has been independently challenged, educationally
// reviewed, integrated or pilot-approved, and nothing may be: the C0 lifecycle is
// draft → schema-valid → independently challenged → reviewed → integrated → pilot_approved, and
// skipping a stage because the content looks fine is exactly what that ladder exists to prevent.
// These are proposals the parent reads, the same as a drafted correction.
//
// Each item names the Alberta outcome it measures in `curriculumOutcomeIds`, so a pack cannot drift
// away from the statement it was written for and the coverage report can tell the truth about what
// changed. A test asserts every id resolves to a real outcome in the mapping.
//
// AUTHORING RULES, carried over from the 2026-09-17 audit so this content starts where C0 ended up:
//   - four options, never two or three, unless the answer set is genuinely closed
//   - no option that can be argued for; a defensible distractor makes the question unfair
//   - no option that is nonsense on sight, which turns four options back into two
//   - the explanation names the answer by its words, never by its position, because options shuffle
//   - the prompt never gives the answer away, and no fragment is marked out by its punctuation

import { applyCorrections } from '../learning/contentCorrections.js';
import correctionData from './corrections.c0.json' with { type: 'json' };

const ROLE_SEQUENCE = [
  'worked_example', 'worked_example',
  ...Array(6).fill('guided'),
  ...Array(10).fill('independent'),
  ...Array(2).fill('transfer'),
  ...Array(4).fill('delayed_review'),
];

const choice = (prompt, answer, choices, explanation, transferGroup, outcomeIds) => ({ prompt, acceptedAnswers: [answer], choices, explanation, transferGroup, outcomeIds });
const example = (prompt, explanation, transferGroup, outcomeIds) => ({ prompt, explanation, transferGroup, outcomeIds });

function makePack(skillId, title, rule, helpSteps, rows, options = {}) {
  if (rows.length !== 24) throw new Error(`${skillId} must contain 24 rows`);
  const packId = `c1.pack.${skillId.toLowerCase()}`;
  return {
    id: packId,
    version: 1,
    status: 'draft_needs_independent_challenge',
    batch: 'C1',
    skillId,
    title,
    rule,
    sourceIds: options.sourceIds || ['ab-elal-2022-overview'],
    curriculumOutcomeIds: [...new Set(rows.flatMap((row) => row.outcomeIds || []))],
    items: rows.map((row, index) => {
      const role = ROLE_SEQUENCE[index];
      const displayOnly = role === 'worked_example';
      return {
        packId,
        id: `c1.${skillId.toLowerCase()}.${String(index + 1).padStart(2, '0')}`,
        version: row.version || 1,
        primarySkill: skillId,
        secondarySkills: [],
        role,
        difficulty: index < 8 ? 1 : index < 18 ? 2 : 3,
        prerequisites: [],
        prompt: row.prompt,
        responseType: displayOnly ? 'display' : 'choice',
        evaluator: displayOnly ? 'human_rubric' : 'choice',
        ...(displayOnly ? { rubric: { displayOnly: true } } : { acceptedAnswers: row.acceptedAnswers }),
        ...(row.choices ? { choices: row.choices.map(([id, text]) => ({ id, text })) } : {}),
        explanation: row.explanation,
        helpSteps,
        commonErrors: [],
        evidenceEligibility: ['independent', 'transfer', 'delayed_review'].includes(role) ? `independent_${role}` : 'instruction_only',
        transferGroup: `${skillId.toLowerCase()}-${row.transferGroup || index + 1}`,
        curriculumOutcomeIds: row.outcomeIds || [],
        authorStatus: 'draft',
        reviewStatus: 'needs_independent_challenge',
        integrationStatus: 'not_integrated',
        releaseStatus: 'not_released',
        sourceIds: options.sourceIds || ['ab-elal-2022-overview'],
      };
    }),
  };
}

// --- VO.affixes ---------------------------------------------------------------------------------
// Alberta Grade 5: "Investigate the meaning of bases and affixes in words."
// Alberta Grade 6: "Analyze how adding affixes changes the meaning of words." / "Add affixes to bases
// to build new words." The transfer items give a word the child has never seen, because working out
// an unknown word from its parts is the whole point of the outcome.
const AFFIX_G5 = ['vocabulary.grade5.04'];
const AFFIX_G6 = ['vocabulary.grade6.07', 'vocabulary.grade6.08'];
const AFFIX_BOTH = [...AFFIX_G5, ...AFFIX_G6];

const affixRows = [
  example('Compare “helpful” with “helpless”.', 'Both are built on the base help. The ending -ful means full of, so helpful means full of help. The ending -less means without, so helpless means without help. One base, two endings, two opposite meanings.', 'ful-less', AFFIX_G5),
  example('Compare “agree” with “disagree”.', 'The beginning dis- means not, or the opposite. Adding it to agree turns the meaning around, so disagree means not agree. A beginning like this is called a prefix.', 'dis-opposite', AFFIX_G5),
  choice('What does the prefix in “rewrite” tell you?', 'a', [['a', 'To write it again'], ['b', 'To write it badly'], ['c', 'To write it beforehand'], ['d', 'To stop writing']], 'The prefix re- means again, so rewrite means write it again.', 're-again', AFFIX_G5),
  choice('What does the prefix in “misplace” tell you?', 'b', [['a', 'Placed again'], ['b', 'Placed wrongly'], ['c', 'Placed beforehand'], ['d', 'Placed carefully']], 'The prefix mis- means wrongly or badly, so misplace means put in the wrong place.', 'mis-wrongly', AFFIX_G5),
  choice('What does the suffix in “kindness” do?', 'c', [['a', 'It means without kindness.'], ['b', 'It means full of kindness.'], ['c', 'It names the quality of being kind.'], ['d', 'It means to make someone kind.']], 'The suffix -ness turns a describing word into the name of a quality, so kindness is the quality of being kind.', 'ness-quality', AFFIX_G5),
  choice('Which word means “not able to be seen”?', 'b', [['a', 'revisible'], ['b', 'invisible'], ['c', 'visibleness'], ['d', 'previsible']], 'The prefix in- means not and the ending -ible means able to be. Invisible means not able to be seen.', 'in-not', AFFIX_BOTH),
  choice('Which word means “the act of moving”?', 'a', [['a', 'movement'], ['b', 'moveless'], ['c', 'movable'], ['d', 'remove']], 'The suffix -ment names the act or the result of doing something, so movement is the act of moving. Movable means able to be moved.', 'ment-act', AFFIX_G6),
  choice('Which word means “to fill again”?', 'c', [['a', 'unfill'], ['b', 'misfill'], ['c', 'refill'], ['d', 'prefill']], 'The prefix re- means again, so refill means fill again. Prefill would mean fill beforehand.', 're-again', AFFIX_G6),
  choice('The prefix in “preview” tells you it happens ___.', 'b', [['a', 'again'], ['b', 'before'], ['c', 'wrongly'], ['d', 'without warning']], 'The prefix pre- means before, so a preview is a viewing that happens before the main showing.', 'pre-before', AFFIX_G5),
  choice('Which word means “without hope”?', 'd', [['a', 'hopeful'], ['b', 'hopeness'], ['c', 'unhope'], ['d', 'hopeless']], 'The suffix -less means without, so hopeless means without hope.', 'ful-less', AFFIX_G5),
  choice('Which word means “full of care”?', 'a', [['a', 'careful'], ['b', 'careless'], ['c', 'careness'], ['d', 'uncare']], 'The suffix -ful means full of, so careful means full of care. Careless is its opposite.', 'ful-less', AFFIX_G5),
  choice('You read: “The path was impassable after the flood.” What does impassable mean?', 'c', [['a', 'Able to be passed again'], ['b', 'Passed beforehand'], ['c', 'Not able to be passed'], ['d', 'Passed wrongly']], 'The prefix im- means not and the ending -able means able to be, so impassable means not able to be passed.', 'infer-from-parts', AFFIX_G6),
  choice('The prefix in “disappear” means ___.', 'd', [['a', 'again'], ['b', 'beforehand'], ['c', 'full of'], ['d', 'the opposite']], 'The prefix dis- turns a meaning around. To disappear is the opposite of to appear.', 'dis-opposite', AFFIX_G5),
  choice('Which word means “able to be broken”?', 'b', [['a', 'unbreakable'], ['b', 'breakable'], ['c', 'breakless'], ['d', 'breakment']], 'The suffix -able means able to be, so breakable means able to be broken. Unbreakable means the opposite.', 'able-ableto', AFFIX_G6),
  choice('You read: “She rechecked her answer.” What did she do?', 'a', [['a', 'Checked it again'], ['b', 'Checked it badly'], ['c', 'Forgot to check it'], ['d', 'Checked it before starting']], 'The prefix re- means again, so rechecked means checked again.', 're-again', AFFIX_G5),
  choice('Which word names the quality of being dark?', 'c', [['a', 'darkly'], ['b', 'darken'], ['c', 'darkness'], ['d', 'darkful']], 'The suffix -ness names a quality, so darkness is the quality of being dark. Darken means to make something dark.', 'ness-quality', AFFIX_G6),
  choice('You read: “The instructions were unclear, so he misread them.” What does misread mean?', 'b', [['a', 'Read them again'], ['b', 'Read them wrongly'], ['c', 'Read them aloud'], ['d', 'Refused to read them']], 'The prefix mis- means wrongly, so misread means read wrongly.', 'mis-wrongly', AFFIX_G5),
  choice('Which word means “not possible”?', 'd', [['a', 'repossible'], ['b', 'possibleness'], ['c', 'prepossible'], ['d', 'impossible']], 'The prefix in- becomes im- before a word beginning with p, and it means not. Impossible means not possible.', 'in-not', AFFIX_G6),
  choice('You have never seen the word “unbreathable”. Using its parts, what does it most likely mean?', 'a', [['a', 'Not able to be breathed'], ['b', 'Able to be breathed again'], ['c', 'Breathed beforehand'], ['d', 'Full of breath']], 'The prefix un- means not, breathe is the base, and -able means able to be. Put together: not able to be breathed. You can work out a word you have never met from its parts.', 'transfer-unknown-word', AFFIX_G6),
  choice('You have never seen the word “remeasurement”. Using its parts, what does it most likely mean?', 'c', [['a', 'A measurement that is too small'], ['b', 'Something that cannot be measured'], ['c', 'The act of measuring again'], ['d', 'A measurement made beforehand']], 'The prefix re- means again, measure is the base, and -ment names the act. Put together: the act of measuring again.', 'transfer-unknown-word', AFFIX_G6),
  choice('Which prefix would you add to “lock” to mean the opposite?', 'a', [['a', 'un-'], ['b', 're-'], ['c', 'pre-'], ['d', 'mis-']], 'The prefix un- turns a meaning around, so unlock is the opposite of lock. Relock would mean lock it again.', 'dis-opposite', AFFIX_G6),
  choice('Which word means “without a sound”?', 'b', [['a', 'soundful'], ['b', 'soundless'], ['c', 'resound'], ['d', 'soundness']], 'The suffix -less means without, so soundless means without a sound. Resound means to echo.', 'ful-less', AFFIX_G5),
  choice('You read: “The map was unreadable.” What does that tell you?', 'd', [['a', 'It had been read again'], ['b', 'It was read wrongly'], ['c', 'It was easy to read'], ['d', 'It could not be read']], 'The prefix un- means not and the ending -able means able to be, so unreadable means not able to be read.', 'infer-from-parts', AFFIX_G6),
  choice('Which word names the act of paying?', 'a', [['a', 'payment'], ['b', 'payable'], ['c', 'payless'], ['d', 'repay']], 'The suffix -ment names the act or the result, so payment is the act of paying. Payable means able to be paid.', 'ment-act', AFFIX_G6),
];

// --- VO.context ---------------------------------------------------------------------------------
// Alberta Grade 5: "Discuss how context can influence the meaning of words and phrases."
// Alberta Grade 6: "Analyze word parts and cross-check with context clues to determine the meaning of
// unknown words." Each question gives a real sentence and asks what the unfamiliar word means in it,
// so the skill being measured is reading the clue rather than already knowing the word.
const CONTEXT_G5 = ['vocabulary.grade5.12'];
const CONTEXT_G6 = ['vocabulary.grade6.10'];
const CONTEXT_BOTH = [...CONTEXT_G5, ...CONTEXT_G6];

const contextRows = [
  example('Compare “The path was arduous.” with “The path was arduous — steep, rocky, and long enough to tire anyone.”', 'The first sentence gives you nothing to work with. The second explains arduous straight after it, so you can tell it means hard and tiring. A dash or a comma often introduces the explanation.', 'definition-clue', CONTEXT_G5),
  example('Look at: “Most of the crew were despondent, but Ravi stayed cheerful.”', 'The word but signals a contrast. If Ravi stayed cheerful and the others were the opposite, despondent must mean low-spirited. Words like but, unlike, although and rather than point you to an opposite.', 'contrast-clue', CONTEXT_G5),
  choice('“The archivist handled the brittle page carefully; it cracked at the lightest touch.” What does brittle mean?', 'b', [['a', 'Very old'], ['b', 'Easily broken'], ['c', 'Brightly coloured'], ['d', 'Hard to read']], 'The sentence says it cracked at the lightest touch, which tells you brittle means easily broken. The page may well be old, but the sentence does not say so.', 'definition-clue', CONTEXT_G5),
  choice('“Unlike her talkative brother, Mei was reticent at the meeting.” What does reticent mean?', 'c', [['a', 'Loud and confident'], ['b', 'Angry'], ['c', 'Quiet and holding back'], ['d', 'Late arriving']], 'Unlike signals a contrast with talkative, so reticent means the opposite of talkative: quiet.', 'contrast-clue', CONTEXT_G5),
  choice('“The soil was arid — dry, cracked, and empty of plants.” What does arid mean?', 'a', [['a', 'Very dry'], ['b', 'Very rich'], ['c', 'Very cold'], ['d', 'Very deep']], 'The dash introduces the explanation: dry, cracked and empty of plants.', 'definition-clue', CONTEXT_G5),
  choice('“He was famished after the long hike and ate three helpings.” What does famished mean?', 'd', [['a', 'Very pleased'], ['b', 'Very slow'], ['c', 'Very tired'], ['d', 'Very hungry']], 'Eating three helpings is the clue. He was probably tired too, but the sentence explains the eating, not the resting.', 'sense-clue', CONTEXT_G5),
  choice('“Lions, tigers, and other predators hunt for their food.” What does predators mean?', 'b', [['a', 'Animals that eat plants'], ['b', 'Animals that hunt other animals'], ['c', 'Animals kept as pets'], ['d', 'Animals that live in groups']], 'The examples lions and tigers, together with hunt for their food, point to animals that hunt other animals.', 'example-clue', CONTEXT_G5),
  choice('“The instructions were ambiguous, so half the class did one thing and half did another.” What does ambiguous mean?', 'c', [['a', 'Written in very small print'], ['b', 'Much too long'], ['c', 'Able to be understood in more than one way'], ['d', 'Perfectly clear']], 'If half the class understood it one way and half the other way, the instructions could be read in more than one way.', 'sense-clue', CONTEXT_G6),
  choice('“The room fell silent when the ancient clock chimed; its tone was resonant and filled every corner.” What does resonant mean?', 'a', [['a', 'Deep and echoing'], ['b', 'Short and sharp'], ['c', 'Almost silent'], ['d', 'Out of tune']], 'Filled every corner tells you the sound carried and echoed.', 'definition-clue', CONTEXT_G5),
  choice('“Rather than being scarce, water was abundant that spring.” What does abundant mean?', 'c', [['a', 'Hard to find'], ['b', 'Frozen over'], ['c', 'Plentiful'], ['d', 'Not fit to drink']], 'Rather than signals a contrast with scarce, so abundant means the opposite of scarce: plentiful.', 'contrast-clue', CONTEXT_G5),
  choice('“The detective was meticulous: she labelled every item and checked each label twice.” What does meticulous mean?', 'b', [['a', 'Very quick'], ['b', 'Very careful about details'], ['c', 'Easily annoyed'], ['d', 'New to the job']], 'The colon introduces the explanation: labelling every item and checking each label twice.', 'definition-clue', CONTEXT_G6),
  choice('“Maples, birches, and other deciduous trees lose their leaves each autumn.” What does deciduous mean?', 'd', [['a', 'Growing very tall'], ['b', 'Staying green all year'], ['c', 'Producing fruit'], ['d', 'Losing its leaves each year']], 'The sentence names examples and then says what they do: lose their leaves each autumn.', 'example-clue', CONTEXT_G5),
  choice('“The crowd was jubilant when the team scored, cheering and hugging strangers.” What does jubilant mean?', 'a', [['a', 'Full of joy'], ['b', 'Quietly worried'], ['c', 'Bored'], ['d', 'Confused']], 'Cheering and hugging strangers shows joy.', 'sense-clue', CONTEXT_G5),
  choice('“He spoke in a candid way, telling the truth even when it was awkward.” What does candid mean?', 'c', [['a', 'Polite but vague'], ['b', 'Very quiet'], ['c', 'Honest and direct'], ['d', 'Angry']], 'Telling the truth even when it was awkward explains candid.', 'definition-clue', CONTEXT_G6),
  choice('“The first plan was feasible, but the second needed money nobody had.” What does feasible mean?', 'b', [['a', 'Very expensive'], ['b', 'Able to be done'], ['c', 'Written down'], ['d', 'Popular with everyone']], 'But contrasts it with a plan that needed money nobody had, so feasible means able to be done.', 'contrast-clue', CONTEXT_G6),
  choice('“She was tenacious and kept trying long after the others had given up.” What does tenacious mean?', 'd', [['a', 'Very fast'], ['b', 'Very strong'], ['c', 'Easily bored'], ['d', 'Not giving up']], 'Kept trying long after the others had given up explains tenacious.', 'definition-clue', CONTEXT_G5),
  choice('“The museum’s collection was eclectic: masks, motorcycles, medieval coins, and a stuffed moose.” What does eclectic mean?', 'a', [['a', 'Made up of many different kinds'], ['b', 'Very valuable'], ['c', 'Very old'], ['d', 'Badly looked after']], 'The list mixes wildly different things, which is what eclectic means.', 'example-clue', CONTEXT_G6),
  choice('“Although the evidence seemed damning, the judge remained impartial.” What does impartial mean?', 'c', [['a', 'Certain of guilt'], ['b', 'Easily upset'], ['c', 'Not taking either side'], ['d', 'Slow to decide']], 'Although signals a contrast: even with the evidence pointing one way, the judge did not take a side.', 'contrast-clue', CONTEXT_G6),
  choice('“The archivist called the ink fugitive: it fades in sunlight and vanishes within a year.” Fugitive usually means a person running from the law. What does it mean here?', 'b', [['a', 'Stolen from another archive'], ['b', 'Fading and not lasting'], ['c', 'Written in a hurry'], ['d', 'Hidden under another layer']], 'A word can carry a different meaning in a new subject. The sentence explains this one: it fades in sunlight and vanishes.', 'transfer-new-sense', CONTEXT_BOTH),
  choice('“The bridge had a slender span, yet it bore the weight of a loaded truck.” What does bore mean here?', 'd', [['a', 'Drilled a hole through'], ['b', 'Was uninteresting'], ['c', 'Was carried across'], ['d', 'Carried']], 'Bore has several meanings. The weight of a loaded truck tells you this one means carried.', 'transfer-new-sense', CONTEXT_BOTH),
  choice('“The path was precarious — one wrong step and you would slide.” What does precarious mean?', 'a', [['a', 'Unsafe and easy to slip on'], ['b', 'Wide and flat'], ['c', 'Well lit'], ['d', 'Often used']], 'The dash introduces the explanation: one wrong step and you would slide.', 'definition-clue', CONTEXT_G5),
  choice('“Unlike the noisy market, the library was tranquil.” What does tranquil mean?', 'c', [['a', 'Crowded'], ['b', 'Brightly lit'], ['c', 'Calm and quiet'], ['d', 'Expensive to enter']], 'Unlike signals a contrast with noisy, so tranquil means the opposite: calm and quiet.', 'contrast-clue', CONTEXT_G5),
  choice('“Beavers, termites, and other industrious builders never seem to rest.” What does industrious mean?', 'b', [['a', 'Living near water'], ['b', 'Hard-working'], ['c', 'Very large'], ['d', 'Dangerous to people']], 'The examples are builders who never seem to rest, which is what industrious means.', 'example-clue', CONTEXT_G5),
  choice('“His account of the fire was inconsistent: the times he gave kept changing.” What does inconsistent mean?', 'd', [['a', 'Very detailed'], ['b', 'Written by someone else'], ['c', 'Completely true'], ['d', 'Not agreeing with itself']], 'The times he gave kept changing, so the account did not agree with itself.', 'sense-clue', CONTEXT_G6),
];

const rawC1Packs = [
  makePack(
    'VO.affixes',
    'Word Parts: Prefixes and Suffixes',
    'A base is the main part of a word. A prefix goes in front of it and a suffix goes after it, and each one changes the meaning in a way you can predict. Knowing the parts lets you work out a word you have never seen.',
    ['Find the base word inside the longer word.', 'Name the part in front of it, and the part after it.', 'Say what each part means, then put the meanings together.'],
    affixRows,
  ),
  makePack(
    'VO.context',
    'Working Out a Word from the Sentence',
    'When you meet a word you do not know, the words around it usually tell you what it means. Look for an explanation right after it, a contrast word such as but or unlike, a list of examples, or the general sense of what is happening.',
    ['Read the whole sentence, not only the word.', 'Look for an explanation, a contrast word, or examples.', 'Say the meaning in your own words, then check it fits the sentence.'],
    contextRows,
  ),
];

// Corrections apply to C1 exactly as they do to C0: an open defect withholds its item. No C1
// correction exists yet, but wiring it now means the first one does not need a code change.
export const c1Packs = rawC1Packs.map((pack) => ({
  ...pack,
  items: applyCorrections(pack.items, correctionData.corrections),
}));
export const c1Items = c1Packs.flatMap((pack) => pack.items);
