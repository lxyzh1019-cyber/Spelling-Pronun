// F2 packs: the four below-grade gaps the 48-question diagnostic located and nothing yet teaches.
//
// WHERE THESE CAME FROM. Both children ran the below-grade diagnostic (`diagnostic.k4.draft.js`). It
// flagged eight skills. Four already had draft packs (GR.possessives, PU.apostrophes, PU.dialogue,
// PH.syllables). These are the other four, which were declared in `skills.json` with nothing behind
// them: PH.digraphs-clusters, SP.inflections, PH.blend-segment and PH.multisyllable. Each pack aims
// at the wrong answers the diagnostic actually recorded, not at the skill in general:
//
//   PH.digraphs-clusters  "stop" and "green" taken for digraphs, "wish" taken for an ending cluster,
//                         "stamp" taken for a word with a silent letter. So: one sound or two, at the
//                         start and at the end, and which letters are silent.
//   PH.blend-segment      counting letters instead of sounds.
//   SP.inflections        hope → hoping (drop the e) against hop → hopping (double), plus y → i.
//   PH.multisyllable      finding the base word inside a long word: unhelpfully → help.
//
// WHY SP.inflections IS HERE, in a foundation batch, and not beside SP.patterns or with the G1/P1
// packs. SP.patterns is C0 and pilot-approved, and its file and records are pinned. The G1 and P1
// convention — cite a general Grade 5/6 outcome and leave the grade to the ladder — fits a pack that
// teaches the Grade 5/6 statement itself. This one does not: it teaches the Grade 3 "basic
// guidelines for adding inflectional endings", which Alberta states word for word ("dropping the <e>
// and adding <ing>", "doubling the letter before adding <ing> or <ed>"). The nearest Grade 5
// statement, "Apply knowledge of prefixes and suffixes to spell words", is wider than this pack, and
// citing it would claim a Grade 5 check the pack does not make. So it follows the F1 convention: an
// `albertaPlacement` that quotes the statements it was judged against, and no Grade 5/6 outcome id.
//
// PLACEMENTS QUOTE, THEY DO NOT ASSERT. Each `albertaPlacement` names the grades as the ladder
// derives them from the outcomes, and lists the statements themselves, quoted from
// `curriculum.k6.json`, with the PDF pages the extraction took that organizing idea from at that
// grade band. The extraction records pages per organizing idea and grade band, not per statement,
// so a statement is cited with that band's pages rather than a single page nobody has checked.
// `test/foundation2Packs.test.js` resolves every quotation and every page against the extraction and
// every grade range against the ladder.
//
// TEXT ONLY, like F1. Every question is answered by looking. Sounds are written between slashes, the
// way the diagnostic writes them, so counting and blending can be asked in print. Nothing here waits
// on a recording nobody has listened to.
//
// NO STORY EPISODE. These follow the F1 precedent, which has none; DEF-54 is noted and the parent's
// plan for this round is to follow that precedent rather than write episodes.

import { makePack as buildPack } from './packBuilder.js';
import { finaliseDraftPacks } from './draftBatch.js';
import pilotApprovalData from './pilotApproval.batches.json' with { type: 'json' };
import correctionData from './corrections.c0.json' with { type: 'json' };

const POSITIONS = ['a', 'b', 'c', 'd'];

// The key is placed at a stated position so the spread of answers is visible in the source rather
// than an accident of how the options happened to be typed.
function ask(prompt, key, answer, wrong, explanation, transferGroup, commonErrors) {
  if (wrong.length !== 3) throw new Error(`"${prompt}" needs three wrong options`);
  const texts = [...wrong];
  texts.splice(POSITIONS.indexOf(key), 0, answer);
  return {
    prompt,
    acceptedAnswers: [key],
    choices: texts.map((text, index) => [POSITIONS[index], text]),
    explanation,
    transferGroup,
    commonErrors,
  };
}
const example = (prompt, explanation, transferGroup, commonErrors) => ({ prompt, explanation, transferGroup, commonErrors });

function makePack(skillId, title, rule, helpSteps, rows, albertaPlacement) {
  return buildPack({ prefix: 'f2', batch: 'F2', skillId, title, rule, helpSteps, rows, albertaPlacement });
}

const COUNTING_LETTERS = 'Counting letters instead of sounds.';
const DIGRAPH_AS_TWO = 'Counting a digraph such as sh, ch, th or ck as two sounds.';
const CLUSTER_AS_ONE = 'Taking a cluster such as st, gr or mp for one sound because the letters are said quickly.';

