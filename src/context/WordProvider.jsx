import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import wordData from '../data/words.json';

const WordContext = createContext(null);

const STORAGE_KEY = 'spelling-tutor-progress';

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function withIds(categories) {
  return categories.map((cat) => ({
    ...cat,
    id: slug(cat.name),
    words: cat.words.map((w) => ({ ...w, id: `${slug(cat.name)}__${slug(w.word)}` })),
  }));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch { /* noop */ }
}

export function WordProvider({ children }) {
  const [categories] = useState(() => withIds(wordData.categories || []));
  const [loading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    () => (categories[0]?.name ?? '')
  );
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const recordResult = useCallback((wordId, correct) => {
    setProgress((prev) => {
      const entry = prev[wordId] || { attempts: 0, correct: 0, streak: 0, lastSeen: null };
      const newEntry = {
        attempts: entry.attempts + 1,
        correct: entry.correct + (correct ? 1 : 0),
        streak: correct ? entry.streak + 1 : 0,
        lastSeen: Date.now(),
      };
      return { ...prev, [wordId]: newEntry };
    });
  }, []);

  const activeWords = useMemo(
    () => categories.find((c) => c.name === selectedCategory)?.words || [],
    [categories, selectedCategory]
  );
  const allWords = useMemo(() => categories.flatMap((c) => c.words), [categories]);

  const stats = useMemo(() => ({
    totalAttempts: Object.values(progress).reduce((s, e) => s + e.attempts, 0),
    totalCorrect: Object.values(progress).reduce((s, e) => s + e.correct, 0),
    wordsSeen: Object.keys(progress).length,
    bestStreak: Object.values(progress).reduce((max, e) => Math.max(max, e.streak), 0),
  }), [progress]);

  const value = {
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    activeWords,
    allWords,
    progress,
    recordResult,
    stats,
  };

  return <WordContext.Provider value={value}>{children}</WordContext.Provider>;
}

export function useWords() {
  const ctx = useContext(WordContext);
  if (!ctx) throw new Error('useWords must be inside WordProvider');
  return ctx;
}
