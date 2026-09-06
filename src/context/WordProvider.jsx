import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { checkAchievements } from '../utils/achievements';
import { applyAttempts, createAttempt, dailyChallengeComplete, edmontonDayKey, progressStats } from '../learning/r1Core';
import { progressStorageKey, readJson, writeJson } from '../utils/localStore';
import wordData from '../data/words.json';

const WordContext = createContext(null);

const AVATAR_OPTIONS = ['🧠', '🚀', '🎨', '🦁', '🌟', '📚', '🎯', '🏆'];
const DEFAULT_AVATAR = '🧠';

const DEFAULT_PROFILES = [
  { id: 'jenn', name: 'Jenn', avatar: '🌟', color: '#f472b6' },
  { id: 'jess', name: 'Jess', avatar: '🎨', color: '#60a5fa' },
];

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SECTION_SIZE = 25;

function shortGradeLabel(name) {
  // "Grade 4 — Alberta Curriculum" -> "Grade 4"
  const m = name.match(/Grade\s*\d+/i);
  return m ? m[0] : name;
}

function withIds(categories) {
  // Split each large category into smaller sections of SECTION_SIZE words
  // so Flashcards / Word Scramble / Spelling Test stay focused.
  const sections = [];
  for (const cat of categories) {
    const words = cat.words || [];
    const total = words.length;
    if (total <= SECTION_SIZE) {
      const catId = slug(cat.name);
      sections.push({
        ...cat,
        id: catId,
        words: words.map((w) => ({
          ...w,
          id: `${catId}__${slug(w.word)}`,
        })),
      });
      continue;
    }
    const sectionCount = Math.ceil(total / SECTION_SIZE);
    for (let i = 0; i < sectionCount; i++) {
      const start = i * SECTION_SIZE;
      const end = Math.min(start + SECTION_SIZE, total);
      const sectionName = `${shortGradeLabel(cat.name)} — Section ${i + 1} (words ${start + 1}-${end})`;
      const sectionId = slug(sectionName);
      sections.push({
        ...cat,
        name: sectionName,
        id: sectionId,
        words: words.slice(start, end).map((w) => ({
          ...w,
          // Keep stable global id so progress doesn't reset when sections change.
          id: `${slug(cat.name)}__${slug(w.word)}`,
        })),
      });
    }
  }
  return sections;
}

const FALLBACK_CATEGORIES = withIds(wordData.categories || []);

