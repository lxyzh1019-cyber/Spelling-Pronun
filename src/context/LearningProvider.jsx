import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useWords } from './WordProvider';
import { evaluateItem } from '../learning/evaluators';
import { deriveMastery } from '../learning/mastery';
import { deriveReviewProgress, selectDueReviews } from '../learning/reviewScheduler';
import { edmontonDayKey } from '../learning/r1Core';
import { queueAttempt } from '../persistence/indexedDb';
import { readJson, writeJson } from '../utils/localStore';
import skillsData from '../data/skills.json';

const LearningContext = createContext(null);

function attemptsKey(learnerId) {
  return `spelling-learning-attempts:${learnerId}`;
}

export function LearningProvider({ children }) {
  const { activeProfileId } = useWords();
  const [attempts, setAttempts] = useState(() => readJson(attemptsKey(activeProfileId), []));
  const [saveStatus, setSaveStatus] = useState('saved');

  useEffect(() => {
    setAttempts(readJson(attemptsKey(activeProfileId), []));
    setSaveStatus('saved');
  }, [activeProfileId]);

  const submitAttempt = useCallback(async (item, response, metadata = {}) => {
    const evaluation = evaluateItem(item, response);
    const attempt = Object.freeze({
      attemptId: metadata.attemptId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      learnerId: activeProfileId,
      sessionId: metadata.sessionId,
      itemId: item.id,
      itemVersion: item.version,
      skillIds: [item.primarySkill, ...(item.secondarySkills || [])],
      originalAnswer: response,
      status: metadata.omitted ? 'omitted' : evaluation.status,
      correct: metadata.omitted ? false : evaluation.correct,
      omitted: Boolean(metadata.omitted),
      helped: Boolean(metadata.helped),
      revealed: Boolean(metadata.revealed),
      unseen: Boolean(metadata.unseen),
      evidenceType: metadata.evidenceType || 'independent_choice',
      eventTime: new Date().toISOString(),
      edmontonDate: edmontonDayKey(),
      contentStatus: item.reviewStatus,
    });
    setAttempts((current) => {
      if (current.some(({ attemptId }) => attemptId === attempt.attemptId)) return current;
      const next = [...current, attempt];
      writeJson(attemptsKey(activeProfileId), next);
      return next;
    });
    setSaveStatus('saving');
    try {
      await queueAttempt(attempt);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('saved-locally');
    }
    return { attempt, evaluation };
  }, [activeProfileId]);

  const masteryBySkill = useMemo(() => Object.fromEntries(skillsData.skills.map((skill) => [
    skill.id,
    deriveMastery(attempts.filter((attempt) => attempt.skillIds.includes(skill.id) && attempt.contentStatus !== 'not_reviewed')),
  ])), [attempts]);
  const reviewProgress = useMemo(() => deriveReviewProgress(attempts), [attempts]);
  const dueReviews = useMemo(() => selectDueReviews(reviewProgress), [reviewProgress]);

  const value = useMemo(() => ({ attempts, submitAttempt, masteryBySkill, reviewProgress, dueReviews, saveStatus, skills: skillsData.skills }), [attempts, submitAttempt, masteryBySkill, reviewProgress, dueReviews, saveStatus]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error('useLearning must be inside LearningProvider');
  return value;
}
