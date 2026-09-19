import { c0PilotPacks } from './packs.c0.draft.js';
import { c1Packs } from './packs.c1.draft.js';
import { foundationPacks } from './packs.foundation.draft.js';
import { isQuarantined, usableItems } from '../learning/contentCorrections.js';

// Route ids for the four C0 lessons. These are pinned, not derived: a durable session, a bookmark and
// the learner's completion count are all keyed by session id, so deriving them would silently orphan
// every session in progress. New packs get a derived id (below), which is why this map does not grow.
const PINNED_SESSION_IDS = {
  'SP.patterns': 'pilot-sp-patterns',
  'SE.complete': 'pilot-se-complete',
  'PU.capitals-endmarks': 'pilot-pu-capitals',
  'GR.subject-object-pronouns': 'pilot-gr-pronouns',
};

// `c1.pack.vo.affixes` → `c1-vo-affixes`. Derived from the pack id so a new pack is routable the
// moment it exists. Before this, an unmapped skill produced `undefined` as a catalog key and every
// such pack collided on that one entry.
export function sessionIdForPack(pack) {
  return PINNED_SESSION_IDS[pack.skillId] || pack.id.replace(/\.pack\./, '-').replace(/\./g, '-');
}

// One sitting asks six independent questions. The pack holds ten, so a learner who repeats a lesson
// used to be re-asked the same six in the same order, which measures recall of that sitting rather than
// the skill. The window advances by the number of times this lesson has already been completed.
export const PRACTICE_PER_SITTING = 6;

const trackBySkillPrefix = {
  SP: 'spelling',
  GR: 'grammar',
  SE: 'sentences',
  PU: 'punctuation',
  VO: 'vocabulary',
  RC: 'reading',
  PH: 'phonics',
  PR: 'pronunciation',
  ED: 'editing',
};

// The approval gate. A lesson reaches a learner only when the content in it has been approved, which
// for this repo means every independent question is `pilot_approved` or `released`. Draft content is
// listed at /parent for review and is reachable nowhere else — that is the whole point of the
// lifecycle, and deriving visibility from the content means a newly approved pack appears without a
// code change while a draft one cannot appear by being forgotten about.
const APPROVED_STATUSES = ['pilot_approved', 'released'];

export function packIsLearnerVisible(pack) {
  const independent = (pack.items || []).filter((item) => item.role === 'independent');
  if (!independent.length) return false;
  return independent.every((item) => APPROVED_STATUSES.includes(item.releaseStatus));
}

function buildLesson(pack) {
  const sessionId = sessionIdForPack(pack);
  return [sessionId, {
    sessionId,
    packId: pack.id,
    version: pack.version,
    skillId: pack.skillId,
    title: pack.title,
    rule: pack.rule,
    batch: pack.batch || 'C0',
    // Where Alberta places this skill, when the pack says. The phonics packs carry it because Alberta
    // ends that organizing idea after Grade 4, and a learner should be told they are revisiting rather
    // than left to assume everything is at their grade.
    ...(pack.albertaPlacement ? { albertaPlacement: pack.albertaPlacement } : {}),
    ...(pack.curriculumOutcomeIds?.length ? { curriculumOutcomeIds: pack.curriculumOutcomeIds } : {}),
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
  }];
}

const ALL_PACKS = [...c0PilotPacks, ...c1Packs, ...foundationPacks];

// Every authored pack, approved or not. This is for the parent's review surface, never for a learner
// route: nothing here is gated, so anything reading it must gate for itself.
export const allLessonCatalog = Object.fromEntries(ALL_PACKS.map(buildLesson));

// What a learner can actually open. Today that is the four approved C0 packs; it becomes more the
// moment the parent approves something, with no code change.
export const c0LessonCatalog = Object.fromEntries(ALL_PACKS.filter(packIsLearnerVisible).map(buildLesson));

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

// The tiles a learner sees, derived from the catalog rather than hand-written. `Home.jsx` held a
// hardcoded four-element array, so an approved pack would have needed a code change to be openable —
// which is how content gets built and then quietly never used.
const TILE_STYLE = {
  'SP.patterns': { icon: '✏️', color: '#2563eb' },
  'SE.complete': { icon: '🧩', color: '#059669' },
  'PU.capitals-endmarks': { icon: '✒️', color: '#d97706' },
  'GR.subject-object-pronouns': { icon: '🔤', color: '#7c3aed' },
  VO: { icon: '📖', color: '#0891b2' },
  RC: { icon: '🔍', color: '#be123c' },
  PH: { icon: '🔊', color: '#ca8a04' },
  default: { icon: '📚', color: '#475569' },
};

export function learnerLessonTiles() {
  return Object.values(c0LessonCatalog).map((lesson) => {
    const style = TILE_STYLE[lesson.skillId] || TILE_STYLE[lesson.skillId.split('.')[0]] || TILE_STYLE.default;
    return {
      to: `/lesson/${lesson.sessionId}`,
      label: lesson.title,
      // The rule is the lesson's own sentence; a tile shows its first clause rather than a second
      // description somebody has to keep in step with it.
      desc: lesson.rule.split(/[.;]/)[0].trim(),
      // What a child is told about where this sits. Absent unless the pack says, because inventing a
      // grade for a lesson that never claimed one is exactly the false confidence to avoid.
      ...(lesson.albertaPlacement ? { placement: lesson.albertaPlacement.albertaGrades } : {}),
      ...style,
    };
  });
}
