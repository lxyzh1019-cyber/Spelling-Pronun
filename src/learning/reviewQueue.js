export function buildReviewQueue(dueReviews, packs, limit = 4) {
  const queue = [];
  for (const due of dueReviews || []) {
    const pack = (packs || []).find((candidate) => candidate.skillId === due.skillId);
    const variants = pack?.items?.filter((item) => item.role === 'delayed_review'
      && item.authorStatus === 'reviewed'
      && item.reviewStatus === 'reviewed'
      && ['choice', 'text'].includes(item.responseType)
      && item.evaluator !== 'human_rubric') || [];
    if (!variants.length) continue;
    const stage = Number.isInteger(due.reviewStage) ? due.reviewStage : 0;
    const item = variants[Math.max(0, stage) % variants.length];
    queue.push({ itemId: item.id, itemVersion: item.version, skillId: due.skillId, reviewStage: stage, reviewDue: due.reviewDue });
    if (queue.length >= limit) break;
  }
  return queue;
}

export function createReviewSession(entries = []) {
  return entries.length
    ? { stage: 'attempt', entries, index: 0, evidenceIds: [], lastResult: null }
    : { stage: 'idle', entries: [], index: 0, evidenceIds: [], lastResult: null };
}

export function resolveReviewItem(session, packs) {
  const entry = session?.entries?.[session.index];
  if (!entry) return null;
  return (packs || []).flatMap((pack) => pack.items || []).find((item) => item.id === entry.itemId && item.version === entry.itemVersion) || null;
}

export function recordReviewResult(session, result) {
  if (session.stage !== 'attempt') return session;
  return { ...session, stage: 'feedback', lastResult: result };
}

export function advanceReviewSession(session) {
  if (session.stage !== 'feedback') return session;
  const nextIndex = session.index + 1;
  return nextIndex < session.entries.length
    ? { ...session, stage: 'attempt', index: nextIndex, lastResult: null }
    : { ...session, stage: 'complete', index: nextIndex, lastResult: null, completedAt: new Date().toISOString() };
}
