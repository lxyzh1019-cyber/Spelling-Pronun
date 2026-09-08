import { c0PilotPacks } from './packs.c0.draft.js';
import { isQuarantined, usableItems } from '../learning/contentCorrections.js';

const sessionIds = {
  'SP.patterns': 'pilot-sp-patterns',
  'SE.complete': 'pilot-se-complete',
  'PU.capitals-endmarks': 'pilot-pu-capitals',
  'GR.subject-object-pronouns': 'pilot-gr-pronouns',
};

const trackBySkillPrefix = {
  SP: 'spelling',
  GR: 'grammar',
  SE: 'sentences',
  PU: 'punctuation',
};

export const c0LessonCatalog = Object.fromEntries(c0PilotPacks.map((pack) => [sessionIds[pack.skillId], {
  sessionId: sessionIds[pack.skillId],
  packId: pack.id,
  version: pack.version,
  skillId: pack.skillId,
  title: pack.title,
  rule: pack.rule,
  ...(pack.ruleHelpZh ? { ruleHelpZh: pack.ruleHelpZh } : {}),
  examples: usableItems(pack.items.filter((item) => item.role === 'worked_example')),
  // A quarantined item is skipped and the next unaffected independent item takes its place, so the
  // lesson keeps its six questions instead of silently teaching a defective one.
  practice: usableItems(pack.items.filter((item) => item.role === 'independent')).slice(0, 6),
  transfer: usableItems(pack.items.filter((item) => item.role === 'transfer')),
  quarantinedCount: pack.items.filter(isQuarantined).length,
  reflectionChoices: [
    `I found the part controlled by ${pack.skillId}.`,
    'I compared the choices with the rule.',
    'I used the help steps and then tried a new example.',
  ],
}]));

export function lessonBySessionId(sessionId) {
  return c0LessonCatalog[sessionId] || null;
}

export function previewLessonForTrack(track) {
  const entry = Object.values(c0LessonCatalog).find((lesson) => trackBySkillPrefix[lesson.skillId.split('.')[0]] === track);
  return entry || null;
}
