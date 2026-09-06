const REQUIRED_ITEM_FIELDS = ['id', 'version', 'primarySkill', 'role', 'difficulty', 'prompt', 'responseType', 'evaluator', 'explanation', 'helpSteps', 'evidenceEligibility', 'transferGroup', 'authorStatus', 'reviewStatus'];

function hasPrerequisiteCycle(skills) {
  const graph = new Map(skills.map((skill) => [skill.id, skill.prerequisites || []]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of graph.get(id) || []) if (visit(dependency)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  return [...graph.keys()].some(visit);
}

export function validateContent({ skills = [], items = [], episodes = [], assessments = [], sources = [], audioAssets = [] }) {
  const errors = [];
  const allIds = [...skills, ...items, ...episodes, ...assessments].map(({ id }) => id);
  const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  if (duplicates.length) errors.push(`Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
  const skillIds = new Set(skills.map(({ id }) => id));
  const sourceIds = new Set(sources.map(({ id }) => id));
  const audioIds = new Set(audioAssets.map(({ id }) => id));
  if (hasPrerequisiteCycle(skills)) errors.push('Skill prerequisites contain a cycle');
  for (const skill of skills) for (const prerequisite of skill.prerequisites || []) if (!skillIds.has(prerequisite)) errors.push(`${skill.id} has unknown prerequisite ${prerequisite}`);
  for (const item of items) {
    const missing = REQUIRED_ITEM_FIELDS.filter((field) => item[field] === undefined || item[field] === null);
    if (missing.length) errors.push(`${item.id || 'unknown item'} missing ${missing.join(', ')}`);
    if (!skillIds.has(item.primarySkill)) errors.push(`${item.id} has unknown primary skill ${item.primarySkill}`);
    for (const secondary of item.secondarySkills || []) if (!skillIds.has(secondary)) errors.push(`${item.id} has unknown secondary skill ${secondary}`);
    if (!item.acceptedAnswers?.length && !item.rubric) errors.push(`${item.id} has no answer or rubric`);
    if (item.sourceRequired && !item.sourceIds?.length) errors.push(`${item.id} is missing required sources`);
    for (const sourceId of item.sourceIds || []) if (sources.length && !sourceIds.has(sourceId)) errors.push(`${item.id} has unknown source ${sourceId}`);
    if (item.audioRef && !audioIds.has(item.audioRef)) errors.push(`${item.id} has broken audio reference ${item.audioRef}`);
    if (item.responseType === 'recording' && item.evaluator !== 'human_rubric') errors.push(`${item.id} recording must use human review`);
    if (item.reviewStatus === 'reviewed') {
      if (item.authorStatus !== 'reviewed') errors.push(`${item.id} is reviewed without reviewed author status`);
      if (String(item.evidenceEligibility).includes('fixture') || String(item.evidenceEligibility).includes('draft')) errors.push(`${item.id} has non-release evidence eligibility`);
      if (item.audioStatus === 'synthetic_preview') errors.push(`${item.id} cannot release synthetic preview audio`);
    }
  }
  const lessonIds = new Set(items.map(({ id }) => id));
  for (const assessment of assessments) for (const itemId of assessment.itemIds || []) if (lessonIds.has(itemId)) errors.push(`${assessment.id} overlaps lesson pool at ${itemId}`);
  for (const episode of episodes) {
    if (!episode.taskIds?.length) errors.push(`${episode.id} has no reachable tasks`);
    for (const taskId of episode.taskIds || []) if (!lessonIds.has(taskId)) errors.push(`${episode.id} has unknown task ${taskId}`);
    if (episode.historical && (episode.sourceIds?.length || 0) < 2) errors.push(`${episode.id} needs at least two historical sources`);
    for (const sourceId of episode.sourceIds || []) if (sources.length && !sourceIds.has(sourceId)) errors.push(`${episode.id} has unknown source ${sourceId}`);
    if (episode.status === 'released' && !episode.fictionLabel) errors.push(`${episode.id} is released without a fiction label`);
  }
  return { valid: errors.length === 0, errors };
}
