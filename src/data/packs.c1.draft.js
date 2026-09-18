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

// --- RC.literal ---------------------------------------------------------------------------------
// Alberta Grade 5: "Examine ideas and information within texts that are explicit and implicit."
// Alberta Grade 6: "Distinguish between information that is stated and inferred."
//
// This is the skill under every other reading skill, and the one a confident reader most often skips:
// telling what the text SAYS from what the reader worked out. Each wrong option here is a sensible
// conclusion — that is the point. A distractor nobody would believe would teach nothing.
const LITERAL_G5 = ['comprehension.grade5.05'];
const LITERAL_G6 = ['comprehension.grade6.11'];
const LITERAL_BOTH = [...LITERAL_G5, ...LITERAL_G6];

const literalRows = [
  example('Read: \u201cNadia set her wet boots by the door and rubbed her hands together.\u201d Now compare two statements. One: Nadia\u2019s boots were wet. Two: It had been raining.', 'The first is stated \u2014 the text says the boots were wet. The second is not in the text at all. It is a sensible guess, but guessing and reading are different jobs, and this lesson is about telling them apart.', 'stated-v-inferred', LITERAL_BOTH),
  example('Read: \u201cThe archive closes at four on Fridays. Priya arrived at ten past four and found the door locked.\u201d Now compare: One, the door was locked. Two, Priya was late.', 'Both are true, but only the first is stated. The second you worked out by putting the closing time beside her arrival time. Stated means the words are there; inferred means you had to reason.', 'stated-v-inferred', LITERAL_BOTH),
  choice('Read: \u201cThe bridge was built in 1908 and repaired twice, in 1954 and in 1997.\u201d Which statement does the text actually say?', 'b', [['a', 'The bridge is unsafe.'], ['b', 'The bridge was repaired in 1954.'], ['c', 'The bridge is the oldest in the town.'], ['d', 'The repairs were expensive.']], 'The text gives the repair year directly. Safety, age compared with other bridges, and cost are never mentioned.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cEvery window in the old print shop faced north, so the light never changed through the day.\u201d Which statement is stated in the text?', 'a', [['a', 'The windows faced north.'], ['b', 'The printers preferred the morning.'], ['c', 'The shop was cold.'], ['d', 'The shop had four windows.']], 'The direction of the windows is given. How many there were, how warm it was, and what the printers preferred are not.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cMarcus checked the register three times before he admitted the name was missing.\u201d Which of these did the text NOT say?', 'c', [['a', 'Marcus checked the register.'], ['b', 'He checked it three times.'], ['c', 'Marcus was embarrassed.'], ['d', 'The name was missing.']], 'The text says what he did and what he found. How he felt about it is never mentioned, however likely it seems.', 'not-stated', LITERAL_G6),
  choice('Read: \u201cThe letter was written in brown ink on paper so thin the words showed through from the other side.\u201d Which statement is stated?', 'd', [['a', 'The letter was old.'], ['b', 'The writer was in a hurry.'], ['c', 'The ink has faded.'], ['d', 'The paper was thin.']], 'The thinness of the paper is stated directly. Age, haste and fading are all guesses the text does not make.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cOnly two of the eleven crates had labels, and both labels were in the same handwriting.\u201d Which statement is stated?', 'a', [['a', 'Two crates had labels.'], ['b', 'The other nine crates were empty.'], ['c', 'One person packed everything.'], ['d', 'The labels were written recently.']], 'The count of labelled crates is given. What was in the other crates, who packed them, and when the labels were written are not.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cThe storm cut the power at eight. The museum\u2019s alarm ran on its own battery and stayed on all night.\u201d Which of these did the text NOT say?', 'b', [['a', 'The power went out at eight.'], ['b', 'The battery had just been replaced.'], ['c', 'The alarm had its own battery.'], ['d', 'The alarm stayed on all night.']], 'Three of these are in the text almost word for word. Whether the battery was new is never mentioned.', 'not-stated', LITERAL_G6),
  choice('Read: \u201cBeavers fell trees by gnawing through the trunk. A single beaver can bring down a tree as thick as your arm in one night.\u201d Which statement is stated?', 'c', [['a', 'Beavers prefer birch trees.'], ['b', 'Beavers work in pairs.'], ['c', 'A beaver can fell an arm-thick tree in one night.'], ['d', 'Beavers damage forests.']], 'The text gives the thickness and the time directly. Preferences, working in pairs, and damage are not mentioned.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cThe train left at six. By seven the platform was empty except for a suitcase nobody claimed.\u201d Which statement is inferred rather than stated?', 'a', [['a', 'The suitcase belonged to a passenger.'], ['b', 'The train left at six.'], ['c', 'The platform was empty by seven.'], ['d', 'A suitcase was left behind.']], 'Three of these are written down. That the suitcase belonged to a passenger is a reasonable conclusion, but the text never says whose it was.', 'stated-v-inferred', LITERAL_G6),
  choice('Read: \u201cThe recipe called for cardamom. Ines searched three shops and came home with cinnamon instead.\u201d Which statement is stated?', 'b', [['a', 'Cardamom is expensive.'], ['b', 'Ines came home with cinnamon.'], ['c', 'Ines was annoyed.'], ['d', 'No shop in town sells cardamom.']], 'What she came home with is stated. Why, how she felt, and what every shop stocks are not in the text.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cLightning is hotter than the surface of the sun. It heats the air so fast that the air explodes outward, and that is the sound we call thunder.\u201d Which statement is stated?', 'd', [['a', 'Lightning is dangerous.'], ['b', 'Thunder comes before lightning.'], ['c', 'Lightning strikes tall objects.'], ['d', 'Thunder is the sound of air exploding outward.']], 'The text explains thunder directly. Danger, the order of the two, and what lightning strikes are not mentioned.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cGrandad kept every ticket stub in a shoebox. When we cleared the house we found four boxes.\u201d Which of these did the text NOT say?', 'a', [['a', 'Grandad went to the cinema often.'], ['b', 'Grandad kept ticket stubs.'], ['c', 'He kept them in a shoebox.'], ['d', 'We found four boxes.']], 'Four boxes of stubs makes the cinema a fair guess, but the text never says what the tickets were for or how often he went.', 'not-stated', LITERAL_G6),
  choice('Read: \u201cThe map showed a road that no longer exists. The council closed it in 1972 when the river changed course.\u201d Which statement is stated?', 'c', [['a', 'The map was drawn before 1972.'], ['b', 'The river flooded the road.'], ['c', 'The council closed the road in 1972.'], ['d', 'The map was wrong when it was made.']], 'The closing and its year are given. That the map came first is a conclusion, and the text says the river changed course rather than flooded.', 'stated-v-inferred', LITERAL_G6),
  choice('Read: \u201cEmperor penguins huddle in groups of several thousand. Birds on the cold outside edge shuffle slowly inward, and the ones who have warmed up take their turn outside.\u201d Which statement is stated?', 'b', [['a', 'Penguins take turns because they are fair.'], ['b', 'Penguins on the outside edge move inward.'], ['c', 'Huddles form only at night.'], ['d', 'The huddle keeps out the wind.']], 'The shuffling inward is described directly. Why they do it, when huddles form, and what the huddle blocks are not in the text.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cThe signature on the second page slants left. Every other page slants right.\u201d Which statement is inferred rather than stated?', 'd', [['a', 'The second page slants left.'], ['b', 'The other pages slant right.'], ['c', 'The slant is not the same on every page.'], ['d', 'Two different people wrote the pages.']], 'The two slants are written down, and the difference between them follows from the words. Who caused the difference is a conclusion the text leaves to you.', 'stated-v-inferred', LITERAL_G6),
  choice('Read: \u201cSalt was once so valuable that Roman soldiers were sometimes paid in it. The word salary comes from the Latin word for salt.\u201d Which statement is stated?', 'a', [['a', 'The word salary comes from the Latin word for salt.'], ['b', 'Roman soldiers were paid only in salt.'], ['c', 'Salt is no longer valuable.'], ['d', 'Romans invented paying wages.']], 'The word origin is given directly. The text says soldiers were sometimes paid in salt, not only, and says nothing about today or about who invented wages.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cTomas read the last page twice, closed the book, and sat without moving for a while.\u201d Which of these did the text NOT say?', 'c', [['a', 'He read the last page twice.'], ['b', 'He closed the book.'], ['c', 'The ending surprised him.'], ['d', 'He sat still afterwards.']], 'The text records only what he did. Why he did it is left to the reader, and this question asks what the words actually say.', 'not-stated', LITERAL_G6),
  choice('Read: \u201cThe port register lists the Abernathy leaving on 3 May with a cargo of paper and ink. A letter in the same file, dated 6 May, complains that no paper has arrived.\u201d A reader says: the paper never reached its buyer. Is that stated or worked out?', 'a', [['a', 'Worked out, by putting the two dates together'], ['b', 'Stated, in the port register'], ['c', 'Stated, in the letter'], ['d', 'Neither \u2014 the text says the opposite']], 'Neither document says the paper failed to reach its buyer. The reader put the sailing on 3 May beside the complaint on 6 May and drew a conclusion. That is working out, not reading.', 'transfer-stated-inferred', LITERAL_BOTH),
  choice('Read: \u201cOnly one key opened the map room, and the archivist carried it on a chain. On Tuesday the room was unlocked when she arrived.\u201d Which statement is stated in the text?', 'b', [['a', 'Someone else had a copy of the key.'], ['b', 'The room was unlocked on Tuesday.'], ['c', 'The archivist forgot to lock it.'], ['d', 'The lock was broken.']], 'The unlocked door is stated. The three explanations for it are conclusions a reader might draw, and the text chooses none of them.', 'transfer-stated-inferred', LITERAL_BOTH),
  choice('Read: \u201cThe kettle was still warm and two cups stood on the table when they came back.\u201d Which of these did the text NOT say?', 'd', [['a', 'The kettle was warm.'], ['b', 'Two cups were on the table.'], ['c', 'They came back.'], ['d', 'Someone had been in the house.']], 'The warm kettle, the cups and their return are all written down. That someone had been there is the conclusion those details point to, but the text never says it.', 'not-stated', LITERAL_G6),
  choice('Read: \u201cAntarctica is a desert. It receives less precipitation each year than parts of the Sahara.\u201d Which statement is stated?', 'c', [['a', 'Antarctica is the driest place on Earth.'], ['b', 'The Sahara is hotter than Antarctica.'], ['c', 'Antarctica gets less precipitation than parts of the Sahara.'], ['d', 'Deserts are always hot.']], 'The comparison with the Sahara is given directly. The text does not rank every place on Earth, compare temperatures, or define a desert by heat.', 'find-stated', LITERAL_G5),
  choice('Read: \u201cThe handwriting in the ledger changes halfway down page nine.\u201d Which statement is inferred rather than stated?', 'a', [['a', 'A second clerk took over the ledger.'], ['b', 'The handwriting changes.'], ['c', 'The change is on page nine.'], ['d', 'The change is halfway down the page.']], 'Where and how the writing changes is stated three ways over. Who caused the change is a conclusion the text leaves to you.', 'stated-v-inferred', LITERAL_G6),
  choice('Read: \u201cThe concert was moved indoors. By the time it began, the sky had cleared.\u201d Which of these did the text NOT say?', 'b', [['a', 'The concert was moved indoors.'], ['b', 'The concert was moved because of rain.'], ['c', 'The sky cleared.'], ['d', 'The sky had cleared before it began.']], 'The move and the clearing sky are both stated. The reason for the move is never given, which is exactly what makes the cleared sky worth noticing.', 'not-stated', LITERAL_G6),
];