// --- PH.digraphs-clusters -----------------------------------------------------------------------
const digraphRows = [
  example('Compare “ship” with “slip”.', 'In ship, the s and h join to make one new sound, sh. That is a digraph. In slip you hear the s and then the l, two sounds side by side. That is a cluster. Both words start with two consonants, but only slip has two sounds there.', 'digraph-v-cluster', [CLUSTER_AS_ONE]),
  example('Compare “knee” with “stamp”.', 'In knee the k makes no sound. You say n and then ee, so the k is a silent letter. In stamp every letter makes its own sound: s, t, a, m, p. The st and the mp are clusters, and nothing in stamp is silent.', 'silent-letters', ['Calling a cluster silent because its sounds run together.']),
  ask('Which word starts with a digraph, two letters making one sound?', 'b', 'chip', ['crab', 'clip', 'drip'],
    'In chip the c and h make one sound, ch. Crab, clip and drip start with clusters. You can hear both letters, like c and r.', 'digraph-start', [CLUSTER_AS_ONE]),
  ask('Which word starts with a cluster, where you hear both sounds?', 'a', 'stop', ['shop', 'thin', 'whip'],
    'In stop you hear s and then t. Shop, thin and whip start with digraphs: sh, th and wh are one sound each.', 'cluster-start', ['Choosing a digraph because it is also two letters.']),
  ask('Which word ends with a digraph?', 'c', 'wish', ['hand', 'lamp', 'best'],
    'Wish ends in sh, which is one sound. Hand, lamp and best end in clusters: n and d, m and p, s and t. You hear both letters.', 'digraph-end', [CLUSTER_AS_ONE]),
  ask('Which word ends with a cluster, where you hear both final sounds?', 'd', 'milk', ['bath', 'sing', 'duck'],
    'In milk you hear the l and then the k. Bath ends in th, sing in ng and duck in ck. Each of those pairs is one sound.', 'cluster-end', ['Treating any two final consonants as a cluster.']),
  ask('Which word has a silent letter?', 'a', 'write', ['trip', 'print', 'stand'],
    'In write the w makes no sound: you say r, i, t. Trip, print and stand have clusters, and every letter in them is heard.', 'silent-letters', ['Looking for a silent letter inside a cluster.']),
  ask('How many consonant sounds are at the start of “green”?', 'b', 'two', ['one', 'three', 'four'],
    'Green starts with g and then r. You hear both, so gr is a cluster of two sounds, not a digraph.', 'cluster-start', [CLUSTER_AS_ONE]),
  ask('Which word starts with a digraph?', 'c', 'then', ['grow', 'glad', 'trap'],
    'Th in then is one sound. Grow, glad and trap start with clusters, gr, gl and tr, where you hear both letters.', 'digraph-start', [CLUSTER_AS_ONE]),
  ask('Which word ends with a digraph?', 'b', 'much', ['mask', 'melt', 'mist'],
    'Much ends in ch, one sound. Mask, melt and mist end in clusters: s and k, l and t, s and t.', 'digraph-end', [CLUSTER_AS_ONE]),
  ask('Which word has NO digraph at all?', 'a', 'flag', ['fish', 'phone', 'chop'],
    'Flag has a cluster, fl, where you hear f and then l. Fish has sh, phone has ph and chop has ch. Each of those is one sound.', 'digraph-v-cluster', [DIGRAPH_AS_TWO]),
  ask('Which word has a silent letter?', 'd', 'lamb', ['lamp', 'land', 'last'],
    'In lamb the b is silent: you say l, a, m. Lamp, land and last end in clusters, and you hear both letters.', 'silent-letters', ['Calling the p in lamp silent because it is said quickly.']),
  ask('Which two letters make ONE sound in “phone”?', 'c', 'p and h', ['o and n', 'n and e', 'h and o'],
    'Ph is a digraph that says the f sound. It is one sound spelled with two letters.', 'digraph-start', [DIGRAPH_AS_TWO]),
  ask('Which letters make the cluster at the END of “stamp”?', 'd', 'm and p', ['s and t', 'a and m', 't and a'],
    'At the end of stamp you hear m and then p. Both sounds are there, so mp is a cluster. The st at the start is a cluster too.', 'cluster-end', ['Thinking the p in stamp is silent.']),
  ask('Which word ends with a digraph that says the k sound?', 'a', 'duck', ['desk', 'disk', 'dusk'],
    'In duck the c and k team up to make one k sound. Desk, disk and dusk end with s and then k, two sounds you can hear.', 'digraph-end', [CLUSTER_AS_ONE]),
  ask('Which word has a silent letter at the start?', 'b', 'know', ['snow', 'slow', 'grow'],
    'In know the k makes no sound: you say n and then o. Snow, slow and grow start with clusters, and you hear both letters.', 'silent-letters', ['Missing the silent k because the word sounds like no.']),
  ask('Which word has a digraph AND a cluster?', 'c', 'chest', ['check', 'chin', 'chat'],
    'Chest starts with ch, one sound, and ends with st, two sounds you can hear. Check has two digraphs and no cluster. Chin and chat have only the ch.', 'digraph-v-cluster', ['Counting ck as a cluster.']),
  ask('Which word has NO silent letter?', 'd', 'plant', ['crumb', 'knot', 'wrap'],
    'Every letter in plant is heard: p, l, a, n, t. Crumb has a silent b, knot a silent k and wrap a silent w.', 'silent-letters', ['Choosing a word with clusters as the one with a silent letter.']),
  ask('You have never seen the made-up word “shrask”. Which part is a digraph?', 'a', 'sh', ['sk', 'hr', 'ra'],
    'Sh is one sound in every word you know, so it is one sound in a new word too. The sk at the end is a cluster, so you would say both letters.', 'transfer-invented', [CLUSTER_AS_ONE]),
  ask('In the made-up word “thrip”, how many sounds come before the i?', 'b', 'two', ['one', 'three', 'four'],
    'Th is one sound and r is another, so thr gives two sounds before the i. Three letters make two sounds.', 'transfer-invented', [DIGRAPH_AS_TWO]),
  ask('Which word starts with a digraph?', 'd', 'whale', ['black', 'bread', 'swim'],
    'Wh in whale is one sound. Black, bread and swim start with clusters: b and l, b and r, s and w.', 'digraph-start', [CLUSTER_AS_ONE]),
  ask('Which word ends with a cluster?', 'c', 'rest', ['rich', 'rush', 'rang'],
    'Rest ends with s and then t, two sounds. Rich ends in ch, rush in sh and rang in ng. Each of those is one sound.', 'cluster-end', ['Taking sh or ng for a cluster because it is two letters.']),
  ask('Which word has a silent letter?', 'a', 'thumb', ['trunk', 'twist', 'drum'],
    'In thumb the b is silent: you say th, u, m. Trunk, twist and drum have no silent letters.', 'silent-letters', ['Looking for a silent letter inside a cluster.']),
  ask('How many consonant sounds come before the vowel in “string”?', 'b', 'three', ['two', 'one', 'four'],
    'You hear s, then t, then r before the i. That is a cluster of three sounds. The ng at the end is one sound, a digraph.', 'cluster-start', [CLUSTER_AS_ONE]),
];

