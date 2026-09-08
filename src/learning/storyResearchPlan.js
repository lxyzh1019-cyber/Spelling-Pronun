export function validateStoryResearchPlan({ plan, sources = [] }) {
  const errors = [];
  const sourceIds = new Set(sources.map((source) => source.id));
  if (plan?.status !== 'pre_authoring_research_plan') errors.push('Story research plan must remain pre-authoring');
  const chapters = plan?.chapters || [];
  if (chapters.length !== 5) errors.push('Story research plan must cover Chapters 2 through 6');
  const chapterNumbers = chapters.map((entry) => entry.chapter);
  for (const chapter of [2, 3, 4, 5, 6]) if (!chapterNumbers.includes(chapter)) errors.push(`Story research plan misses Chapter ${chapter}`);
  if (new Set(chapterNumbers).size !== chapterNumbers.length) errors.push('Story research plan repeats a chapter');
  for (const entry of chapters) {
    if (entry.status !== 'pre_authoring_not_verified') errors.push(`Chapter ${entry.chapter} makes an unsupported research-status claim`);
    if (!entry.setting?.trim() || !entry.claimBoundary?.trim()) errors.push(`Chapter ${entry.chapter} is missing its setting or claim boundary`);
    if (!entry.sourceIds?.length) errors.push(`Chapter ${entry.chapter} has no candidate research source`);
    if (!entry.openRequirements?.length) errors.push(`Chapter ${entry.chapter} has no open research requirements`);
    for (const sourceId of entry.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`Chapter ${entry.chapter} references unknown source ${sourceId}`);
  }
  return { valid: errors.length === 0, errors, preparedChapterCount: chapters.length };
}
