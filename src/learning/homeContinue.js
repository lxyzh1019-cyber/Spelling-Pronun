// What the Home hero offers: the lesson this child already started, or the first one to start.
//
// It reads the same durable mirror the lesson page writes, so the hero cannot claim progress the
// lesson would not restore. A mirror for a different content version is ignored rather than trusted:
// the lesson itself would refuse it, and a hero promising "task 3 of 8" into a lesson that starts
// again at the beginning is a lie the child finds out in one tap.

import { parseLocalSession } from '../persistence/durableSession.js';
import { completedLessonTasks } from './lessonFlow.js';

export function lessonSessionKey(learnerId, sessionId) {
  return `spelling-lesson-v2:${learnerId}:${sessionId}`;
}

// `stage: 'teach'` is a lesson opened and not begun, and `complete` is one finished. Neither is
// something to resume, so both fall through to the next candidate.
const RESUMABLE = ['attempt', 'repair', 'transfer', 'feedback', 'worked_solution', 'reflection'];

export function continueTarget({ tiles = [], lessons = [], readRaw = () => null, learnerId = '' } = {}) {
  const byRoute = new Map(lessons.map((lesson) => [`/lesson/${lesson.sessionId}`, lesson]));
  for (const tile of tiles) {
    const lesson = byRoute.get(tile.to);
    if (!lesson) continue;
    const orderedItemIds = [...lesson.practice, ...lesson.transfer].map((entry) => entry.id);
    const state = parseLocalSession(readRaw(lessonSessionKey(learnerId, lesson.sessionId)), {
      id: lessonSessionKey(learnerId, lesson.sessionId),
      learnerId,
      mode: 'lesson',
      contentVersion: lesson.version || 0,
      orderedItemIds,
    });
    if (!state || !RESUMABLE.includes(state.stage)) continue;
    return {
      kind: 'resume',
      tile,
      completed: Math.min(completedLessonTasks(state, lesson.practice.length, lesson.transfer.length), orderedItemIds.length),
      total: orderedItemIds.length,
    };
  }
  return tiles.length ? { kind: 'start', tile: tiles[0], completed: 0, total: 0 } : null;
}

export function continueEyebrow(target) {
  if (!target) return '';
  return target.kind === 'resume'
    ? `DOT SAYS: YOU'RE ON TASK ${Math.min(target.completed + 1, target.total)} OF ${target.total}`
    : 'DOT SAYS: START HERE';
}

export function continueReassurance(target) {
  if (!target) return '';
  return target.kind === 'resume'
    ? 'Your earlier answers are kept.'
    : 'It teaches the rule first, then asks.';
}

export function continueCta(target) {
  return target?.kind === 'resume' ? 'KEEP GOING →' : 'START HERE →';
}
