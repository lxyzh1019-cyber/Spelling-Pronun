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
      if (pack.status !== 'independently_challenged') errors.push(`${label} promotion does not match pack status`);
      if (pack.items.some((item) => item.reviewStatus !== 'independently_challenged')) errors.push(`${label} promotion does not match item status`);
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
      if (assessment.status !== 'independently_challenged') errors.push(`${label} promotion does not match assessment status`);
      if (assessment.items.some((item) => item.reviewStatus !== 'independently_challenged')) errors.push(`${label} promotion does not match item status`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export { REQUIRED_CHALLENGE_DIMENSIONS };
