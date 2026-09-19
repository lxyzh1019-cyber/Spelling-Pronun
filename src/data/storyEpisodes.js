// Story episodes with the parent's pilot approval resolved, so every consumer sees one status.
// The raw drafts stay the authored record; this module is what the app reads.
//
// Until 2026-09-19 this file read `story.c0.draft.json` alone. That was not a gate — it was a gap.
// The ten episodes of chapters 2 to 6 were imported by no runtime module at all, so an approval
// record for one of them would have changed nothing, because no code would ever have read it. It is
// the same defect DEF-56 named for packs, left in place on the story path when that was fixed.
//
// Both files are read now and both go through the same approval mapper, so a chapter the parent
// approves appears and an unapproved one does not, with no further code change either way.
import { finaliseDraftEpisodes } from './draftBatch.js';
import batchApprovalData from './pilotApproval.batches.json' with { type: 'json' };
import pilotApprovalData from './pilotApproval.c0.json' with { type: 'json' };
import c1Draft from './story.c1.draft.json' with { type: 'json' };
import storyDraft from './story.c0.draft.json' with { type: 'json' };

const approvals = [...pilotApprovalData.approvals, ...batchApprovalData.approvals];

export const c0StoryEpisodes = finaliseDraftEpisodes(storyDraft.episodes, { approvals });
export const c1StoryEpisodes = finaliseDraftEpisodes(c1Draft.episodes, { approvals });

// Every episode written, in reading order, whatever its status. This is for the parent's review
// surface and for the ledger; anything showing episodes to a learner must gate for itself.
export const allStoryEpisodes = [...c0StoryEpisodes, ...c1StoryEpisodes]
  .slice()
  .sort((a, b) => a.chapter - b.chapter || a.sequence - b.sequence);

// What a learner may open: approved episodes only. Today that is chapter 1, exactly as before.
export const storyEpisodes = allStoryEpisodes.filter((episode) => ['pilot_approved', 'released'].includes(episode.releaseStatus));

export const c0Story = { ...storyDraft, episodes: c0StoryEpisodes };
export const story = { ...storyDraft, episodes: storyEpisodes };
