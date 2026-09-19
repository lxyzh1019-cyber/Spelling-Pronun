import fs from 'node:fs';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
const c0 = JSON.parse(fs.readFileSync('src/data/story.c0.draft.json', 'utf8'));
const c1 = JSON.parse(fs.readFileSync('src/data/story.c1.draft.json', 'utf8'));
const written = [...c0.episodes.map((e) => ({ ...e, file: 'story.c0.draft.json' })), ...c1.episodes.map((e) => ({ ...e, file: 'story.c1.draft.json' }))];

// The plan, from MASTER_PLAN.md "Season 1: six chapters, two episodes each".
const CHAPTERS = [
  { chapter: 1, setting: 'British printing workshop', caseProgression: 'A manuscript and its printed copy disagree', languageFocus: 'Spelling, capitals, complete sentences' },
  { chapter: 2, setting: 'British port; departure across Atlantic', caseProgression: "A letter's intended recipient is unclear", languageFocus: 'Pronouns, antecedents, end punctuation' },
  { chapter: 3, setting: 'Community in what is now Canada, historically verified locale', caseProgression: 'Two accounts describe the same incident differently', languageFocus: 'Agreement, tense, vocabulary and clear reference' },
  { chapter: 4, setting: 'Canadian newspaper office', caseProgression: 'A report changes meaning in transcription', languageFocus: 'Commas, quotations, fragments/run-ons' },
  { chapter: 5, setting: 'Railway journey west', caseProgression: 'Dates, messages and diary entries must be reconciled', languageFocus: 'Conjunctions, sequence, word parts and multisyllable vocabulary' },
  { chapter: 6, setting: 'Alberta archive', caseProgression: 'Evidence supports the corrected attribution', languageFocus: 'Integrated editing, sentence writing and final evidence explanation' },
];
const EPISODES_PER_CHAPTER = 2;

// What each unwritten chapter needs before it can be written. These were prose, hand-written, so a
// chapter stayed "blocked on PU.list-commas" after PU.list-commas was built. They are skill ids now,
// and the blocker is DERIVED: a chapter is blocked only by the skills that still have no content, so
// building a pack moves the ledger without anyone remembering to edit it.
const NEEDS = {
  2: { skills: ['PU.list-commas', 'PU.clause-commas', 'PU.apostrophes', 'PU.dialogue', 'PU.direct-address'], why: 'the punctuation chapter 2 names, beyond the capitals and end marks chapter 1 already teaches' },
  4: { skills: ['PU.list-commas', 'PU.dialogue', 'SE.fragments', 'SE.runons'], why: 'commas, quotations and fragments/run-ons' },
  6: { skills: ['ED.locate', 'ED.repair'], why: 'integrated editing and sentence writing, and the chapter is the case’s resolution, so it cannot be written before the chapters it resolves' },
};

const skillsWithContent = new Set([...c0PilotPacks, ...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks].map((pack) => pack.skillId));

function blockerFor(chapter) {
  const need = NEEDS[chapter];
  if (!need) return 'Not yet written.';
  const missing = need.skills.filter((skillId) => !skillsWithContent.has(skillId));
  if (!missing.length) return `Ready to write: every skill it needs (${need.skills.join(', ')}) now has content.`;
  return `Needs ${need.why}. Still without content: ${missing.join(', ')}.`;
}

const chapters = CHAPTERS.map((chapter) => {
  const mine = written.filter((episode) => episode.chapter === chapter.chapter).sort((a, b) => a.sequence - b.sequence);
  return {
    ...chapter,
    plannedEpisodes: EPISODES_PER_CHAPTER,
    writtenEpisodes: mine.length,
    episodes: mine.map((episode) => ({
      id: episode.id, sequence: episode.sequence, title: episode.title, version: episode.version,
      reviewStatus: episode.reviewStatus, releaseStatus: episode.releaseStatus,
      taskCount: episode.taskIds.length, file: episode.file,
    })),
    ...(mine.length < EPISODES_PER_CHAPTER ? { blockedBy: blockerFor(chapter.chapter) } : {}),
  };
});

const plannedTotal = CHAPTERS.length * EPISODES_PER_CHAPTER;
const writtenTotal = written.length;
fs.writeFileSync('src/data/story.ledger.json', JSON.stringify({
  version: 1,
  source: 'docs/MASTER_PLAN.md, "Season 1: six chapters, two episodes each" and the R3-G1 gate, which requires all 12 episodes.',
  note: 'The total the plan commits to, against what exists. This file is generated from the story files themselves, so an episode cannot be written or lost without the count moving. It records episodes, not approval: everything outside chapter 1 is draft.',
  plannedChapters: CHAPTERS.length,
  episodesPerChapter: EPISODES_PER_CHAPTER,
  plannedEpisodes: plannedTotal,
  writtenEpisodes: writtenTotal,
  remainingEpisodes: plannedTotal - writtenTotal,
  releasedEpisodes: written.filter((episode) => episode.releaseStatus === 'released').length,
  pilotApprovedEpisodes: 2,
  pilotApprovedNote: 'Only chapter 1’s two episodes are pilot-approved, at version 3. Every episode written since is draft and cannot reach a child.',
  chapters,
}, null, 2) + '\n');
console.log(`planned ${plannedTotal}, written ${writtenTotal}, remaining ${plannedTotal - writtenTotal}`);
for (const chapter of chapters) console.log(` ch${chapter.chapter}: ${chapter.writtenEpisodes}/${chapter.plannedEpisodes}${chapter.blockedBy ? ' — blocked' : ''}`);