// --- RC.inference -------------------------------------------------------------------------------
// Alberta Grade 5: "Make inferences based on content that is implicit in texts."
// Alberta Grade 6: "Infer meanings from texts based on context clues."
//
// Where RC.literal asks the child to stop short of concluding, this one asks them to conclude — and
// to notice which detail is carrying the weight. Every wrong option is defeated by a detail in the
// text rather than by being silly, so the question rewards reading rather than picking the dramatic
// answer.
const INFER_G5 = ['comprehension.grade5.06'];
const INFER_G6 = ['comprehension.grade6.09'];
const INFER_BOTH = [...INFER_G5, ...INFER_G6];

const inferenceRows = [
  example('Read: \u201cDevi pulled her hood up, checked the sky, and put the picnic basket back in the cupboard.\u201d', 'The text never says the weather turned. But checking the sky, pulling up a hood and putting the picnic away all point one way: rain is coming. An inference is a conclusion the details support even though nobody wrote it down.', 'everyday-inference', INFER_G5),
  example('Read: \u201cThe library book was due on the 3rd. Owen returned it on the 17th and left without meeting anyone\u2019s eye.\u201d', 'The dates tell you it was two weeks late, and his behaviour suggests he knew. Neither sentence says he felt awkward, but the two together make it the best supported conclusion. One detail alone would not be enough.', 'combine-details', INFER_G5),
  choice('Read: \u201cMira put on two jumpers before she opened the front door.\u201d What is the most likely reason?', 'c', [['a', 'She was going to bed.'], ['b', 'She had lost her coat.'], ['c', 'It was cold outside.'], ['d', 'She was in a hurry.']], 'Two jumpers before going out points to cold. Nothing in the sentence suggests bedtime, a lost coat, or haste.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe dog met them at the door with its lead in its mouth.\u201d What does the dog most likely want?', 'a', [['a', 'To go for a walk'], ['b', 'To be fed'], ['c', 'To be let out into the garden alone'], ['d', 'To chew the lead']], 'A lead is for walking, and bringing it to the door as they arrive is the clue. Food, the garden and chewing are not supported by anything in the sentence.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cEvery chair in the hall was taken, and people stood along the back wall.\u201d What can you conclude?', 'b', [['a', 'The hall was very small.'], ['b', 'More people came than there were places for.'], ['c', 'The event was free to attend.'], ['d', 'The chairs were uncomfortable.']], 'Full chairs plus people standing means more people than places. The size of the hall, the cost, and the comfort of the chairs are not in the detail given.', 'combine-details', INFER_G5),
  choice('Read: \u201cGrandma put on her glasses, held the letter at arm\u2019s length, and then handed it to me to read aloud.\u201d What can you conclude?', 'd', [['a', 'The letter was addressed to me.'], ['b', 'She disliked what the letter said.'], ['c', 'The letter was in another language.'], ['d', 'She was finding it hard to read.']], 'Glasses, then arm\u2019s length, then handing it over: three steps that all point to difficulty reading it. Who it was addressed to, her feelings and the language are not suggested.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe kitchen smelled of burnt toast and the window was wide open in January.\u201d What most likely happened?', 'a', [['a', 'Something burned and they were clearing the smoke.'], ['b', 'They were airing the room before guests arrived.'], ['c', 'The heating had broken.'], ['d', 'Someone forgot to close the window.']], 'The burnt toast and the open window fit together as cause and response. The other three explain the window but ignore the smell.', 'combine-details', INFER_G6),
  choice('Read: \u201cSam checked the price twice, looked at the shelf, and walked out with an empty basket.\u201d What can you conclude?', 'b', [['a', 'The shop had sold out.'], ['b', 'The item cost more than Sam wanted to pay.'], ['c', 'Sam was in the wrong shop.'], ['d', 'Sam forgot what he came for.']], 'Checking the price twice is the detail carrying the weight: the problem was the price, not the stock, the shop or his memory.', 'combine-details', INFER_G6),
  choice('Read: \u201cThe archivist lifted the page with both hands and laid it on a foam cradle before she turned on the lamp.\u201d What can you conclude about the page?', 'c', [['a', 'It was a copy rather than an original.'], ['b', 'It was too dark to read.'], ['c', 'It was fragile and valuable.'], ['d', 'It was very large.']], 'Two hands, a foam cradle and care with the lamp are all how you handle something fragile. Nothing points to a copy, to darkness or to size.', 'combine-details', INFER_G5),
  choice('Read: \u201cYusuf had run the same route for eleven years. On Thursday he stopped at the corner and could not remember which way to turn.\u201d What does this most likely suggest?', 'a', [['a', 'Something was wrong with him that day.'], ['b', 'The route had been changed.'], ['c', 'He was running somewhere new.'], ['d', 'He had decided to stop running.']], 'Eleven years on one route is what makes forgetting the turn surprising, so the change is in him rather than in the route.', 'combine-details', INFER_G6),
  choice('Read: \u201cThe bus shelter was full of people at half past seven, and empty by twenty to eight.\u201d What most likely happened?', 'd', [['a', 'It started to rain.'], ['b', 'The shelter was closed.'], ['c', 'The people gave up waiting.'], ['d', 'A bus came.']], 'A crowd at a bus shelter that empties in ten minutes points to a bus. Rain would fill a shelter rather than empty it.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe tiles by the back door were darker than the rest, in a rectangle about the size of a rug.\u201d What can you conclude?', 'b', [['a', 'The floor had recently been cleaned.'], ['b', 'A rug used to lie there.'], ['c', 'The tiles had been replaced.'], ['d', 'Someone had spilled water.']], 'A rug-shaped patch that has kept its colour is a shape left behind, because the rest of the floor faded around it. New tiles or a spill would not match a rug so exactly.', 'combine-details', INFER_G6),
  choice('Read: \u201cNobody at the table spoke while the letter was read. Afterwards, Aunt Ruth got up and started washing dishes that were already clean.\u201d What can you conclude?', 'c', [['a', 'The letter was about the dishes.'], ['b', 'Aunt Ruth had not been listening.'], ['c', 'The letter brought difficult news.'], ['d', 'The family disliked whoever sent it.']], 'Silence while it was read, and busywork afterwards, both point to news that was hard to sit with. The text never names the sender or says what the news was.', 'combine-details', INFER_G6),
  choice('Read: \u201cThe path through the woods was worn bare and a metre wide, though the map showed no trail there.\u201d What can you conclude?', 'a', [['a', 'Many people walk that way.'], ['b', 'The path leads to a road.'], ['c', 'The path was made by animals.'], ['d', 'The woods are private land.']], 'Bare ground a metre wide is made by a great many feet. Where the path goes, what made it, and who owns the woods are not in the detail given.', 'combine-details', INFER_G5),
  choice('Read: \u201cEvery book on the shelf was in Portuguese except one: an English dictionary with a cracked spine.\u201d What can you conclude about the shelf\u2019s owner?', 'd', [['a', 'They had never opened the dictionary.'], ['b', 'They were born in Portugal.'], ['c', 'They taught languages for a living.'], ['d', 'They were learning or working in English.']], 'A worn English dictionary among Portuguese books points to using English as a second language. A cracked spine means it was used often, and nothing says where they were born or what they did for work.', 'combine-details', INFER_G6),
  choice('Read: \u201cThe garden had not been watered for weeks, but the tomato plants by the wall were green and heavy with fruit.\u201d What can you conclude?', 'b', [['a', 'Tomato plants do not need water.'], ['b', 'Those plants were getting water from somewhere else.'], ['c', 'The garden had been abandoned.'], ['d', 'Someone had picked the other plants.']], 'Healthy plants in a dry garden must be getting water another way. The other options either contradict what plants need or ignore the healthy tomatoes.', 'combine-details', INFER_G6),
  choice('Read: \u201cAnwar answered the phone, said he would be right there, and left without putting on his shoes.\u201d What can you conclude?', 'c', [['a', 'He had been expecting the call.'], ['b', 'He had forgotten something at work.'], ['c', 'Whatever he heard was urgent.'], ['d', 'He was angry with the caller.']], 'Leaving without shoes is the detail carrying the weight: it points to urgency rather than to expectation or anger.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe bakery\u2019s shutters were down at ten in the morning, and a handwritten card taped to the glass had curled at the corners.\u201d What can you conclude?', 'a', [['a', 'The bakery had been shut for some time.'], ['b', 'The baker was ill that morning.'], ['c', 'The bakery had closed for good.'], ['d', 'The card gave a telephone number.']], 'A card that has curled at the corners has been there a while, which makes this more than one morning. Whether the business has ended for good, and what the card says, are not given.', 'combine-details', INFER_G6),
  choice('Read: \u201cThe letter\u2019s cover names Mr. E. Hall. Inside, the writer thanks \u2018my dear sister\u2019 for the seeds. The port register lists one Eliza Hall sailing that week.\u201d Which conclusion do the three details best support?', 'b', [['a', 'Eliza Hall wrote the letter herself.'], ['b', 'E. Hall is Eliza, and the cover is wrong to say Mr.'], ['c', 'Mr. E. Hall and Eliza Hall are two different people.'], ['d', 'The letter was delivered to the wrong house.']], 'The cover says Mr., the letter addresses a sister, and the register names a woman with the same initial and surname. Together they point to the cover being wrong, not to the letter going astray.', 'transfer-multi-source', INFER_BOTH),
  choice('Read: \u201cA note in the margin reads: paper short, use the thin stock. The last four pages of the book are printed on paper you can see through.\u201d What does the margin note most likely explain?', 'd', [['a', 'Why the book was finished late'], ['b', 'Why the book has few pictures'], ['c', 'Why the note was written in pencil'], ['d', 'Why the final pages are on thinner paper']], 'The note and the thin final pages match each other: running short explains the change of paper. The other options are about things neither detail mentions.', 'transfer-multi-source', INFER_BOTH),
  choice('Read: \u201cRosa took the long way home, past the school, even though it was raining.\u201d What can you conclude?', 'a', [['a', 'She had a reason for wanting to pass the school.'], ['b', 'She enjoyed walking in the rain.'], ['c', 'The short way was closed.'], ['d', 'She had forgotten her umbrella.']], 'Choosing a longer route in the rain suggests the route itself mattered. Nothing says the short way was blocked, and the rain makes enjoyment the harder reading.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe snow in the driveway was smooth except for two lines the width of bicycle tyres.\u201d What can you conclude?', 'c', [['a', 'A car had been parked there overnight.'], ['b', 'Someone had shovelled the driveway.'], ['c', 'A bicycle went along it after the snow fell.'], ['d', 'The snow fell after the bicycle passed.']], 'Tyre lines in otherwise smooth snow mean the bicycle came after the snow. The last option reverses the order the tracks actually show.', 'combine-details', INFER_G6),
  choice('Read: \u201cAt the end of the meeting the chair thanked everyone, then asked Dr. Okafor to stay behind.\u201d What can you conclude?', 'b', [['a', 'Dr. Okafor had done something wrong.'], ['b', 'The chair had something to discuss with her alone.'], ['c', 'Dr. Okafor had arrived late.'], ['d', 'The meeting had run over time.']], 'Asking one person to stay means a separate conversation. Whether the news is good or bad is not suggested either way, so concluding she had done something wrong goes further than the text allows.', 'everyday-inference', INFER_G5),
  choice('Read: \u201cThe tin of biscuits was opened on Monday. By Wednesday only the ones with raisins were left.\u201d What can you conclude?', 'a', [['a', 'Someone in the house does not like raisins.'], ['b', 'The biscuits had gone stale.'], ['c', 'Nobody ate any biscuits.'], ['d', 'The tin was refilled on Tuesday.']], 'Everything except the raisin biscuits went, which points to the raisins being the reason. Staleness, nobody eating, or a refill would not leave that pattern.', 'combine-details', INFER_G6),
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
    'RC.literal',
    'What the Text Says, and What You Worked Out',
    'A text tells you some things directly. Everything else you put together yourself from what it tells you. Both are useful, but they are not the same, and a good reader can always say which one an idea came from.',
    ['Point to the words in the text that say it.', 'If you cannot point to them, you worked it out.', 'Ask what the text would have to say for it to be stated.'],
    literalRows,
  ),
  makePack(
    'RC.inference',
    'Working Out What the Text Does Not Say',
    'Writers leave things for you to conclude. An inference is a conclusion the details support, even though nobody wrote it down. A good inference can point to the detail it rests on; a guess cannot.',
    ['List what the text actually tells you.', 'Ask what those details have in common.', 'Name the detail your conclusion rests on.'],
    inferenceRows,
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
