const REQUIRED_CHALLENGE_DIMENSIONS = [
  'answer_or_rubric',
  'reasonable_alternatives',
  'distractors',
  'explanation',
  'help_steps',
  'reading_load',
  'assessment_or_story_leak',
  'transfer_distinctness',
];

export function validateContentReviews({ reviews = [], packs = [], sources = [] }) {
  const errors = [];
  const packById = new Map(packs.map((pack) => [pack.id, pack]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const reviewIds = reviews.map((review) => review.id);
  const duplicateReviewIds = reviewIds.filter((id, index) => reviewIds.indexOf(id) !== index);
  if (duplicateReviewIds.length) errors.push(`Duplicate review IDs: ${[...new Set(duplicateReviewIds)].join(', ')}`);

  for (const review of reviews) {
    const label = review.id || 'unknown review';
    const pack = packById.get(review.packId);
    if (!pack) {
      errors.push(`${label} targets unknown pack ${review.packId}`);
      continue;
    }
    if (review.packVersion !== pack.version) errors.push(`${label} targets pack version ${review.packVersion}, current version is ${pack.version}`);
    if (review.skillId !== pack.skillId) errors.push(`${label} skill does not match ${pack.id}`);
    for (const sourceId of review.sourceIds || []) if (sources.length && !sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);

    if (review.stage !== 'independent_challenge') errors.push(`${label} has unsupported stage ${review.stage}`);
    if (review.status !== 'complete') errors.push(`${label} is not complete`);
    for (const dimension of REQUIRED_CHALLENGE_DIMENSIONS) {
      if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    }

    const results = review.results || [];
    const resultIds = results.map((result) => result.itemId);
    const duplicateResultIds = resultIds.filter((id, index) => resultIds.indexOf(id) !== index);
    if (duplicateResultIds.length) errors.push(`${label} repeats item results: ${[...new Set(duplicateResultIds)].join(', ')}`);
    const expectedIds = pack.items.map((item) => item.id);
    const missing = expectedIds.filter((id) => !resultIds.includes(id));
    const extra = resultIds.filter((id) => !expectedIds.includes(id));
    if (missing.length) errors.push(`${label} misses items: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown items: ${extra.join(', ')}`);

    for (const result of results) {
      const item = pack.items.find((candidate) => candidate.id === result.itemId);
      if (item && result.itemVersion !== item.version) errors.push(`${label} has stale version for ${result.itemId}`);
      if (!['pass', 'flag'].includes(result.outcome)) errors.push(`${label} has invalid outcome for ${result.itemId}`);
      if (!result.note?.trim()) errors.push(`${label} has no result note for ${result.itemId}`);
    }

    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (review.promotion === 'independently_challenged') {
      if (results.some((result) => result.outcome !== 'pass')) errors.push(`${label} promotes with a non-passing item`);
      if (unresolved.length) errors.push(`${label} promotes with unresolved discrepancies`);
      if (!['independently_challenged', 'educational_source_reviewed', 'integrated', 'learner_tested', 'released'].includes(pack.status)) errors.push(`${label} promotion is not reflected in pack status`);
      if (pack.items.some((item) => !['independently_challenged', 'reviewed'].includes(item.reviewStatus))) errors.push(`${label} promotion is not reflected in item status`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAssessmentReviews({ reviews = [], assessments = [], sources = [] }) {
  const errors = [];
  const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const reviewIds = reviews.map((review) => review.id);
  const duplicateReviewIds = reviewIds.filter((id, index) => reviewIds.indexOf(id) !== index);
  if (duplicateReviewIds.length) errors.push(`Duplicate assessment review IDs: ${[...new Set(duplicateReviewIds)].join(', ')}`);

  for (const review of reviews) {
    const label = review.id || 'unknown assessment review';
    const assessment = assessmentById.get(review.assessmentId);
    if (!assessment) {
      errors.push(`${label} targets unknown assessment ${review.assessmentId}`);
      continue;
    }
    if (review.assessmentVersion !== assessment.version) errors.push(`${label} targets assessment version ${review.assessmentVersion}, current version is ${assessment.version}`);
    if (review.form !== assessment.form) errors.push(`${label} form does not match ${assessment.id}`);
    for (const sourceId of review.sourceIds || []) if (sources.length && !sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);
    if (review.stage !== 'independent_challenge' || review.status !== 'complete') errors.push(`${label} challenge is not complete`);
    for (const dimension of [...REQUIRED_CHALLENGE_DIMENSIONS, 'audio_dependency', 'form_equivalence']) {
      if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    }

    const results = review.results || [];
    const resultIds = results.map((result) => result.itemId);
    const duplicateResultIds = resultIds.filter((id, index) => resultIds.indexOf(id) !== index);
    if (duplicateResultIds.length) errors.push(`${label} repeats item results: ${[...new Set(duplicateResultIds)].join(', ')}`);
    const expectedIds = assessment.items.map((item) => item.id);
    const missing = expectedIds.filter((id) => !resultIds.includes(id));
    const extra = resultIds.filter((id) => !expectedIds.includes(id));
    if (missing.length) errors.push(`${label} misses items: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown items: ${extra.join(', ')}`);
    for (const result of results) {
      const item = assessment.items.find((candidate) => candidate.id === result.itemId);
      if (item && result.itemVersion !== item.version) errors.push(`${label} has stale version for ${result.itemId}`);
      if (!['pass', 'flag'].includes(result.outcome)) errors.push(`${label} has invalid outcome for ${result.itemId}`);
      if (!result.note?.trim()) errors.push(`${label} has no result note for ${result.itemId}`);
    }

    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (review.promotion === 'independently_challenged') {
      if (results.some((result) => result.outcome !== 'pass')) errors.push(`${label} promotes with a non-passing item`);
      if (unresolved.length) errors.push(`${label} promotes with unresolved discrepancies`);
      if (!['independently_challenged', 'partial_educational_source_review', 'educational_source_reviewed', 'integrated', 'learner_tested', 'released'].includes(assessment.status)) errors.push(`${label} promotion is not reflected in assessment status`);
      if (assessment.items.some((item) => !['independently_challenged', 'reviewed'].includes(item.reviewStatus))) errors.push(`${label} promotion is not reflected in item status`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateStoryReviews({ reviews = [], story, items = [], sources = [] }) {
  const errors = [];
  const episodeById = new Map((story?.episodes || []).map((episode) => [episode.id, episode]));
  const itemIds = new Set(items.map((item) => item.id));
  const sourceIds = new Set(sources.map((source) => source.id));
  const requiredDimensions = ['historical_claims', 'source_mapping', 'fact_fiction_boundary', 'task_reachability', 'answer_leak', 'reading_load', 'decision_consequence', 'episode_progression'];
  for (const review of reviews) {
    const label = review.id || 'unknown story review';
    if (review.storyVersion !== story?.version) errors.push(`${label} targets stale story version`);
    if (review.chapter !== story?.chapter) errors.push(`${label} targets the wrong chapter`);
    if (review.stage !== 'independent_challenge' || review.status !== 'complete') errors.push(`${label} challenge is not complete`);
    for (const dimension of requiredDimensions) if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    for (const sourceId of review.sourceIds || []) if (sources.length && !sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);
    const results = review.results || [];
    const resultIds = results.map((result) => result.episodeId);
    const expectedIds = [...episodeById.keys()];
    const missing = expectedIds.filter((id) => !resultIds.includes(id));
    const extra = resultIds.filter((id) => !episodeById.has(id));
    if (new Set(resultIds).size !== resultIds.length) errors.push(`${label} repeats an episode result`);
    if (missing.length) errors.push(`${label} misses episodes: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown episodes: ${extra.join(', ')}`);
    for (const result of results) {
      const episode = episodeById.get(result.episodeId);
      if (episode && result.episodeVersion !== episode.version) errors.push(`${label} has stale version for ${result.episodeId}`);
      if (!['pass', 'flag'].includes(result.outcome)) errors.push(`${label} has invalid outcome for ${result.episodeId}`);
      if (!result.note?.trim()) errors.push(`${label} has no result note for ${result.episodeId}`);
    }
    for (const episode of story?.episodes || []) {
      for (const taskId of episode.taskIds || []) if (!itemIds.has(taskId)) errors.push(`${episode.id} links unknown task ${taskId}`);
    }
    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (review.promotion === 'independently_challenged') {
      if (results.some((result) => result.outcome !== 'pass')) errors.push(`${label} promotes with a non-passing episode`);
      if (unresolved.length) errors.push(`${label} promotes with unresolved discrepancies`);
      if (!['independently_challenged', 'educational_source_reviewed', 'integrated', 'learner_tested', 'released'].includes(story?.status)) errors.push(`${label} promotion is not reflected in story status`);
      if ([...episodeById.values()].some((episode) => !['independently_challenged', 'reviewed'].includes(episode.reviewStatus))) errors.push(`${label} promotion is not reflected in episode status`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateEducationalPackReviews({ reviews = [], challengeReviews = [], packs = [], sources = [] }) {
  const errors = [];
  const packById = new Map(packs.map((pack) => [pack.id, pack]));
  const challengeById = new Map(challengeReviews.map((review) => [review.id, review]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const reviewIds = reviews.map((review) => review.id);
  if (new Set(reviewIds).size !== reviewIds.length) errors.push('Educational review IDs must be unique');
  const reviewedPackIds = reviews.map((review) => review.packId);
  if (new Set(reviewedPackIds).size !== reviewedPackIds.length) errors.push('Each pack may have only one current educational review');

  for (const review of reviews) {
    const label = review.id || 'unknown educational review';
    const pack = packById.get(review.packId);
    if (!pack) {
      errors.push(`${label} targets unknown pack ${review.packId}`);
      continue;
    }
    const challenge = challengeById.get(review.challengeReviewId);
    if (!challenge || challenge.packId !== pack.id || challenge.status !== 'complete') errors.push(`${label} has no completed challenge for ${pack.id}`);
    if (review.packVersion !== pack.version) errors.push(`${label} targets stale pack version`);
    if (review.skillId !== pack.skillId) errors.push(`${label} skill does not match ${pack.id}`);
    if (review.stage !== 'educational_source_review' || review.status !== 'complete') errors.push(`${label} educational review is not complete`);
    if (review.releaseDecision !== 'reviewed_not_released') errors.push(`${label} must record the reviewed-not-released decision`);
    for (const dimension of ['curriculum_alignment', 'rule_accuracy', 'answer_accuracy', 'feedback_quality', 'source_mapping', 'age_accessibility']) {
      if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    }
    for (const sourceId of review.sourceIds || []) if (!sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);
    const mappedSources = new Set(review.sourceIds || []);
    for (const sourceId of pack.sourceIds || []) if (!mappedSources.has(sourceId)) errors.push(`${label} omits pack source ${sourceId}`);
    const itemIds = review.itemIds || [];
    if (new Set(itemIds).size !== itemIds.length) errors.push(`${label} repeats an item in its reviewed range`);
    const expectedIds = pack.items.map((item) => item.id);
    const missing = expectedIds.filter((id) => !itemIds.includes(id));
    const extra = itemIds.filter((id) => !expectedIds.includes(id));
    if (missing.length) errors.push(`${label} misses items: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown items: ${extra.join(', ')}`);
    if (review.outcome !== 'pass') errors.push(`${label} does not have a passing outcome`);
    if (!review.findings?.trim()) errors.push(`${label} has no recorded findings`);
    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (unresolved.length) errors.push(`${label} has unresolved discrepancies`);
    if (!['educational_source_reviewed', 'integrated', 'learner_tested', 'released'].includes(pack.status)) errors.push(`${label} promotion is not reflected in pack status`);
    if (pack.items.some((item) => item.authorStatus !== 'reviewed' || item.reviewStatus !== 'reviewed')) errors.push(`${label} promotion is not reflected in item review state`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateEducationalStoryReviews({ reviews = [], challengeReviews = [], story, items = [], sources = [] }) {
  const errors = [];
  const episodeById = new Map((story?.episodes || []).map((episode) => [episode.id, episode]));
  const challengeById = new Map(challengeReviews.map((review) => [review.id, review]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const itemIds = new Set(items.map((item) => item.id));
  const reviewIds = reviews.map((review) => review.id);
  if (new Set(reviewIds).size !== reviewIds.length) errors.push('Educational story review IDs must be unique');

  for (const review of reviews) {
    const label = review.id || 'unknown educational story review';
    const challenge = challengeById.get(review.challengeReviewId);
    if (!challenge || challenge.storyVersion !== story?.version || challenge.chapter !== story?.chapter || challenge.status !== 'complete') errors.push(`${label} has no completed challenge for this story`);
    if (review.storyVersion !== story?.version) errors.push(`${label} targets stale story version`);
    if (review.chapter !== story?.chapter) errors.push(`${label} targets the wrong chapter`);
    if (review.stage !== 'educational_source_review' || review.status !== 'complete') errors.push(`${label} educational review is not complete`);
    if (review.releaseDecision !== 'reviewed_not_released') errors.push(`${label} must record the reviewed-not-released decision`);
    for (const dimension of ['historical_accuracy', 'source_mapping', 'fact_fiction_boundary', 'reading_accessibility', 'task_alignment', 'narrative_coherence']) {
      if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    }
    const mappedSources = new Set(review.sourceIds || []);
    for (const sourceId of mappedSources) if (!sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);
    for (const episode of episodeById.values()) {
      for (const sourceId of episode.sourceIds || []) {
        if (!sourceIds.has(sourceId)) errors.push(`${episode.id} has unknown source ${sourceId}`);
        if (!mappedSources.has(sourceId)) errors.push(`${label} omits episode source ${sourceId}`);
      }
      for (const taskId of episode.taskIds || []) if (!itemIds.has(taskId)) errors.push(`${episode.id} links unknown task ${taskId}`);
    }
    const results = review.results || [];
    const resultIds = results.map((result) => result.episodeId);
    const expectedIds = [...episodeById.keys()];
    if (new Set(resultIds).size !== resultIds.length) errors.push(`${label} repeats an episode result`);
    const missing = expectedIds.filter((id) => !resultIds.includes(id));
    const extra = resultIds.filter((id) => !episodeById.has(id));
    if (missing.length) errors.push(`${label} misses episodes: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown episodes: ${extra.join(', ')}`);
    for (const result of results) {
      const episode = episodeById.get(result.episodeId);
      if (episode && result.episodeVersion !== episode.version) errors.push(`${label} has stale version for ${result.episodeId}`);
      if (result.outcome !== 'pass') errors.push(`${label} does not have a passing outcome for ${result.episodeId}`);
      if (!result.note?.trim()) errors.push(`${label} has no result note for ${result.episodeId}`);
    }
    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (unresolved.length) errors.push(`${label} has unresolved discrepancies`);
    if (!['educational_source_reviewed', 'integrated', 'learner_tested', 'released'].includes(story?.status)) errors.push(`${label} promotion is not reflected in story status`);
    if ([...episodeById.values()].some((episode) => episode.authorStatus !== 'reviewed' || episode.reviewStatus !== 'reviewed')) errors.push(`${label} promotion is not reflected in episode review state`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateEducationalAssessmentReviews({ reviews = [], challengeReviews = [], assessments = [], sources = [] }) {
  const errors = [];
  const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
  const challengeById = new Map(challengeReviews.map((review) => [review.id, review]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const reviewIds = reviews.map((review) => review.id);
  if (new Set(reviewIds).size !== reviewIds.length) errors.push('Educational assessment review IDs must be unique');

  for (const review of reviews) {
    const label = review.id || 'unknown educational assessment review';
    const assessment = assessmentById.get(review.assessmentId);
    if (!assessment) {
      errors.push(`${label} targets unknown assessment ${review.assessmentId}`);
      continue;
    }
    const challenge = challengeById.get(review.challengeReviewId);
    if (!challenge || challenge.assessmentId !== assessment.id || challenge.status !== 'complete') errors.push(`${label} has no completed challenge for ${assessment.id}`);
    if (review.assessmentVersion !== assessment.version) errors.push(`${label} targets stale assessment version`);
    if (review.form !== assessment.form) errors.push(`${label} form does not match ${assessment.id}`);
    if (review.stage !== 'partial_educational_source_review' || review.status !== 'complete') errors.push(`${label} partial educational review is not complete`);
    if (review.releaseDecision !== 'partial_reviewed_not_released') errors.push(`${label} must record the partial-reviewed-not-released decision`);
    for (const dimension of ['curriculum_alignment', 'answer_accuracy', 'rubric_clarity', 'feedback_quality', 'source_mapping', 'age_accessibility', 'release_blockers']) {
      if (!review.dimensions?.includes(dimension)) errors.push(`${label} did not record ${dimension}`);
    }
    const mappedSources = new Set(review.sourceIds || []);
    for (const sourceId of mappedSources) if (!sourceIds.has(sourceId)) errors.push(`${label} has unknown source ${sourceId}`);
    for (const item of assessment.items) for (const sourceId of item.sourceIds || []) if (!mappedSources.has(sourceId)) errors.push(`${label} omits assessment source ${sourceId}`);
    const reviewedIds = review.reviewedItemIds || [];
    const blockedIds = review.blockedItemIds || [];
    const expectedIds = assessment.items.map((item) => item.id);
    if (new Set(reviewedIds).size !== reviewedIds.length) errors.push(`${label} repeats a reviewed item`);
    if (new Set(blockedIds).size !== blockedIds.length) errors.push(`${label} repeats a blocked item`);
    if (reviewedIds.some((id) => blockedIds.includes(id))) errors.push(`${label} overlaps reviewed and blocked items`);
    const recordedIds = [...reviewedIds, ...blockedIds];
    const missing = expectedIds.filter((id) => !recordedIds.includes(id));
    const extra = recordedIds.filter((id) => !expectedIds.includes(id));
    if (missing.length) errors.push(`${label} misses items: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} includes unknown items: ${extra.join(', ')}`);
    const blockedByGroup = (review.blockedGroups || []).flatMap((group) => group.itemIds || []);
    if (new Set(blockedByGroup).size !== blockedByGroup.length || blockedIds.some((id) => !blockedByGroup.includes(id)) || blockedByGroup.some((id) => !blockedIds.includes(id))) errors.push(`${label} blocked groups do not exactly explain blocked items`);
    if ((review.blockedGroups || []).some((group) => !group.blocker?.trim())) errors.push(`${label} has a blocked group without a reason`);
    for (const item of assessment.items) {
      if (reviewedIds.includes(item.id) && (item.authorStatus !== 'reviewed' || item.reviewStatus !== 'reviewed')) errors.push(`${label} does not reflect reviewed state for ${item.id}`);
      if (blockedIds.includes(item.id) && item.reviewStatus !== 'independently_challenged') errors.push(`${label} does not preserve challenge-only state for ${item.id}`);
      if (item.releaseStatus === 'released') errors.push(`${label} cannot release ${item.id}`);
    }
    if (!review.findings?.trim()) errors.push(`${label} has no recorded findings`);
    const unresolved = (review.discrepancies || []).filter((discrepancy) => discrepancy.status !== 'resolved');
    if (unresolved.length) errors.push(`${label} has unresolved discrepancies`);
    if (assessment.status !== 'partial_educational_source_review') errors.push(`${label} promotion is not reflected in assessment status`);
  }
  return { valid: errors.length === 0, errors };
}

export { REQUIRED_CHALLENGE_DIMENSIONS };