// --- PH.blend-segment ---------------------------------------------------------------------------
// Sounds are written between slashes. Every word here was chosen so its sound count is not in doubt:
// no r-controlled vowels, no x, qu or wh, and no n before k (drink), where programs disagree. The
// digraph ng (sing) is kept and counted as one sound, which is what the rule teaches.
const blendRows = [
  example('Count the sounds in “ship”: /sh/ /i/ /p/.', 'Ship has four letters but three sounds. The s and h join to make one sound, sh, so they count once. Count what you hear, not what you see.', 'count-sounds', [COUNTING_LETTERS]),
  example('Blend these sounds: /s/ /t/ /o/ /p/.', 'Say each sound, then say them again faster until they run together: stop. The s and t are a cluster, so each one is its own sound. Four sounds, four letters.', 'blend', ['Dropping one sound of a cluster while blending.']),
  ask('How many sounds are in “chat”?', 'b', 'three', ['two', 'four', 'five'],
    'Ch is one sound, then a, then t. Four letters make three sounds.', 'count-sounds', [COUNTING_LETTERS, DIGRAPH_AS_TWO]),
  ask('How many sounds are in “stop”?', 'c', 'four', ['two', 'three', 'five'],
    'You hear s, t, o and p. The st at the start is a cluster, so both letters are sounded. Four letters make four sounds.', 'count-sounds', [CLUSTER_AS_ONE]),
  ask('Which word do these sounds make? /f/ /i/ /sh/', 'a', 'fish', ['fist', 'fix', 'fits'],
    'F, then i, then sh blend into fish. The last sound is sh, one sound spelled with two letters.', 'blend', ['Reading /sh/ as s and then h.']),
  ask('How many sounds are in “knee”?', 'd', 'two', ['one', 'three', 'four'],
    'The k is silent and ee is one sound, so knee has two sounds: n and ee. Four letters make two sounds.', 'count-sounds', [COUNTING_LETTERS]),
  ask('Which word has four sounds?', 'b', 'frog', ['shop', 'duck', 'that'],
    'Frog is f, r, o, g: four sounds. Shop, duck and that each have a digraph, sh, ck or th, so they have three sounds.', 'count-sounds', [DIGRAPH_AS_TWO]),
  ask('Take away the /s/ from “slip”. What word is left?', 'a', 'lip', ['sip', 'slap', 'pil'],
    'Slip is s, l, i, p. Take the s away and l, i, p is left, which blends into lip.', 'delete-sound', ['Taking away the wrong sound of the cluster.']),
  ask('How many sounds are in “bath”?', 'c', 'three', ['two', 'four', 'five'],
    'B, then a, then th. The t and h make one sound, so four letters make three sounds.', 'count-sounds', [DIGRAPH_AS_TWO]),
  ask('How many sounds are in “stamp”?', 'd', 'five', ['three', 'four', 'six'],
    'You hear s, t, a, m and p. Every letter makes its own sound, so five letters make five sounds. Nothing in stamp is silent.', 'count-sounds', [CLUSTER_AS_ONE]),
  ask('Which word do these sounds make? /g/ /r/ /ee/ /n/', 'b', 'green', ['grin', 'gene', 'greet'],
    'G and r run together, then ee, then n: green. Gr is a cluster, so both sounds are there.', 'blend', ['Dropping the r of the cluster, which gives gene.']),
  ask('Which word has three sounds?', 'a', 'wish', ['west', 'wisp', 'wilt'],
    'Wish is w, i, sh: three sounds. West, wisp and wilt end in clusters, so each of them has four.', 'count-sounds', [DIGRAPH_AS_TWO]),
  ask('How many sounds are in “lamb”?', 'b', 'three', ['two', 'four', 'five'],
    'The b at the end is silent, so lamb is l, a, m. Four letters make three sounds.', 'count-sounds', [COUNTING_LETTERS]),
  ask('Which word do these sounds make? /s/ /p/ /l/ /a/ /sh/', 'c', 'splash', ['slash', 'splat', 'smash'],
    'S, p and l run together, then a, then sh: splash. The start is a cluster of three sounds and the end is one sound, sh.', 'blend', ['Losing the middle sound of a three-sound cluster.']),
  ask('Take away the /r/ from “trip”. What word is left?', 'd', 'tip', ['rip', 'trap', 'pit'],
    'Trip is t, r, i, p. Take the r out of the cluster and t, i, p is left, which is tip.', 'delete-sound', ['Taking away the first sound instead of the one asked for.']),
  ask('Which word has five sounds?', 'a', 'crunch', ['chick', 'thick', 'shelf'],
    'Crunch is c, r, u, n and ch: five sounds. Chick and thick have three and shelf has four, because ch, ck, th and sh are each one sound.', 'count-sounds', [COUNTING_LETTERS]),
  ask('How many sounds are in “sing”?', 'c', 'three', ['two', 'four', 'five'],
    'S, then i, then ng. The n and g make one sound together, so four letters make three sounds.', 'count-sounds', [DIGRAPH_AS_TWO]),
  ask('Which pair of words has the same number of sounds?', 'b', '“duck” and “dog”', ['“duck” and “drum”', '“duck” and “ducks”', '“duck” and “truck”'],
    'Duck is d, u, ck and dog is d, o, g, so both have three sounds. Drum, ducks and truck each have four.', 'count-sounds', [COUNTING_LETTERS]),
  ask('The made-up word “thromp” has six letters. How many sounds does it have?', 'b', 'five', ['four', 'six', 'seven'],
    'Th is one sound, then r, o, m and p. Six letters make five sounds. The rule works on words you have never seen.', 'transfer-invented', [DIGRAPH_AS_TWO]),
  ask('Which made-up word has exactly three sounds?', 'd', 'shep', ['stip', 'blim', 'frot'],
    'Shep is sh, e, p: three sounds, because sh is one. Stip, blim and frot each start with a cluster, so they have four.', 'transfer-invented', [CLUSTER_AS_ONE]),
  ask('How many sounds are in “thin”?', 'a', 'three', ['four', 'two', 'five'],
    'Th is one sound, then i, then n. Four letters make three sounds.', 'count-sounds', [DIGRAPH_AS_TWO]),
  ask('Which word do these sounds make? /b/ /l/ /a/ /k/', 'c', 'black', ['back', 'lack', 'blank'],
    'B and l run together, then a, then the k sound: black. The k sound is spelled ck, two letters for one sound.', 'blend', ['Dropping the l of the cluster, which gives back.']),
  ask('How many sounds are in “trust”?', 'd', 'five', ['three', 'four', 'six'],
    'You hear t, r, u, s and t. There is a cluster at each end, and every letter makes a sound.', 'count-sounds', [CLUSTER_AS_ONE]),
  ask('Take away the /l/ from “clap”. What word is left?', 'b', 'cap', ['lap', 'clip', 'pal'],
    'Clap is c, l, a, p. Take out the l and c, a, p is left: cap.', 'delete-sound', ['Taking away the first sound instead of the one asked for.']),
];

