const REQUIRED_ROLES = { worked_example: 2, guided: 6, independent: 10, transfer: 2, delayed_review: 4 };

export function buildContentManifest({ skills = [], packs = [], assessmentForms = [], episodes = [] }) {
  const errors = [];
  const skillIds = new Set(skills.map((skill) => skill.id));
  const packSkills = packs.map((pack) => pack.skillId);
  if (new Set(packSkills).size !== packSkills.length) errors.push('Multiple packs target the same primary skill');
  for (const pack of packs) {
    if (!skillIds.has(pack.skillId)) errors.push(`${pack.id} targets unknown skill ${pack.skillId}`);
    if (pack.items.length !== 24) errors.push(`${pack.id} has ${pack.items.length}/24 objects`);
    for (const [role, expected] of Object.entries(REQUIRED_ROLES)) {
      const actual = pack.items.filter((item) => item.role === role).length;
      if (actual !== expected) errors.push(`${pack.id} has ${actual}/${expected} ${role} objects`);
    }
  }
  if (assessmentForms.length && (assessmentForms.length !== 2 || assessmentForms.some((form) => form.items.length !== 34))) errors.push('Assessment requires exactly two 34-prompt forms');
  const counts = {
    skills: skills.length,
    packs: packs.length,
    contentObjects: packs.reduce((sum, pack) => sum + pack.items.length, 0),
    assessmentPrompts: assessmentForms.reduce((sum, form) => sum + form.items.length, 0),
    episodes: episodes.length,
    mappedSkills: new Set(packSkills).size,
    challengedObjects: packs.flatMap((pack) => pack.items).filter((item) => ['independently_challenged', 'reviewed'].includes(item.reviewStatus)).length,
    reviewedObjects: packs.flatMap((pack) => pack.items).filter((item) => item.reviewStatus === 'reviewed').length,
    challengedAssessmentPrompts: assessmentForms.flatMap((form) => form.items).filter((item) => ['independently_challenged', 'reviewed'].includes(item.reviewStatus)).length,
    reviewedAssessmentPrompts: assessmentForms.flatMap((form) => form.items).filter((item) => item.reviewStatus === 'reviewed').length,
  };
  return {
    counts,
    errors,
    r2InventoryComplete: counts.packs >= 4 && counts.contentObjects >= 96 && counts.assessmentPrompts === 68 && counts.episodes >= 2,
    r3InventoryComplete: counts.skills === 42 && counts.packs === 42 && counts.contentObjects === 1008 && counts.assessmentPrompts === 68 && counts.episodes === 12,
    releaseReady: errors.length === 0 && counts.reviewedObjects === counts.contentObjects && counts.reviewedAssessmentPrompts === counts.assessmentPrompts && counts.episodes > 0 && episodes.every((episode) => episode.status === 'released'),
  };
}
