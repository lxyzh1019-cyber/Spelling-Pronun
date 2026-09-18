import { c0PilotPacks } from './packs.c0.draft.js';
import { isQuarantined, usableItems } from '../learning/contentCorrections.js';

const sessionIds = {
  'SP.patterns': 'pilot-sp-patterns',
  'SE.complete': 'pilot-se-complete',
  'PU.capitals-endmarks': 'pilot-pu-capitals',
  'GR.subject-object-pronouns': 'pilot-gr-pronouns',
};

// One sitting asks six independent questions. The pack holds ten, so a learner who repeats a lesson
// used to be re-asked the same six in the same order, which measures recall of that sitting rather than
// the skill. The window advances by the number of times this lesson has already been completed.
export const PRACTICE_PER_SITTING = 6;

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
  // Guided items are `instruction_only`: they teach, and answering one is never independent evidence.
  // Before, nothing consumed them at all, so six of every pack's twenty-four objects were unreachable.
  // They are shown with their explanations during the teach stage as additional worked examples, which
  // is what `instruction_only` content is for. No attempt is recorded from them.
  guided: usableItems(pack.items.filter((item) => item.role === 'guided')),
  // The full independent pool. A single sitting serves a six-item window of it; see `lessonForSitting`.
  // A quarantined item is skipped and the next unaffected independent item takes its place, so the
  // lesson keeps its six questions instead of silently teaching a defective one.
  practicePool: usableItems(pack.items.filter((item) => item.role === 'independent')),
  practice: usableItems(pack.items.filter((item) => item.role === 'independent')).slice(0, PRACTICE_PER_SITTING),
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

// The lesson as served for a given sitting: the same teaching, a rotated window of independent
// questions. `sitting` is how many times this learner has already completed this lesson. The window
// wraps, and it never returns fewer than the available pool, so a small or heavily quarantined pool
// still yields a full lesson rather than an empty one.
export function lessonForSitting(lesson, sitting = 0) {
  if (!lesson) return null;
  const pool = lesson.practicePool || lesson.practice || [];
  if (pool.length <= PRACTICE_PER_SITTING) return { ...lesson, practice: pool, sitting: 0 };
  const rounds = Math.max(1, Math.ceil(pool.length / PRACTICE_PER_SITTING));
  const index = ((Number(sitting) || 0) % rounds + rounds) % rounds;
  const start = (index * PRACTICE_PER_SITTING) % pool.length;
  const window = [];
  for (let i = 0; i < PRACTICE_PER_SITTING; i += 1) window.push(pool[(start + i) % pool.length]);
  return { ...lesson, practice: window, sitting: index };
}

export function previewLessonForTrack(track) {
  const entry = Object.values(c0LessonCatalog).find((lesson) => trackBySkillPrefix[lesson.skillId.split('.')[0]] === track);
  return entry || null;
}
