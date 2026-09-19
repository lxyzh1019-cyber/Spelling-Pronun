const CURRENT_C0_SKILL_IDS = new Set(['SP.patterns', 'SE.complete', 'PU.capitals-endmarks', 'GR.subject-object-pronouns']);

export function validateCurriculumPreparation({ preparation, skills = [], sources = [] }) {
  const errors = [];
  if (preparation?.status !== 'pre_pilot_source_and_mapping_preparation') errors.push('Curriculum preparation must remain pre-pilot only');
  const skillIds = new Set(skills.map((skill) => skill.id));
  const sourceIds = new Set(sources.map((source) => source.id));
  const expectedIds = skills.map((skill) => skill.id).filter((id) => !CURRENT_C0_SKILL_IDS.has(id));
  const batches = preparation?.batches || [];
  // C1 and C2 must still be here — they are the original plan and dropping one would silently unplan
  // its skills. A third batch is not a fault: C3 was added from the Alberta curriculum mapping, which
  // supersedes the C1/C2 ordering. What matters is that every batch is named once and every future
  // skill is planned exactly once, both of which are checked below.
  for (const required of ['C1', 'C2']) {
    if (!batches.some((batch) => batch.id === required)) errors.push(`Preparation must contain the ${required} batch`);
  }
  const batchIds = batches.map((batch) => batch.id);
  const duplicateBatches = batchIds.filter((id, index) => batchIds.indexOf(id) !== index);
  if (duplicateBatches.length) errors.push(`Preparation repeats a batch: ${[...new Set(duplicateBatches)].join(', ')}`);
  if (!batches.length) errors.push('Preparation contains no batches');
  const entries = batches.flatMap((batch) => batch.entries || []);
  const entryIds = entries.map((entry) => entry.skillId);
  if (new Set(entryIds).size !== entryIds.length) errors.push('Preparation repeats a skill');
  for (const skillId of expectedIds) if (!entryIds.includes(skillId)) errors.push(`Preparation misses ${skillId}`);
  for (const skillId of entryIds) if (!skillIds.has(skillId) || CURRENT_C0_SKILL_IDS.has(skillId)) errors.push(`Preparation contains an invalid future skill ${skillId}`);

  for (const batch of batches) {
    const batchEntries = batch.entries || [];
    if (batch.expectedObjectCount !== batchEntries.length * 24) errors.push(`${batch.id} object count does not match its prepared packs`);
    const episodeIds = batchEntries.flatMap((entry) => entry.episodeIds || []);
    if (new Set(episodeIds).size !== batch.expectedEpisodeCount) errors.push(`${batch.id} episode map does not match its planned episode count`);
    for (const entry of batchEntries) {
      if (!entry.workshopId?.startsWith('workshop.')) errors.push(`${entry.skillId} has no named workshop`);
      if (!entry.episodeIds?.length) errors.push(`${entry.skillId} has no episode/workshop map`);
      if (!entry.sourceIds?.length) errors.push(`${entry.skillId} has no prepared sources`);
      for (const sourceId of entry.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`${entry.skillId} has unknown prepared source ${sourceId}`);
      if (!entry.sourcePreparationStatus?.trim()) errors.push(`${entry.skillId} has no source-preparation status`);
    }
  }
  return { valid: errors.length === 0, errors, preparedPackCount: entries.length, preparedObjectCount: entries.length * 24 };
}