// --- SP.inflections -----------------------------------------------------------------------------
const DROPS_E = 'Keeping the silent e before a vowel ending, as in hopeing.';
const DOUBLES_WRONG = 'Doubling after a long vowel, which spells a different word, as in hopping for hoping.';
const NO_DOUBLE = 'Adding the ending without doubling after one short vowel, as in stoped.';
const Y_TO_I = 'Keeping the y before -es or -ed, as in carrys.';
const inflectionRows = [
  example('Compare “hope” + ing with “hop” + ing.', 'Hope ends in a silent e, and -ing starts with a vowel, so the e is dropped: hoping. Hop has one short vowel and one consonant, so the p is doubled: hopping. The double p keeps the o short. One p leaves it long.', 'drop-v-double', [DROPS_E, DOUBLES_WRONG]),
  example('Compare “cry” + ed with “play” + ed.', 'Cry ends in a consonant and then y, so the y changes to i: cried. Play ends in a vowel and then y, so the y stays: played.', 'y-to-i', [Y_TO_I]),
  ask('Which is correct? “She was ___ to win.”', 'a', 'hoping', ['hopeing', 'hopping', 'hopeng'],
    'Hope ends in a silent e. The ending -ing starts with a vowel, so the e is dropped: hoping. Hopping means jumping, and it comes from hop.', 'drop-e', [DROPS_E, DOUBLES_WRONG]),
  ask('Which is correct? “The frog was ___ across the rocks.”', 'c', 'hopping', ['hoping', 'hoppeing', 'hopin'],
    'Hop has one short vowel and one final consonant, so the p doubles: hopping. With one p it would read as hoping, which means wishing.', 'double', [NO_DOUBLE]),
  ask('Add -ed to “bake”.', 'b', 'baked', ['bakeed', 'bakked', 'bakd'],
    'Bake ends in a silent e. Drop that e and add -ed, which leaves one e: baked.', 'drop-e', [DROPS_E]),
  ask('Add -ing to “run”.', 'd', 'running', ['runing', 'runeing', 'ranning'],
    'Run has one short vowel and one final consonant, so the n doubles: running.', 'double', [NO_DOUBLE]),
  ask('Add -es to “carry”.', 'c', 'carries', ['carrys', 'carryes', 'carrees'],
    'Carry ends in a consonant and then y. The y changes to i before -es: carries.', 'y-to-i', [Y_TO_I]),
  ask('Add -ing to “carry”.', 'a', 'carrying', ['carriing', 'carring', 'carreing'],
    'Keep the y before -ing. Changing it would put two i letters side by side, which English avoids: carrying.', 'y-to-i', ['Changing y to i before -ing as well.']),
  ask('Which is correct?', 'b', 'making', ['makeing', 'makking', 'makin'],
    'Make ends in a silent e, and -ing starts with a vowel. Drop the e: making.', 'drop-e', [DROPS_E]),
  ask('Which is correct?', 'd', 'stopped', ['stoped', 'stopeed', 'stopd'],
    'Stop has one short vowel and one final consonant, so the p doubles before -ed: stopped. With one p it would look like it came from stope.', 'double', [NO_DOUBLE]),
  ask('Which sentence is spelled correctly?', 'a', 'I am writing a letter.', ['I am writting a letter.', 'I am writeing a letter.', 'I am wrighting a letter.'],
    'Write ends in a silent e, so the e is dropped: writing, with one t. Two t letters would make the i short, as it is in written.', 'drop-e', [DROPS_E, DOUBLES_WRONG]),
  ask('Which word is “tape” with -ed added?', 'c', 'taped', ['tapped', 'tapeed', 'tapd'],
    'Tape ends in a silent e. Drop the e and add -ed: taped. Tapped comes from tap, which is a different word.', 'drop-v-double', [DOUBLES_WRONG]),
  ask('Add -ed to “try”.', 'b', 'tried', ['tryed', 'tryied', 'trid'],
    'Try ends in a consonant and then y. Change the y to i and add -ed: tried.', 'y-to-i', [Y_TO_I]),
  ask('Add -s to “play”.', 'a', 'plays', ['plaies', 'playes', 'plais'],
    'Play ends in a vowel and then y, so the y stays and you just add -s: plays.', 'y-to-i', ['Changing y to i after a vowel.']),
  ask('Add -ing to “sit”.', 'd', 'sitting', ['siting', 'siteing', 'sittin'],
    'Sit has one short vowel and one final consonant. Double the t: sitting.', 'double', [NO_DOUBLE]),
  ask('Add -ing to “ride”.', 'c', 'riding', ['ridding', 'rideing', 'ridin'],
    'Ride ends in a silent e, so drop it: riding. Ridding, with two d letters, comes from rid, which is a different word.', 'drop-v-double', [DOUBLES_WRONG]),
  ask('Which word does NOT change at all when you add -ing?', 'b', 'jump', ['hop', 'bake', 'shine'],
    'Jump ends in two consonants, m and p, so nothing changes: jumping. Hop doubles its p, and bake and shine drop their e.', 'drop-v-double', ['Doubling after two consonants, as in jumpping.']),
  ask('Add -es to “fox”.', 'd', 'foxes', ['foxs', 'foxxes', 'foxies'],
    'Words ending in x, s, sh or ch take -es, because you can hear an extra beat: fox, foxes.', 'add-es', ['Adding only -s after x, s, sh or ch.']),
  ask('The made-up verb “to glope” means to walk slowly. Which is right? “He was ___ home.”', 'a', 'gloping', ['glopping', 'glopeing', 'glopin'],
    'Glope ends in a silent e, just like hope, so the e is dropped: gloping. The rule works on words you have never seen.', 'transfer-invented', [DROPS_E, DOUBLES_WRONG]),
  ask('The made-up verb “to blim” means to blink fast. Add -ed.', 'c', 'blimmed', ['blimed', 'blimd', 'blimeed'],
    'Blim has one short vowel and one final consonant, like hop, so the m doubles: blimmed. With one m it would read as blimed, with a long i.', 'transfer-invented', [NO_DOUBLE]),
  ask('Which is correct? “We are ___ a cake.”', 'b', 'baking', ['bakeing', 'bakking', 'bacing'],
    'Bake ends in a silent e, and -ing starts with a vowel. Drop the e: baking.', 'drop-e', [DROPS_E]),
  ask('Add -ed to “plan”.', 'd', 'planned', ['planed', 'planeed', 'plannd'],
    'Plan has one short vowel and one final consonant, so the n doubles: planned. Planed, with one n, would come from plane.', 'double', [NO_DOUBLE]),
  ask('Add -es to “baby”.', 'a', 'babies', ['babys', 'babyes', 'babbies'],
    'Baby ends in a consonant and then y. Change the y to i and add -es: babies.', 'y-to-i', [Y_TO_I]),
  ask('Which sentence is spelled correctly?', 'c', 'She was smiling and waving.', ['She was smileing and waveing.', 'She was smilling and wavving.', 'She was smiling and waveing.'],
    'Smile and wave both end in a silent e, so both drop it before -ing: smiling and waving.', 'drop-e', [DROPS_E]),
];

