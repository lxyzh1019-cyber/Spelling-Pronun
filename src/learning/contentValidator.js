const REQUIRED_ITEM_FIELDS = ['id', 'version', 'primarySkill', 'role', 'difficulty', 'prompt', 'responseType', 'evaluator', 'explanation', 'helpSteps', 'evidenceEligibility', 'transferGroup', 'authorStatus', 'reviewStatus', 'releaseStatus'];
const REQUIRED_AUDIO_ASSET_FIELDS = ['id', 'version', 'url', 'transcript', 'locale', 'reviewStatus'];

function validateAudioAssets(audioAssets, errors) {
  const audioIds = audioAssets.map((asset) => asset.id);
  const duplicates = audioIds.filter((id, index) => audioIds.indexOf(id) !== index);
  if (duplicates.length) errors.push(`Duplicate audio asset IDs: ${[...new Set(duplicates)].join(', ')}`);
  for (const asset of audioAssets) {
    const missing = REQUIRED_AUDIO_ASSET_FIELDS.filter((field) => asset[field] === undefined || asset[field] === null || asset[field] === '');
    if (missing.length) errors.push(`${asset.id || 'unknown audio asset'} missing ${missing.join(', ')}`);
    if (asset.locale !== 'en-CA' && !asset.localeDisclosure?.trim()) errors.push(`${asset.id} has a non-Canadian locale without a learner-facing disclosure`);
    if (!['pending', 'reviewed'].includes(asset.reviewStatus)) errors.push(`${asset.id} has invalid audio review status`);
  }
}

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
  const audioById = new Map(audioAssets.map((asset) => [asset.id, asset]));
  validateAudioAssets(audioAssets, errors);
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
    const audioAsset = item.audioRef ? audioById.get(item.audioRef) : null;
    if (item.audioStatus === 'reviewed_human' && !item.audioRef) errors.push(`${item.id} claims reviewed human audio without an audio reference`);
    if (item.audioStatus === 'reviewed_human' && audioAsset?.reviewStatus !== 'reviewed') errors.push(`${item.id} claims reviewed human audio without a reviewed audio asset`);
    if (item.audioStatus === 'reviewed_human' && item.spokenText && audioAsset?.transcript !== item.spokenText) errors.push(`${item.id} reviewed audio transcript does not match its spoken text`);
    if (item.responseType === 'recording' && item.evaluator !== 'human_rubric') errors.push(`${item.id} recording must use human review`);
    if (item.reviewStatus === 'reviewed') {
      if (item.authorStatus !== 'reviewed') errors.push(`${item.id} is reviewed without reviewed author status`);
      if (String(item.evidenceEligibility).includes('fixture') || String(item.evidenceEligibility).includes('draft')) errors.push(`${item.id} has non-release evidence eligibility`);
      if (item.audioStatus === 'synthetic_preview') errors.push(`${item.id} cannot release synthetic preview audio`);
      if (item.spokenText && item.audioStatus !== 'reviewed_human') errors.push(`${item.id} marks spoken content reviewed without reviewed human audio`);
    }
    if (item.integrationStatus === 'integrated' && (item.authorStatus !== 'reviewed' || item.reviewStatus !== 'reviewed')) errors.push(`${item.id} is integrated without completed educational review`);
    if (item.releaseStatus === 'released') {
      if (item.authorStatus !== 'reviewed' || item.reviewStatus !== 'reviewed') errors.push(`${item.id} is released without completed author and educational review`);
      if (item.integrationStatus !== 'integrated') errors.push(`${item.id} is released without completed integration`);
      if (String(item.evidenceEligibility).includes('fixture') || String(item.evidenceEligibility).includes('draft')) errors.push(`${item.id} releases ineligible evidence`);
      if (item.audioStatus === 'synthetic_preview') errors.push(`${item.id} releases synthetic preview audio`);
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
    if (episode.integrationStatus === 'integrated' && (episode.authorStatus !== 'reviewed' || episode.reviewStatus !== 'reviewed')) errors.push(`${episode.id} is integrated without completed educational review`);
    if (episode.releaseStatus === 'released' && episode.integrationStatus !== 'integrated') errors.push(`${episode.id} is released without completed integration`);
  }
  return { valid: errors.length === 0, errors };
}
