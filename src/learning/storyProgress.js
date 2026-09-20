export function isCurrentLessonCompletion(record, lesson) {
  return Boolean(
    record
    && lesson
    && record.sessionId === lesson.sessionId
    && record.contentVersion === lesson.version,
  );
}

// The episode a child would open next: the first one that is unlocked and not yet solved.
//
// `CasePage` worked this out inline, and Home needs the same answer for its story card. Two copies of
// an unlock rule is how one of them ends up revealing an episode the other still calls locked, so both
// pages call this.
export function nextStoryEpisode(episodes = [], { lessonsFor, isComplete }) {
  const solved = (episode) => {
    const lessons = lessonsFor(episode);
    return lessons.length > 0 && lessons.every((lesson) => isComplete(lesson));
  };
  for (let index = 0; index < episodes.length; index += 1) {
    const episode = episodes[index];
    const unlocked = index === 0 || solved(episodes[index - 1]);
    if (!unlocked) return null;
    if (!solved(episode)) return { episode, index, solved: false };
  }
  return null;
}
