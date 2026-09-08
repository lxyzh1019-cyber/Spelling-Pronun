const STATES = new Set(['intro', 'teach', 'attempt', 'feedback', 'repair', 'transfer', 'reflection', 'complete']);

export function createLearningSession({ id, learnerId, mode, contentVersion, orderedItemIds, seed }) {
  if (!id || !learnerId || !orderedItemIds?.length) throw new Error('Session identity, learner, and items are required');
  return { id, learnerId, mode, contentVersion, seed, orderedItemIds: [...orderedItemIds], itemIndex: 0, state: 'intro', responses: [], status: 'active', revision: 0 };
}

export function transitionSession(session, action) {
  if (!STATES.has(session.state)) throw new Error(`Invalid session state: ${session.state}`);
  if (action.expectedRevision !== undefined && action.expectedRevision !== session.revision) throw new Error('stale_revision');
  const next = { ...session, revision: session.revision + 1 };
  if (action.type === 'BEGIN') next.state = 'teach';
  else if (action.type === 'READY') next.state = 'attempt';
  else if (action.type === 'SUBMIT') {
    if (session.responses.some(({ attemptId }) => attemptId === action.attempt.attemptId)) return session;
    if (session.state !== 'attempt' && session.state !== 'repair' && session.state !== 'transfer') throw new Error('submission_not_allowed');
    next.responses = [...session.responses, Object.freeze({ ...action.attempt })];
    next.state = action.attempt.status === 'correct' ? 'transfer' : action.attempt.status === 'pending' ? 'reflection' : 'feedback';
  } else if (action.type === 'SHOW_FEEDBACK') next.state = 'repair';
  else if (action.type === 'REPAIR_COMPLETE') next.state = 'transfer';
  else if (action.type === 'TRANSFER_COMPLETE') next.state = 'reflection';
  else if (action.type === 'REFLECT') {
    if (session.itemIndex + 1 >= session.orderedItemIds.length) {
      next.state = 'complete';
      next.status = 'completed';
    } else {
      next.itemIndex = session.itemIndex + 1;
      next.state = 'teach';
    }
  } else if (action.type === 'PAUSE') next.status = 'paused';
  else if (action.type === 'RESUME') next.status = 'active';
  else throw new Error(`Unknown session action: ${action.type}`);
  return next;
}
