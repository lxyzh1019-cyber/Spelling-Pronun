// The last step every authored batch goes through before anything consumes it.
//
// Four pack files each ended differently, and the differences were not decisions — they were what
// each file happened to remember on the day it was written:
//
//   packs.c0.draft.js          corrections, then pilot approval   (the only complete one)
//   packs.c1.draft.js          corrections only
//   packs.foundation.draft.js  corrections only
//   packs.punctuation.draft.js neither
//   packs.sentences.draft.js   neither
//
// The consequence was not cosmetic. `applyPilotApproval` is what promotes an item from
// `not_released` to `pilot_approved`, so a pack that never ran through it could not be approved at
// all: the parent could read every question, decide every one was good, record the decision, and
// nothing would change, because no code would read the record. Three of the five pack files were in
// that state, holding 264 of the 360 drafted questions.
//
// A pack that skips `applyCorrections` is the mirror image — a known defect in it could never be
// withheld, because quarantine is applied here or nowhere.
//
// ORDER MATTERS, and it is the one thing in this file that is not obvious. Corrections resolve
// first, because `applyCorrections` decides whether an item is still withheld by comparing its
// version against the correction's `toVersion`. Approving first would stamp every corrected item
// `correction_not_installed` on the way past.

import { applyCorrections } from '../learning/contentCorrections.js';
import { applyPilotApproval, applyPilotApprovalToEpisode } from '../learning/pilotApproval.js';

export function finaliseDraftPacks(packs, { corrections = [], approvals = [] } = {}) {
  return packs.map((pack) => ({
    ...pack,
    items: applyCorrections(pack.items, corrections).map((item) => applyPilotApproval(item, approvals, pack.id)),
  }));
}

// Episodes carry their own lifecycle rather than a list of items, so they have their own mapper.
export function finaliseDraftEpisodes(episodes, { approvals = [] } = {}) {
  return episodes.map((episode) => applyPilotApprovalToEpisode(episode, approvals));
}