// --- PH.multisyllable ---------------------------------------------------------------------------
const BASE_TOO_LONG = 'Stopping after one ending and choosing a word that still has a suffix on it.';
const WORD_INSIDE = 'Choosing a short word hiding inside the long one instead of its base.';
const multisyllableRows = [
  example('Take “unhelpfully” apart: un + help + ful + ly.', 'Un- at the front and -ful and -ly at the end are word parts you already know. Cover them and the base word is left: help. Four small chunks are easier to read than one long word.', 'find-base', [BASE_TOO_LONG]),
  example('Chunk “fantastic”: fan-tas-tic.', 'Each chunk has one vowel sound: a, a, i. When two consonants sit between two vowels, break between them, so n and t split, and s and t split. Then read fan, tas, tic, and blend them.', 'chunk', ['Breaking a word into single letters instead of chunks.']),
  ask('What is the base word in “unkindness”?', 'c', 'kind', ['unkind', 'kindness', 'ness'],
    'Cover un- at the front and -ness at the end. Kind is left, and that is the base word.', 'find-base', [BASE_TOO_LONG]),
  ask('What is the base word in “replaying”?', 'a', 'play', ['replay', 'lay', 'ing'],
    'Cover re- at the front and -ing at the end. Play is left. Lay is hiding inside it, but it is not the base.', 'find-base', [WORD_INSIDE]),
  ask('Where would you chunk “sunset”?', 'd', 'sun-set', ['su-nset', 'suns-et', 's-unset'],
    'Two consonants, n and s, sit between the vowels, so the break goes between them: sun-set.', 'chunk', ['Breaking after the first letter.']),
  ask('How many chunks does “carefully” have?', 'b', 'three', ['two', 'four', 'five'],
    'Care, ful and ly. Each chunk has one vowel sound. The e in care is silent, so it adds no chunk.', 'count-chunks', ['Counting the silent e as a chunk of its own.']),
  ask('Which chunk of “disagreement” is the base word?', 'b', 'agree', ['dis', 'ment', 'disagree'],
    'Cover dis- at the front and -ment at the end. Agree is left, and it is the base.', 'find-base', [BASE_TOO_LONG]),
  ask('Where would you chunk “basketball”?', 'd', 'bas-ket-ball', ['ba-sket-ball', 'bask-et-ball', 'bas-ke-tball'],
    'Basketball is two words, basket and ball. Basket breaks between s and k, so the chunks are bas, ket and ball.', 'chunk', ['Missing the two smaller words inside a compound word.']),
  ask('What is the base word in “unhelpfully”?', 'a', 'help', ['helpful', 'unhelp', 'fully'],
    'Cover un- at the front, then -ly and -ful at the end. Help is left. Fully looks like a word, but here it is two suffixes.', 'find-base', [BASE_TOO_LONG]),
  ask('What is the base word in “rethinking”?', 'c', 'think', ['thin', 'rethink', 'king'],
    'Cover re- at the front and -ing at the end. Think is left. King and thin are hiding inside, but they are not the base.', 'find-base', [WORD_INSIDE]),
  ask('Where would you chunk “picnic”?', 'a', 'pic-nic', ['pi-cnic', 'picn-ic', 'p-icnic'],
    'Two consonants, c and n, sit between the vowels. Break between them: pic-nic.', 'chunk', ['Keeping two consonants together that belong to different chunks.']),
  ask('How many chunks does “unbelievable” have?', 'b', 'five', ['three', 'four', 'six'],
    'Un, be, liev, a, ble: five vowel sounds, so five chunks. Cover un- and -able first, and believe is left in the middle without its final e.', 'count-chunks', ['Counting vowel letters instead of vowel sounds.']),
  ask('What is the base word in “misreading”?', 'd', 'read', ['mis', 'reading', 'ding'],
    'Cover mis- at the front and -ing at the end. Read is left.', 'find-base', [BASE_TOO_LONG]),
  ask('Where would you chunk “robot”?', 'c', 'ro-bot', ['rob-ot', 'r-obot', 'robo-t'],
    'One consonant, b, sits between the vowels. Try breaking before it first: ro-bot. The o in ro is long, and that says the word right.', 'chunk', ['Always breaking after the consonant, which gives rob-ot.']),
  ask('Which word has the prefix “un-”, meaning not?', 'b', 'unfair', ['uncle', 'under', 'unit'],
    'In unfair, un- means not, so unfair means not fair. In uncle, under and unit, the u and n are just part of the word and do not mean not.', 'find-base', ['Treating any word that starts with un as having the prefix.']),
  ask('How many chunks does “important” have?', 'a', 'three', ['two', 'four', 'five'],
    'Im, por, tant: three vowel sounds, so three chunks. Read them in order and blend them.', 'count-chunks', ['Counting letters or consonants instead of vowel sounds.']),
  ask('What is the base word in “carelessly”?', 'c', 'care', ['careless', 'less', 'car'],
    'Cover -ly and then -less at the end. Care is left. Car is hiding inside, but the e belongs to the base.', 'find-base', [BASE_TOO_LONG, WORD_INSIDE]),
  ask('Where would you chunk “invented”?', 'd', 'in-vent-ed', ['i-nvent-ed', 'inv-ent-ed', 'in-ve-nted'],
    'Cover -ed at the end. Invent is left, and it breaks between n and v: in-vent. So the chunks are in, vent and ed.', 'chunk', ['Breaking before a suffix has been covered.']),
  ask('The made-up word “unblastful” is built from parts. Which part is the base?', 'd', 'blast', ['unblast', 'ful', 'blastful'],
    'Cover un- at the front and -ful at the end. Blast is left. You can find the base of a word you have never seen.', 'transfer-invented', [BASE_TOO_LONG]),
  ask('How would you chunk the made-up word “tembicon”?', 'a', 'tem-bi-con', ['te-mbi-con', 'temb-ic-on', 't-embicon'],
    'Two consonants, m and b, sit between the first two vowels, so break between them: tem. Then one consonant, c, sits between i and o, so break before it: bi-con.', 'transfer-invented', ['Breaking a new word at random instead of by its vowels.']),
  ask('What is the base word in “unpacking”?', 'b', 'pack', ['unpack', 'pac', 'king'],
    'Cover un- at the front and -ing at the end. Pack is left.', 'find-base', [WORD_INSIDE]),
  ask('Where would you chunk “button”?', 'c', 'but-ton', ['bu-tton', 'butt-on', 'b-utton'],
    'Two t letters sit between the vowels, so break between them: but-ton.', 'chunk', ['Keeping a double letter together in one chunk.']),
  ask('How many chunks does “helpfulness” have?', 'a', 'three', ['two', 'four', 'five'],
    'Help, ful, ness: the base and two suffixes, with one vowel sound each.', 'count-chunks', ['Counting the suffixes but not the base.']),
  ask('Which is the base word in “rewriting”?', 'c', 'write', ['re', 'ting', 'rewrite'],
    'Cover re- at the front and -ing at the end. Writ is left, and it is write with its silent e dropped before -ing.', 'find-base', [BASE_TOO_LONG]),
];

