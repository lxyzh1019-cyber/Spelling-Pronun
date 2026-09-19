// Foundation packs: phonics (自然拼读) and word stress.
//
// WHAT THESE ARE NOT. Alberta ends the Phonological Awareness organizing idea after Grade 2 and the
// Phonics and Fluency organizing ideas after Grade 4. There is no phonics outcome at Grade 5 or
// Grade 6, and English Language Arts has no pronunciation organizing idea at any grade. So nothing
// here may be described as Alberta Grade 5/6 curriculum, and no item carries a Grade 5/6outcome id.
// `albertaPlacement` on each pack says which grades Alberta actually puts this at, and a test
// enforces that these packs never claim a Grade 5/6 outcome.
//
// WHY THEY EXIST ANYWAY. The parent asked for them on 2026-09-18, after being told the above, on the
// ground that their children are behind on exactly this and need it whatever grade it is labelled.
// That is a parent's judgement about their own children and it outranks a curriculum's grade
// placement as a reason to teach something. Being behind on a Grade 3 skill in Grade 5 is the normal
// case for needing it more, not less.
//
// PRINT-BASED ON PURPOSE. Every question here is answered by looking, not by listening. That is not a
// compromise — it is what makes the packs usable at all. Audio needs a human to listen to it before
// it can be trusted, which is the gate the assessment's Part A prompts have been stuck behind since
// 2026-09-08. A phonics pack that needed reviewed recordings would join them.
//
// Word stress is the one pronunciation skill that survives that constraint: which syllable is loudest
// in `photograph` can be asked and answered in print. The rest of the PR.* skills cannot, and this
// file does not pretend otherwise.

import { makePack as buildPack } from './packBuilder.js';
import { applyCorrections } from '../learning/contentCorrections.js';
import correctionData from './corrections.c0.json' with { type: 'json' };


const choice = (prompt, answer, choices, explanation, transferGroup) => ({ prompt, acceptedAnswers: [answer], choices, explanation, transferGroup });
const example = (prompt, explanation, transferGroup) => ({ prompt, explanation, transferGroup });

function makePack(skillId, title, rule, helpSteps, rows, albertaPlacement) {
  return buildPack({ prefix: 'f1', batch: 'F1', skillId, title, rule, helpSteps, rows, albertaPlacement });
}

