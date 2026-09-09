// Story episodes with the parent's pilot approval resolved, so every consumer sees one status.
// The raw draft stays the authored record; this module is what the app reads.
import { applyPilotApprovalToEpisode } from '../learning/pilotApproval.js';
import pilotApprovalData from './pilotApproval.c0.json' with { type: 'json' };
import storyDraft from './story.c0.draft.json' with { type: 'json' };

export const c0StoryEpisodes = storyDraft.episodes.map((episode) => applyPilotApprovalToEpisode(episode, pilotApprovalData.approvals));
export const c0Story = { ...storyDraft, episodes: c0StoryEpisodes };