// The statements each placement rests on, quoted from `curriculum.k6.json`. `sourcePages` are the
// pages the extraction attributes to that organizing idea at that grade band (see the header).
const statement = (grade, organizingIdea, part, text, sourcePages, id) => ({ grade, organizingIdea, part, ...(id ? { id } : {}), text, sourcePages });
const WHY = 'The below-grade diagnostic, answered by both children, located this gap, and the parent asked on 2026-09-29 (R7) for it to be built, knowing it is below-grade work.';

const DIGRAPH_PLACEMENT = {
  albertaOrganizingIdea: 'Phonics',
  albertaGrades: 'Grade 1 to Grade 3',
  matchingStatements: [
    statement('Grade 1', 'Phonics', 'Skills & Procedures', 'Read and write two consonant letters that represent one sound at the beginning, middle, and ending of words.', [13, 14], 'phonics.grade1.09'),
    statement('Grade 1', 'Phonics', 'Knowledge', 'Letters in words can be silent.', [13, 14]),
    statement('Grade 3', 'Phonics', 'Skills & Procedures', 'Recognize consonant clusters at the beginning and ending of a word.', [33], 'phonics.grade3.01'),
    statement('Grade 3', 'Phonics', 'Knowledge', 'Consonant digraphs are two consonant letters that appear together and represent a single sound that is different from the sound of either letter (e.g.,sh).', [33]),
  ],
  note: `Alberta ends the Phonics organizing idea after Grade 3, so this measures no Grade 5/6 outcome and must never be presented as one. ${WHY}`,
};