// --- PH.vowels ----------------------------------------------------------------------------------
const vowelRows = [
  example('Compare “cap” with “cape”.', 'In cap the vowel is short: you hear the a of hat. Adding a silent e at the end makes the a say its own name, so it becomes cape. The e is never spoken, but it changes the vowel in front of it.', 'silent-e'),
  example('Compare “rain”, “ray” and “rate”.', 'All three carry the long a sound, spelled three different ways: ai in the middle of a word, ay at the end, and a with a silent e after one consonant. English often spells one sound several ways, and where the sound sits in the word usually decides which spelling is used.', 'long-a-spellings'),
  choice('Which word has a short vowel sound?', 'b', [['a', 'hope'], ['b', 'hop'], ['c', 'hoop'], ['d', 'hoe']], 'Hop has one vowel with a consonant after it and no silent e, so the o is short. The other three say the long o or the oo sound.', 'short-v-long'),
  choice('What does the silent e do in “tube”?', 'a', [['a', 'It makes the u say its own name.'], ['b', 'It adds a syllable.'], ['c', 'It makes the b silent.'], ['d', 'It shortens the u.']], 'A silent e at the end reaches back over one consonant and makes the vowel long, so tub becomes tube.', 'silent-e'),
  choice('Which word has the same vowel sound as “boat”?', 'c', [['a', 'bought'], ['b', 'about'], ['c', 'grow'], ['d', 'book']], 'Boat and grow both say long o, spelled oa and ow. Bought, about and book each say a different sound.', 'vowel-teams'),
  choice('In “bird”, “her” and “turn”, which letter changes the vowel sound?', 'd', [['a', 'd'], ['b', 'n'], ['c', 'the silent e'], ['d', 'r']], 'When r follows a vowel it changes the sound, so ir, er and ur all say the same thing here. This is called an r-controlled vowel.', 'r-controlled'),
  choice('Which word does NOT have a long vowel sound?', 'a', [['a', 'sock'], ['b', 'soak'], ['c', 'soap'], ['d', 'sole']], 'Sock has a short o. Soak and soap use the oa team, and sole has a silent e, so those three all say long o.', 'short-v-long'),
  choice('Which pair of words share the same vowel sound?', 'b', [['a', '“tree” and “bread”'], ['b', '“tree” and “beach”'], ['c', '“tree” and “great”'], ['d', '“tree” and “bear”']], 'Tree and beach both say long e, spelled ee and ea. Bread, great and bear use ea or ear for three different sounds.', 'vowel-teams'),
  choice('Which word has a short vowel sound?', 'c', [['a', 'plane'], ['b', 'plain'], ['c', 'plan'], ['d', 'plate']], 'Plan has one vowel followed by a consonant and no silent e, so the a is short. The other three all say long a.', 'short-v-long'),
  choice('What happens to “hat” when you add a silent e?', 'd', [['a', 'The a stays short.'], ['b', 'The t becomes silent.'], ['c', 'It gains a syllable.'], ['d', 'The a becomes long: hate.']], 'The silent e reaches over the t and makes the a say its own name.', 'silent-e'),
  choice('Which word has an r-controlled vowel?', 'a', [['a', 'farm'], ['b', 'fame'], ['c', 'foam'], ['d', 'fan']], 'In farm the r follows the a and changes its sound. The others have a long a, a long o and a short a.', 'r-controlled'),
  choice('Which word has the same vowel sound as “moon”?', 'b', [['a', 'book'], ['b', 'blue'], ['c', 'bone'], ['d', 'bounce']], 'Moon and blue both say the long oo sound, spelled oo and ue. Book uses the shorter oo, and bone and bounce are different again.', 'vowel-teams'),
  choice('Why is the i long in “kind” when there is no silent e?', 'c', [['a', 'The k makes it long.'], ['b', 'The n makes it long.'], ['c', 'Words ending -ind, -ild and -old keep a long vowel.'], ['d', 'It is short, not long.']], 'Kind, mind, child and old belong to a small group where the vowel stays long without a silent e. They are worth learning as a set.', 'exceptions'),
  choice('Which word does NOT use a vowel team?', 'd', [['a', 'foam'], ['b', 'found'], ['c', 'feed'], ['d', 'fond']], 'Fond has a single short o. Foam, found and feed each use two vowels working together.', 'vowel-teams'),
  choice('In “care”, “here” and “fire”, what are the vowels doing?', 'b', [['a', 'They are short.'], ['b', 'They are followed by r and then a silent e.'], ['c', 'They are silent.'], ['d', 'They form vowel teams.']], 'Each has a vowel, then r, then a silent e, which gives the sound you hear in care, here and fire.', 'r-controlled'),
  choice('Which word has a short vowel sound?', 'a', [['a', 'rid'], ['b', 'ride'], ['c', 'raid'], ['d', 'rude']], 'Rid has one vowel and a consonant after it, so the i is short. The other three are all long.', 'short-v-long'),
  choice('Which pair of words share a vowel sound?', 'd', [['a', '“toy” and “tool”'], ['b', '“toy” and “told”'], ['c', '“toy” and “tout”'], ['d', '“toy” and “boil”']], 'Toy and boil both say the oi sound, spelled oy at the end of a word and oi inside one.', 'vowel-teams'),
  choice('Which word has a long vowel sound?', 'c', [['a', 'stock'], ['b', 'stomp'], ['c', 'stole'], ['d', 'strand']], 'Stole has a silent e, which makes the o long. The others all have short vowels.', 'short-v-long'),
  choice('You have never seen the word “glope”. How would you most likely say its vowel?', 'b', [['a', 'Short o, as in shop'], ['b', 'Long o, as in rope'], ['c', 'The oo sound, as in moon'], ['d', 'The ow sound, as in cow']], 'The silent e at the end makes the o long, exactly as it does in rope and hope. A pattern lets you read a word you have never met.', 'transfer-invented'),
  choice('You have never seen the word “sprench”. How would you most likely say its vowel?', 'a', [['a', 'Short e, as in bench'], ['b', 'Long e, as in beach'], ['c', 'Long a, as in brake'], ['d', 'The er sound, as in her']], 'The e sits between consonants with no silent e and no vowel team, so it is short, exactly as in bench.', 'transfer-invented'),
  choice('Which word has a silent e that changes the vowel before it?', 'c', [['a', 'house'], ['b', 'have'], ['c', 'slide'], ['d', 'some']], 'In slide the e makes the i long. In house, have and some the final e does not lengthen the vowel in front of it.', 'silent-e'),
  choice('Which word has an r-controlled vowel?', 'b', [['a', 'stone'], ['b', 'storm'], ['c', 'stool'], ['d', 'stout']], 'In storm the r follows the o and changes its sound.', 'r-controlled'),
  choice('Which word has a short vowel sound?', 'd', [['a', 'beat'], ['b', 'beet'], ['c', 'bead'], ['d', 'bet']], 'Bet has a single e between consonants, so it is short. The other three use vowel teams for long e.', 'short-v-long'),
  choice('Which pair of words share a vowel sound?', 'a', [['a', '“night” and “pie”'], ['b', '“night” and “neat”'], ['c', '“night” and “knit”'], ['d', '“night” and “nought”']], 'Night and pie both say long i, spelled igh and ie.', 'vowel-teams'),
];

