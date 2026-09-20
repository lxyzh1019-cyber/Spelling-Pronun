// The "words to spell again" list: the words a child chose to keep after a round.
//
// It exists because the app used to CLAIM skipped words were saved for later practice and nothing
// saved them. It is practice bookkeeping on one device and never evidence: no attempt is written here,
// and nothing in it can make a skill look mastered.
//
// Whole word objects are stored rather than ids, so the list can be run without loading the catalogue
// the words came from. The cap keeps that cheap.

export const SPELL_AGAIN_CAP = 40;

export function addSpellAgain(list = [], words = [], { savedAt = '' } = {}) {
  const next = [...(Array.isArray(list) ? list : [])];
  for (const word of words) {
    if (!word?.id) continue;
    const existing = next.findIndex((entry) => entry.id === word.id);
    if (existing !== -1) next.splice(existing, 1);
    next.push({ id: word.id, word: word.word, definition: word.definition, hint: word.hint, savedAt });
  }
  return next.slice(Math.max(0, next.length - SPELL_AGAIN_CAP));
}

export function removeSpellAgain(list = [], wordIds = []) {
  const drop = new Set(wordIds);
  return (Array.isArray(list) ? list : []).filter((entry) => !drop.has(entry.id));
}

export function spellAgainWords(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter((entry) => entry?.id && entry?.word)
    .map(({ id, word, definition, hint }) => ({ id, word, definition, hint }));
}