const BLEND_PLACEMENT = {
  albertaOrganizingIdea: 'Phonological Awareness',
  albertaGrades: 'Kindergarten to Grade 2',
  matchingStatements: [
    statement('Kindergarten', 'Phonological Awareness', 'Skills & Procedures', 'Blend sounds to form words.', [11, 12], 'phonological-awareness.kindergarten.16'),
    statement('Grade 2', 'Phonological Awareness', 'Skills & Procedures', 'Segment sounds in words that have consonant blends.', [11, 12], 'phonological-awareness.grade2.03'),
    statement('Grade 2', 'Phonological Awareness', 'Skills & Procedures', 'Delete phonemes in a consonant blend to form a new word.', [11, 12], 'phonological-awareness.grade2.07'),
  ],
  note: `Alberta ends the Phonological Awareness organizing idea after Grade 2, so this measures no Grade 5/6 outcome and must never be presented as one. Alberta states it as spoken work; here it is asked in print, with sounds written between slashes, so no recording is needed. ${WHY}`,
};

const INFLECTION_PLACEMENT = {
  albertaOrganizingIdea: 'Conventions',
  albertaGrades: 'Grade 1 to Grade 3',
  matchingStatements: [
    statement('Grade 1', 'Vocabulary', 'Skills & Procedures', 'Add or remove suffixes to change the tense of words.', [9, 10], 'vocabulary.grade1.10'),
    statement('Grade 3', 'Conventions', 'Skills & Procedures', 'Recognize basic guidelines for adding inflectional endings.', [40, 41, 42, 43], 'conventions.grade3.33'),
    statement('Grade 3', 'Conventions', 'Knowledge', 'The basic guidelines for adding inflectional endings consist of • dropping the <e> and adding <ing> • doubling the letter before adding <ing> or <ed>', [40, 41, 42, 43]),
  ],
  note: `Alberta states these ending rules last at Grade 3. The nearest Grade 5 statement, "Apply knowledge of prefixes and suffixes to spell words", is wider than this pack, so the pack does not claim it. Changing y to i is taught here because the diagnostic tested it; Alberta's Grade 3 guidelines do not list it. ${WHY}`,
};