// --- PH.syllables -------------------------------------------------------------------------------
const syllableRows = [
  example('Say “rabbit” slowly and clap once for each beat: rab-bit.', 'Every syllable holds exactly one vowel sound. Rabbit has two vowel sounds, so it has two syllables, and the break falls between the two b letters.', 'count-syllables'),
  example('Compare “ti-ger” with “tid-bit”.', 'When one consonant sits between two vowels, the break usually comes before it and the first vowel stays long: ti-ger. When two consonants sit between them, the break usually comes between the two, and the first vowel stays short: tid-bit.', 'vccv-vcv'),
  choice('How many syllables are in “basket”?', 'b', [['a', 'One'], ['b', 'Two'], ['c', 'Three'], ['d', 'Four']], 'Basket holds two vowel sounds, so it has two syllables: bas-ket.', 'count-syllables'),
  choice('How many syllables are in “elephant”?', 'c', [['a', 'One'], ['b', 'Two'], ['c', 'Three'], ['d', 'Four']], 'El-e-phant holds three vowel sounds, so three syllables.', 'count-syllables'),
  choice('Where does “napkin” break?', 'a', [['a', 'nap-kin'], ['b', 'na-pkin'], ['c', 'napk-in'], ['d', 'n-apkin']], 'Two consonants sit between the vowels, so the break comes between them and the a stays short.', 'vccv-vcv'),
  choice('Where does “open” break?', 'c', [['a', 'op-en'], ['b', 'ope-n'], ['c', 'o-pen'], ['d', 'open has one syllable']], 'One consonant sits between the vowels, so the break comes before it and the o stays long.', 'vccv-vcv'),
  choice('Which syllable is loudest in “photograph”?', 'a', [['a', 'PHO'], ['b', 'to'], ['c', 'graph'], ['d', 'They are all equally loud.']], 'Say it aloud: PHO-to-graph. The first beat carries the stress.', 'stress'),
  choice('How many syllables are in “computer”?', 'd', [['a', 'One'], ['b', 'Two'], ['c', 'Four'], ['d', 'Three']], 'Com-pu-ter holds three vowel sounds.', 'count-syllables'),
  choice('How many syllables are in “remember”?', 'b', [['a', 'Two'], ['b', 'Three'], ['c', 'Four'], ['d', 'Five']], 'Re-mem-ber holds three vowel sounds.', 'count-syllables'),
  choice('Where does “muffin” break?', 'a', [['a', 'muf-fin'], ['b', 'mu-ffin'], ['c', 'muff-in'], ['d', 'm-uffin']], 'Two consonants sit between the vowels, so the break falls between them and the u stays short.', 'vccv-vcv'),
  choice('Where does “pilot” break?', 'c', [['a', 'pil-ot'], ['b', 'pilo-t'], ['c', 'pi-lot'], ['d', 'p-ilot']], 'One consonant sits between the vowels, so the break comes before it and the i stays long.', 'vccv-vcv'),
  choice('Which syllable is loudest in “invitation”?', 'd', [['a', 'in'], ['b', 'vi'], ['c', 'tion'], ['d', 'TA']], 'Say it aloud: in-vi-TA-tion. The third beat carries the stress.', 'stress'),
  choice('How many syllables are in “strength”?', 'a', [['a', 'One'], ['b', 'Two'], ['c', 'Three'], ['d', 'None']], 'Strength has eight letters but only one vowel sound, so it is one syllable. Syllables count vowel sounds, not letters.', 'count-syllables'),
  choice('A syllable that ends with its vowel, like “ti” in tiger, is called ___.', 'b', [['a', 'a closed syllable'], ['b', 'an open syllable'], ['c', 'a silent syllable'], ['d', 'a stressed syllable']], 'An open syllable ends with its vowel and that vowel is usually long. A closed syllable ends with a consonant and its vowel is usually short.', 'open-closed'),
  choice('Which word has a closed first syllable?', 'd', [['a', 'baby'], ['b', 'tiger'], ['c', 'paper'], ['d', 'rabbit']], 'Rab ends in a consonant, so it is closed and the a is short. Ba, ti and pa all end in their vowel, so those are open and long.', 'open-closed'),
  choice('Which syllable is loudest in “community”?', 'c', [['a', 'com'], ['b', 'ni'], ['c', 'MU'], ['d', 'ty']], 'Say it aloud: com-MU-ni-ty. The second beat carries the stress.', 'stress'),
  choice('How many syllables are in “calendar”?', 'b', [['a', 'Two'], ['b', 'Three'], ['c', 'Four'], ['d', 'One']], 'Cal-en-dar holds three vowel sounds.', 'count-syllables'),
  choice('Where does “tablet” break?', 'a', [['a', 'tab-let'], ['b', 'ta-blet'], ['c', 'tabl-et'], ['d', 't-ablet']], 'Two consonants sit between the vowels, so the break falls between them.', 'vccv-vcv'),
  choice('You have never seen the word “flunbet”. How many syllables does it have?', 'b', [['a', 'One'], ['b', 'Two'], ['c', 'Three'], ['d', 'Four']], 'Two vowel sounds, u and e, so two syllables: flun-bet. You can count the beats in a word you have never met.', 'transfer-invented'),
  choice('You have never seen the word “dremo”. Where would it break, and what does that do to the first vowel?', 'c', [['a', 'drem-o, and the e stays short'], ['b', 'd-remo, and the e is silent'], ['c', 'dre-mo, and the e stays long'], ['d', 'It has only one syllable.']], 'One consonant sits between the vowels, so the break comes before it. That leaves an open first syllable, and an open syllable keeps its vowel long.', 'transfer-invented'),
  choice('Which syllable is loudest in “information”?', 'd', [['a', 'in'], ['b', 'for'], ['c', 'tion'], ['d', 'MA']], 'Say it aloud: in-for-MA-tion. The third beat carries the stress.', 'stress'),
  choice('Which word has an open first syllable?', 'a', [['a', 'paper'], ['b', 'basket'], ['c', 'window'], ['d', 'napkin']], 'Pa ends in its vowel, so it is open and the a is long. The other three have a consonant closing the first syllable.', 'open-closed'),
  choice('Where does “sudden” break?', 'b', [['a', 'su-dden'], ['b', 'sud-den'], ['c', 'sudd-en'], ['d', 's-udden']], 'Two consonants sit between the vowels, so the break falls between them and the u stays short.', 'vccv-vcv'),
  choice('How many syllables are in “umbrella”?', 'c', [['a', 'Two'], ['b', 'Four'], ['c', 'Three'], ['d', 'One']], 'Um-brel-la holds three vowel sounds.', 'count-syllables'),
];

