import fs from 'node:fs';
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

const BLOCKED = {
  2: 'The second episode needs the punctuation content chapter 2 names (end punctuation beyond capitals and end marks). PU.list-commas, PU.direct-address, PU.clause-commas, PU.apostrophes and PU.dialogue are declared in skills.json with no content.',
  4: 'Both episodes need commas, quotations and fragments/run-ons. PU.* and SE.fragments/SE.runons are declared with no content.',
  6: 'Both episodes need integrated editing and sentence writing. ED.locate, ED.repair, ED.explain and ED.transfer are declared with no content, and the chapter is the case’s resolution, so it cannot be written before the chapters it resolves.',
};

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
    ...(mine.length < EPISODES_PER_CHAPTER ? { blockedBy: BLOCKED[chapter.chapter] || 'Not yet written.' } : {}),
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