export function WordProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('loading');
  const [syncError, setSyncError] = useState(null);
  const [categories] = useState(FALLBACK_CATEGORIES);
  const [profiles, setProfiles] = useState(() =>
    DEFAULT_PROFILES.map((p) => ({ ...p, createdAt: new Date() }))
  );
  const profilesRef = useRef(profiles);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);
  const [activeProfileId, setActiveProfileId] = useState(DEFAULT_PROFILES[0].id);
  const [progress, setProgress] = useState({});
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const [selectedCategory, setSelectedCategory] = useState(
    () => FALLBACK_CATEGORIES[0]?.name ?? ''
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [hintsUsedToday, setHintsUsedToday] = useState(0);
  const [dailyChallengeWord, setDailyChallengeWord] = useState(null);
  const [dailyChallengeDone, setDailyChallengeComplete] = useState(false);
  const [dailyChallengeId, setDailyChallengeId] = useState(null);
  const [dailyChallengeAttempts, setDailyChallengeAttempts] = useState({});
  const dailyChallengeAttemptsRef = useRef(dailyChallengeAttempts);
  useEffect(() => { dailyChallengeAttemptsRef.current = dailyChallengeAttempts; }, [dailyChallengeAttempts]);
  const [multiplayer, setMultiplayer] = useState(null);

  // 1. Initialize auth
  useEffect(() => {
    let mounted = true;
    ensureAuth()
      .then((u) => {
        if (!mounted) return;
        setUser(u);
        setAuthStatus(u ? 'online' : 'local-only');
        if (!u) setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Authentication initialization failed:', err);
        setAuthStatus('error');
        setSyncError('Cloud sign-in is unavailable. Progress is being saved on this device.');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user || loading) return;
    const localProgress = readJson(progressStorageKey(activeProfileId), {});
    progressRef.current = localProgress;
    setProgress(localProgress);
  }, [user, loading, activeProfileId]);

  // 2. Load profiles from Firestore
  useEffect(() => {
    if (!user) return;
    let unsub;
    (async () => {
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        const userDoc = await getDoc(userDocRef);

        let allProfiles = [];
        let userSettings = {};

        const seedProfiles = DEFAULT_PROFILES.map((p) => ({
          ...p,
          createdAt: new Date(),
        }));

        let savedActiveId = null;
        if (userDoc.exists()) {
          const data = userDoc.data();
          allProfiles = data.profiles || [];
          userSettings = data.settings || {};
          savedActiveId = data.activeProfileId || null;
        } else {
          allProfiles = seedProfiles;
          await setDoc(userDocRef, {
            profiles: allProfiles,
            activeProfileId: seedProfiles[0].id,
            settings: { soundEnabled: true },
          });
          savedActiveId = seedProfiles[0].id;
        }

        if (allProfiles.length === 0) {
          allProfiles = seedProfiles;
          savedActiveId = seedProfiles[0].id;
        }

        // Preserve any profiles added locally while Firestore was still loading.
        // Without this merge, setProfiles(allProfiles) would silently erase them.
        const currentLocal = profilesRef.current;
        const firestoreIdSet = new Set(allProfiles.map((p) => p.id));
        const pendingLocal = currentLocal.filter((p) => !firestoreIdSet.has(p.id));
        let finalProfiles = allProfiles;
        if (pendingLocal.length > 0) {
          finalProfiles = [...allProfiles, ...pendingLocal];
          try {
            await setDoc(userDocRef, { profiles: finalProfiles }, { merge: true });
          } catch (err) {
            console.error('Failed to persist pending profiles:', err);
          }
        }
        setProfiles(finalProfiles);
        setSoundEnabled(userSettings.soundEnabled ?? true);

        const active =
          finalProfiles.find((p) => p.id === savedActiveId) || finalProfiles[0];
        if (active) {
          setActiveProfileId(active.id);
        }
      } catch (err) {
        console.error('Failed to load profiles:', err);
        setProfiles(
          DEFAULT_PROFILES.map((p) => ({ ...p, createdAt: new Date() }))
        );
        setActiveProfileId(DEFAULT_PROFILES[0].id);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      unsub?.();
    };
  }, [user]);

  // 3. Load progress and achievements for active profile
  useEffect(() => {
    if (!user || !activeProfileId) return;

    const q = query(
      collection(db, 'spelling-progress'),
      where('userId', '==', user.uid),
      where('profileId', '==', activeProfileId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const progressMap = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          progressMap[data.wordId] = {
            attempts: data.attempts || 0,
            correct: data.correct || 0,
            streak: data.streak || 0,
            lastSeen: data.lastSeen,
          };
        });
        progressRef.current = progressMap;
        setProgress(progressMap);
        writeJson(progressStorageKey(activeProfileId), progressMap);
      },
      (err) => console.error('Progress listener error:', err)
    );

    return () => unsub();
  }, [user, activeProfileId]);

  useEffect(() => {
    if (user || loading || !activeProfileId) return;
    const today = edmontonDayKey();
    const key = `spelling-r1-daily:${activeProfileId}:${today}`;
    let challenge = readJson(key);
    if (!challenge) {
      const pool = [...FALLBACK_CATEGORIES.flatMap((category) => category.words)];
      const words = [];
      while (words.length < 5 && pool.length) words.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      challenge = { challengeId: `${activeProfileId}:${today}`, date: today, words, attempts: {}, completed: false };
      writeJson(key, challenge);
    }
    setDailyChallengeId(challenge.challengeId);
    setDailyChallengeWord(challenge.words);
    setDailyChallengeAttempts(challenge.attempts || {});
    setDailyChallengeComplete(Boolean(challenge.completed));
  }, [user, loading, activeProfileId]);

  const recordDailyChallengeAttempt = useCallback(async (wordId, outcome) => {
    if (!dailyChallengeId || !dailyChallengeWord?.some((word) => word.id === wordId)) return;
    const today = edmontonDayKey();
    const attempts = {
      ...dailyChallengeAttemptsRef.current,
      [wordId]: { outcome, recordedAt: new Date().toISOString() },
    };
    const completed = dailyChallengeComplete(dailyChallengeWord.map(({ id }) => id), attempts);
    dailyChallengeAttemptsRef.current = attempts;
    setDailyChallengeAttempts(attempts);
    setDailyChallengeComplete(completed);
    writeJson(`spelling-r1-daily:${activeProfileId}:${today}`, {
      challengeId: dailyChallengeId,
      date: today,
      words: dailyChallengeWord,
      attempts,
      completed,
    });
    if (!user) return;
    try {
      await setDoc(doc(db, 'spelling-daily-challenges', `${user.uid}_${activeProfileId}`), {
        date: today,
        challengeId: dailyChallengeId,
        attempts,
        completed,
      }, { merge: true });
    } catch (err) {
      console.error('Failed to save daily challenge attempt:', err);
      setSyncError('Daily challenge progress is saved on this device and waiting to sync.');
    }
  }, [user, activeProfileId, dailyChallengeId, dailyChallengeWord]);

  // 4. Load achievements for active profile
  useEffect(() => {
    if (!user || !activeProfileId) return;
    (async () => {
      try {
        const achievementsDocRef = doc(
          db,
          'spelling-achievements',
          `${user.uid}_${activeProfileId}`
        );
        const snap = await getDoc(achievementsDocRef);
        setAchievements(snap.exists() ? snap.data().achievements || [] : []);
      } catch (err) {
        console.error('Failed to load achievements:', err);
      }
    })();
  }, [user, activeProfileId]);

  // 5. Daily hints reset (check if new day)
  useEffect(() => {
    if (!user || !activeProfileId) return;
    (async () => {
      try {
        const hintsDocRef = doc(
          db,
          'spelling-hints',
          `${user.uid}_${activeProfileId}`
        );
        const snap = await getDoc(hintsDocRef);
        const today = edmontonDayKey();

        if (snap.exists() && snap.data().date === today) {
          setHintsUsedToday(snap.data().usedToday || 0);
        } else {
          setHintsUsedToday(0);
          await setDoc(hintsDocRef, { date: today, usedToday: 0 });
        }
      } catch (err) {
        console.error('Failed to load hints:', err);
      }
    })();
  }, [user, activeProfileId]);

  // 6. Daily challenge setup
  useEffect(() => {
    if (!user || !activeProfileId) return;
    (async () => {
      try {
        const today = edmontonDayKey();
        const challengeDocRef = doc(
          db,
          'spelling-daily-challenges',
          `${user.uid}_${activeProfileId}`
        );
        const challengeDoc = await getDoc(challengeDocRef);

        if (challengeDoc.exists() && challengeDoc.data().date === today) {
          const challenge = challengeDoc.data();
          setDailyChallengeWord(challenge.words);
          setDailyChallengeId(challenge.challengeId || `${activeProfileId}:${today}`);
          setDailyChallengeAttempts(challenge.attempts || {});
          setDailyChallengeComplete(challenge.completed || false);
        } else {
          // Pick 5 random words for today's challenge
          const words = FALLBACK_CATEGORIES.flatMap((c) => c.words);
          const challenge = [];
          for (let i = 0; i < 5 && words.length > 0; i++) {
            const idx = Math.floor(Math.random() * words.length);
            challenge.push(words[idx]);
            words.splice(idx, 1);
          }
          setDailyChallengeWord(challenge);
          const challengeId = `${activeProfileId}:${today}`;
          setDailyChallengeId(challengeId);
          setDailyChallengeAttempts({});
          setDailyChallengeComplete(false);
          await setDoc(challengeDocRef, {
            date: today,
            challengeId,
            words: challenge,
            attempts: {},
            completed: false,
          });
        }
      } catch (err) {
        console.error('Failed to setup daily challenge:', err);
      }
    })();
  }, [user, activeProfileId]);

  const recordResults = useCallback(async (results) => {
    if (!Array.isArray(results) || !results.length) return [];
    const knownProfiles = new Set(profiles.map(({ id }) => id));
    const now = new Date();
    const normalized = results.map((result) => {
      const learnerId = result.learnerId || activeProfileId;
      if (!knownProfiles.has(learnerId)) throw new Error(`Unknown learner: ${learnerId}`);
      const attemptId = result.attemptId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      return createAttempt({ ...result, learnerId, attemptId, clientTime: now.toISOString() });
    });

    const byLearner = Map.groupBy
      ? Map.groupBy(normalized, (attempt) => attempt.learnerId)
      : normalized.reduce((map, attempt) => map.set(attempt.learnerId, [...(map.get(attempt.learnerId) || []), attempt]), new Map());

    for (const [learnerId, attempts] of byLearner) {
      const base = learnerId === activeProfileId
        ? progressRef.current
        : readJson(progressStorageKey(learnerId), {});
      const nextProgress = applyAttempts(base, attempts, now);
      writeJson(progressStorageKey(learnerId), nextProgress);
      if (learnerId === activeProfileId) {
        progressRef.current = nextProgress;
        setProgress(nextProgress);
        const summary = progressStats(nextProgress);
        const earned = checkAchievements({ ...summary, bestStreak: summary.bestWordStreak }, achievements);
        if (earned.length) setAchievements((current) => [...current, ...earned.filter((item) => !current.some(({ id }) => id === item.id))]);
      }
    }

    if (!user) return normalized;
    try {
      const batch = writeBatch(db);
      for (const attempt of normalized) {
        batch.set(doc(db, 'spelling-attempts', `${user.uid}_${attempt.learnerId}_${attempt.attemptId}`), {
          ...attempt,
          userId: user.uid,
          serverReceivedAt: serverTimestamp(),
        });
      }
      const groupedWords = new Map();
      for (const attempt of normalized) {
        const key = `${attempt.learnerId}::${attempt.wordId}`;
        const current = groupedWords.get(key) || { learnerId: attempt.learnerId, wordId: attempt.wordId, attempts: 0, correct: 0, lastCorrect: false, evidenceType: attempt.evidenceType };
        current.attempts += 1;
        current.correct += attempt.correct ? 1 : 0;
        current.lastCorrect = attempt.correct;
        current.evidenceType = attempt.evidenceType;
        groupedWords.set(key, current);
      }
      for (const aggregate of groupedWords.values()) {
        const local = readJson(progressStorageKey(aggregate.learnerId), {})[aggregate.wordId] || {};
        batch.set(doc(db, 'spelling-progress', `${user.uid}_${aggregate.learnerId}_${aggregate.wordId}`), {
          userId: user.uid,
          profileId: aggregate.learnerId,
          wordId: aggregate.wordId,
          attempts: increment(aggregate.attempts),
          correct: increment(aggregate.correct),
          streak: local.streak || 0,
          lastSeen: serverTimestamp(),
          lastEvidenceType: aggregate.evidenceType,
        }, { merge: true });
      }
      await batch.commit();
      setSyncError(null);
    } catch (err) {
      console.error('Failed to record result batch:', err);
      setSyncError('Saved on this device. Cloud sync will retry when the connection is available.');
    }
    return normalized;
  }, [user, activeProfileId, profiles, achievements]);

  const recordResult = useCallback((wordId, correct, options = {}) => (
    recordResults([{ ...options, wordId, correct }])
  ), [recordResults]);

  const unlockAchievement = useCallback(
    async (achievementId) => {
      if (!user || !activeProfileId) return;

      const isAlreadyUnlocked = achievements.some((a) => a.id === achievementId);
      if (isAlreadyUnlocked) return;

      const newAchievement = {
        id: achievementId,
        unlockedAt: new Date(),
      };

      try {
        const achievementsDocRef = doc(
          db,
          'spelling-achievements',
          `${user.uid}_${activeProfileId}`
        );
        await setDoc(
          achievementsDocRef,
          {
            achievements: [...achievements, newAchievement],
          },
          { merge: true }
        );
        setAchievements([...achievements, newAchievement]);
      } catch (err) {
        console.error('Failed to unlock achievement:', err);
      }
    },
    [user, activeProfileId, achievements]
  );

  const useHint = useCallback(async () => {
    if (!activeProfileId || hintsUsedToday >= 3) return false;
    if (!user) {
      setHintsUsedToday((previous) => previous + 1);
      return true;
    }

    try {
      const hintsDocRef = doc(
        db,
        'spelling-hints',
        `${user.uid}_${activeProfileId}`
      );
      const today = edmontonDayKey();
      await setDoc(
        hintsDocRef,
        { date: today, usedToday: increment(1) },
        { merge: true }
      );
      setHintsUsedToday((prev) => prev + 1);
      return true;
    } catch (err) {
      console.error('Failed to use hint:', err);
      return false;
    }
  }, [user, activeProfileId, hintsUsedToday]);

  const switchProfile = useCallback(
    async (profileId) => {
      setActiveProfileId(profileId);
      const localProgress = readJson(progressStorageKey(profileId), {});
      progressRef.current = localProgress;
      setProgress(localProgress);
      if (!user) return;
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        await setDoc(
          userDocRef,
          { activeProfileId: profileId },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to persist active profile:', err);
      }
    },
    [user]
  );

  const addProfile = useCallback(
    async (profileName) => {
      const trimmed = profileName.trim();
      if (!trimmed) return;
      const base = slug(trimmed) || 'profile';
      let id = base;
      let n = 2;
      const existingIds = new Set(profiles.map((p) => p.id));
      while (existingIds.has(id)) {
        id = `${base}-${n++}`;
      }
      const newProfile = {
        id,
        name: trimmed,
        avatar: DEFAULT_AVATAR,
        color:
          '#' +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0'),
        createdAt: new Date(),
      };
      setProfiles((prev) => [...prev, newProfile]);
      // Only persist once auth + initial load have resolved. Skipping the
      // remote write keeps the local-first UX working while offline or
      // before anonymous auth completes; the next mutation that runs after
      // load will re-sync via setDoc/merge in deleteProfile/avatar updates.
      if (user && !loading) {
        try {
          const userDocRef = doc(db, 'spelling-users', user.uid);
          // Atomic append so two quick adds (or a stale closure) can't drop
          // entries from the array.
          await updateDoc(userDocRef, { profiles: arrayUnion(newProfile) });
        } catch (err) {
          // updateDoc fails if the doc doesn't exist yet; fall back to setDoc.
          try {
            const userDocRef = doc(db, 'spelling-users', user.uid);
            await setDoc(
              userDocRef,
              { profiles: [...profiles, newProfile] },
              { merge: true }
            );
          } catch (err2) {
            console.error('Failed to persist new profile:', err2);
          }
        }
      }
      return newProfile;
    },
    [user, profiles, loading]
  );

  const deleteProfile = useCallback(
    async (profileId) => {
      if (profiles.length <= 1) return;
      const newProfiles = profiles.filter((p) => p.id !== profileId);
      const nextActive =
        profileId === activeProfileId
          ? newProfiles[0]?.id || null
          : activeProfileId;
      setProfiles(newProfiles);
      if (profileId === activeProfileId) {
        setActiveProfileId(nextActive);
        setProgress({});
      }
      if (user && !loading) {
        try {
          const userDocRef = doc(db, 'spelling-users', user.uid);
          await setDoc(
            userDocRef,
            { profiles: newProfiles, activeProfileId: nextActive },
            { merge: true }
          );
        } catch (err) {
          console.error('Failed to persist profile deletion:', err);
        }
      }
    },
    [user, profiles, activeProfileId, loading]
  );

  const updateProfileAvatar = useCallback(
    async (profileId, avatar) => {
      const updated = profiles.map((p) =>
        p.id === profileId ? { ...p, avatar } : p
      );
      setProfiles(updated);
      // Match addProfile/deleteProfile: don't write back until the initial
      // Firestore load is done, otherwise an early avatar tap would persist
      // the default seed array on top of saved profiles.
      if (user && !loading) {
        try {
          const userDocRef = doc(db, 'spelling-users', user.uid);
          await setDoc(userDocRef, { profiles: updated }, { merge: true });
        } catch (err) {
          console.error('Failed to persist avatar update:', err);
        }
      }
    },
    [user, profiles, loading]
  );

  const toggleSound = useCallback(async () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    if (!user) return;

    try {
      const userDocRef = doc(db, 'spelling-users', user.uid);
      await setDoc(
        userDocRef,
        { settings: { soundEnabled: newState } },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to save sound setting:', err);
    }
  }, [user, soundEnabled]);

  const activeWords = useMemo(
    () => categories.find((c) => c.name === selectedCategory)?.words || [],
    [categories, selectedCategory]
  );
  const allWords = useMemo(() => categories.flatMap((c) => c.words), [categories]);

  const stats = useMemo(
    () => {
      const summary = progressStats(progress);
      return { ...summary, bestStreak: summary.bestWordStreak };
    },
    [progress]
  );

  const value = {
    user,
    loading,
    authStatus,
    syncError,
    categories,
    profiles,
    activeProfileId,
    switchProfile,
    addProfile,
    deleteProfile,
    selectedCategory,
    setSelectedCategory,
    activeWords,
    allWords,
    progress,
    recordResult,
    recordResults,
    stats,
    soundEnabled,
    toggleSound,
    achievements,
    unlockAchievement,
    hintsUsedToday,
    useHint,
    dailyChallengeWord,
    dailyChallengeId,
    dailyChallengeAttempts,
    dailyChallengeDone,
    recordDailyChallengeAttempt,
    updateProfileAvatar,
    multiplayer,
    setMultiplayer,
    AVATAR_OPTIONS,
  };

  return <WordContext.Provider value={value}>{children}</WordContext.Provider>;
}

export function useWords() {
  const ctx = useContext(WordContext);
  if (!ctx) throw new Error('useWords must be inside WordProvider');
  return ctx;
}
