// The Home hero offers a lesson to continue. It reads the lesson's own durable mirror, so it cannot
// promise progress the lesson would not restore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { continueCta, continueEyebrow, continueReassurance, continueTarget, lessonSessionKey } from '../src/learning/homeContinue.js';
import { nextStoryEpisode } from '../src/learning/storyProgress.js';

const lesson = (sessionId, version = 2) => ({
  sessionId,
  version,
  practice: [{ id: `${sessionId}-p1` }, { id: `${sessionId}-p2` }],
  transfer: [{ id: `${sessionId}-t1` }],
});
const lessons = [lesson('pilot-sp-patterns'), lesson('pilot-se-complete')];
const tiles = lessons.map((entry) => ({ to: `/lesson/${entry.sessionId}`, label: entry.sessionId }));

function mirror(entry, state, { learnerId = 'jenn', version = entry.version } = {}) {
  const id = lessonSessionKey(learnerId, entry.sessionId);
  return JSON.stringify({
    mirrorVersion: 1,
    id,
    learnerId,
    mode: 'lesson',
    contentVersion: version,
    orderedItemIds: [...entry.practice, ...entry.transfer].map((item) => item.id),
    state,
  });
}
const reader = (map) => (key) => map[key] || null;

test('the hero offers the lesson that was started, and counts the task it stopped on', () => {
  const saved = { [lessonSessionKey('jenn', 'pilot-se-complete')]: mirror(lessons[1], { stage: 'attempt', practiceIndex: 1, transferIndex: 0 }) };
  const target = continueTarget({ tiles, lessons, readRaw: reader(saved), learnerId: 'jenn' });
  assert.equal(target.kind, 'resume');
  assert.equal(target.tile.to, '/lesson/pilot-se-complete');
  assert.deepEqual([target.completed, target.total], [1, 3]);
  assert.equal(continueEyebrow(target), "DOT SAYS: YOU'RE ON TASK 2 OF 3");
  assert.match(continueReassurance(target), /earlier answers are kept/);
  assert.equal(continueCta(target), 'KEEP GOING →');
});

test('a lesson only opened, or already finished, is not something to continue', () => {
  for (const stage of ['teach', 'complete']) {
    const saved = { [lessonSessionKey('jenn', 'pilot-sp-patterns')]: mirror(lessons[0], { stage, practiceIndex: 0, transferIndex: 0 }) };
    const target = continueTarget({ tiles, lessons, readRaw: reader(saved), learnerId: 'jenn' });
    assert.equal(target.kind, 'start', `a lesson at "${stage}" was offered as one to resume`);
    assert.equal(target.tile.to, tiles[0].to);
  }
  assert.equal(continueCta({ kind: 'start' }), 'START HERE →');
  assert.equal(continueEyebrow({ kind: 'start' }), 'DOT SAYS: START HERE');
});

test('a saved lesson from other content, or another child, is never offered as this one', () => {
  const stale = { [lessonSessionKey('jenn', 'pilot-sp-patterns')]: mirror(lessons[0], { stage: 'attempt', practiceIndex: 1 }, { version: 1 }) };
  assert.equal(continueTarget({ tiles, lessons, readRaw: reader(stale), learnerId: 'jenn' }).kind, 'start', 'a mirror from an older lesson version was trusted');
  const other = { [lessonSessionKey('jess', 'pilot-sp-patterns')]: mirror(lessons[0], { stage: 'attempt', practiceIndex: 1 }, { learnerId: 'jess' }) };
  assert.equal(continueTarget({ tiles, lessons, readRaw: reader(other), learnerId: 'jenn' }).kind, 'start', "one child's lesson was offered to another");
  assert.equal(continueTarget({ tiles: [], lessons, readRaw: () => null, learnerId: 'jenn' }), null, 'with no lessons there is nothing to offer');
  assert.equal(continueTarget({ tiles, lessons, readRaw: () => 'not json', learnerId: 'jenn' }).kind, 'start', 'unreadable storage is not progress');
});

test('the story card offers the first unlocked episode that is not solved', () => {
  const episodes = [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }];
  const lessonsFor = (episode) => (episode.id === 'e3' ? [] : [{ id: `${episode.id}-lesson` }]);
  const done = new Set();
  const isComplete = (entry) => done.has(entry.id);
  assert.equal(nextStoryEpisode(episodes, { lessonsFor, isComplete }).episode.id, 'e1');
  done.add('e1-lesson');
  assert.equal(nextStoryEpisode(episodes, { lessonsFor, isComplete }).episode.id, 'e2');
  done.add('e2-lesson');
  // e3 has no openable lesson, so it can never be solved — and it must not be reported as solved
  // either, which is the bug that would reveal an episode nobody has worked.
  assert.equal(nextStoryEpisode(episodes, { lessonsFor, isComplete }).episode.id, 'e3');
  assert.equal(nextStoryEpisode([], { lessonsFor, isComplete }), null);
});