const MULTISYLLABLE_PLACEMENT = {
  albertaOrganizingIdea: 'Phonics',
  albertaGrades: 'Grade 1 to Grade 3',
  matchingStatements: [
    statement('Grade 1', 'Phonological Awareness', 'Skills & Procedures', 'Identify syllables in words that have three or more syllables.', [11, 12], 'phonological-awareness.grade1.06'),
    statement('Grade 3', 'Phonics', 'Skills & Procedures', 'Recognize and apply a wide variety of long and short vowel sounds when decoding unknown multisyllabic words.', [33], 'phonics.grade3.04'),
    statement('Grade 3', 'Vocabulary', 'Skills & Procedures', 'Analyze bases and affixes for meaning.', [31, 32], 'vocabulary.grade3.07'),
  ],
  note: `Alberta ends the Phonics organizing idea after Grade 3, so this measures no Grade 5/6 outcome and must never be presented as one. ${WHY}`,
};

const rawFoundation2Packs = [
  makePack(
    'PH.digraphs-clusters',
    'Two Letters, One Sound or Two',
    'A digraph is two letters that make ONE sound: sh, ch, th, wh, ph, ck and ng. A cluster is two or three consonants side by side where you still hear EVERY sound: st, bl, gr, mp, nd. Some words also hold a silent letter, like the k in knee, that makes no sound at all.',
    ['Find the consonant letters that sit side by side.', 'Say the word slowly. Do you hear one sound there, or one for each letter?', 'One sound from two letters is a digraph. A sound for every letter is a cluster.', 'A letter that makes no sound at all is a silent letter.'],
    digraphRows,
    DIGRAPH_PLACEMENT,
  ),
  makePack(
    'PH.blend-segment',
    'Counting Sounds, Not Letters',
    'A word is made of sounds, and the number of sounds is often not the number of letters. A digraph like sh or ck is two letters but one sound, a silent letter is no sound, and a cluster like st is two sounds. Count what you hear, then check each sound against the letters that spell it.',
    ['Say the word slowly, one sound at a time.', 'Mark each digraph as one sound and each silent letter as none.', 'Count the sounds you marked, not the letters.', 'To blend, say the sounds in order and push them together.'],
    blendRows,
    BLEND_PLACEMENT,
  ),
  makePack(
    'SP.inflections',
    'Adding -ing, -ed and -es',
    'Before you add an ending, look at the end of the base word. If it ends in a silent e and the ending starts with a vowel, drop the e: hope, hoping. If it has one short vowel and one final consonant, double that consonant: hop, hopping. If it ends in a consonant and y, change the y to i before -es or -ed, but keep it before -ing: carry, carries, carrying.',
    ['Find the base word and look at its last letters.', 'Silent e at the end? Drop it before -ing or -ed.', 'One short vowel and then one consonant? Double the consonant.', 'A consonant and then y? Change the y to i, except before -ing.', 'Read your word back: hoping has a long o, hopping has a short o.'],
    inflectionRows,
    INFLECTION_PLACEMENT,
  ),
  makePack(
    'PH.multisyllable',
    'Reading Long Words in Chunks',
    'A long word is easier to read in chunks. First look for a prefix at the front and a suffix at the end, and cover them to find the base word. Then break what is left between syllables, so each chunk has one vowel sound. Read the chunks in order and blend them into the word.',
    ['Cover any prefix at the front, like un-, re- or dis-.', 'Cover any suffix at the end, like -ful, -ly, -ness or -ing.', 'Read the base word that is left.', 'Break the rest into chunks with one vowel sound each, then read them in order.'],
    multisyllableRows,
    MULTISYLLABLE_PLACEMENT,
  ),
];

export const foundation2Packs = finaliseDraftPacks(rawFoundation2Packs, {
  corrections: correctionData.corrections,
  approvals: pilotApprovalData.approvals,
});
export const foundation2Items = foundation2Packs.flatMap((pack) => pack.items);
