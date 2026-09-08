export function isCurrentLessonCompletion(record, lesson) {
  return Boolean(
    record
    && lesson
    && record.sessionId === lesson.sessionId
    && record.contentVersion === lesson.version,
  );
}