const PHONICS_PLACEMENT = {
  albertaOrganizingIdea: 'Phonics',
  albertaGrades: 'Kindergarten to Grade 4',
  note: 'Alberta ends the Phonics organizing idea after Grade 4, so this measures no Grade 5/6 outcome and must never be presented as one. It is here because the parent asked for it on 2026-09-18, knowing that, for children who need it.',
};

const rawFoundationPacks = [
  makePack(
    'PH.vowels',
    'Vowel Sounds and What Changes Them',
    'A vowel can say its short sound or its long sound. A silent e at the end, a second vowel teaming up with it, or an r straight after it will each change which sound you hear. Knowing the patterns lets you read a word you have never seen.',
    ['Find the vowel, and look at what comes after it.', 'Check for a silent e, a vowel team, or an r.', 'Say the word both ways and keep the one that sounds like a word.'],
    vowelRows,
    PHONICS_PLACEMENT,
  ),
  makePack(
    'PH.syllables',
    'Breaking Long Words into Beats',
    'Every syllable holds exactly one vowel sound, so the number of vowel sounds is the number of beats. Where a word breaks depends on how many consonants sit between the vowels, and the break decides whether the first vowel is long or short.',
    ['Say the word aloud and clap the beats.', 'Count the vowel sounds, not the vowel letters.', 'Look at how many consonants sit between the vowels.'],
    syllableRows,
    PHONICS_PLACEMENT,
  ),
];

export const foundationPacks = rawFoundationPacks.map((pack) => ({
  ...pack,
  items: applyCorrections(pack.items, correctionData.corrections),
}));
export const foundationItems = foundationPacks.flatMap((pack) => pack.items);
