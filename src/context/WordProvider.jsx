import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { checkAchievements } from '../utils/achievements';
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
  const [categories] = useState(FALLBACK_CATEGORIES);
  const [profiles, setProfiles] = useState(() =>
    DEFAULT_PROFILES.map((p) => ({ ...p, createdAt: new Date() }))
  );
  const [activeProfileId, setActiveProfileId] = useState(DEFAULT_PROFILES[0].id);
  const [progress, setProgress] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(
    () => FALLBACK_CATEGORIES[0]?.name ?? ''
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [hintsUsedToday, setHintsUsedToday] = useState(0);
  const [dailyChallengeWord, setDailyChallengeWord] = useState(null);
  const [dailyChallengeDone, setDailyChallengeComplete] = useState(false);
  const [multiplayer, setMultiplayer] = useState(null);
  // recordResult needs to call completeDailyChallenge but it's defined later;
  // mirror through a ref so we don't have to reorder declarations.
  const completeDailyChallengeRef = useRef(null);

  // 1. Initialize auth
  useEffect(() => {
    let mounted = true;
    ensureAuth().then((u) => {
      if (mounted) setUser(u);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

        setProfiles(allProfiles);
        setSoundEnabled(userSettings.soundEnabled ?? true);

        const active =
          allProfiles.find((p) => p.id === savedActiveId) || allProfiles[0];
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
        setProgress(progressMap);
      },
      (err) => console.error('Progress listener error:', err)
    );

    return () => unsub();
  }, [user, activeProfileId]);

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
        const today = new Date().toDateString();

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
        const today = new Date().toDateString();
        const challengeDocRef = doc(
          db,
          'spelling-daily-challenges',
          `${user.uid}_${activeProfileId}`
        );
        const challengeDoc = await getDoc(challengeDocRef);

        if (challengeDoc.exists() && challengeDoc.data().date === today) {
          const challenge = challengeDoc.data();
          setDailyChallengeWord(challenge.words);
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
          setDailyChallengeComplete(false);
          await setDoc(challengeDocRef, {
            date: today,
            words: challenge,
            completed: false,
          });
        }
      } catch (err) {
        console.error('Failed to setup daily challenge:', err);
      }
    })();
  }, [user, activeProfileId]);

  const recordResult = useCallback(
    async (wordId, correct) => {
      if (!activeProfileId || !wordId) return;

      const entry = progress[wordId] || {
        attempts: 0,
        correct: 0,
        streak: 0,
      };
      const nextStreak = correct ? entry.streak + 1 : 0;
      const nextEntry = {
        attempts: entry.attempts + 1,
        correct: entry.correct + (correct ? 1 : 0),
        streak: nextStreak,
        lastSeen: new Date(),
      };
      const nextProgress = { ...progress, [wordId]: nextEntry };

      // Optimistic local update so the UI reflects the result even before the
      // Firestore snapshot round-trips back.
      setProgress(nextProgress);

      // Run rule-based achievement checks against the post-update stats so
      // every game (not just SpellingTest/SpeedRound) feeds the badge engine.
      const nextStats = {
        totalAttempts: Object.values(nextProgress).reduce((s, e) => s + e.attempts, 0),
        totalCorrect: Object.values(nextProgress).reduce((s, e) => s + e.correct, 0),
        wordsSeen: Object.keys(nextProgress).length,
        bestStreak: Object.values(nextProgress).reduce((m, e) => Math.max(m, e.streak), 0),
      };
      const earned = checkAchievements(nextStats, achievements);
      if (earned.length) {
        const merged = [...achievements, ...earned];
        setAchievements(merged);
        if (user) {
          try {
            const achievementsDocRef = doc(
              db,
              'spelling-achievements',
              `${user.uid}_${activeProfileId}`
            );
            await setDoc(
              achievementsDocRef,
              { achievements: merged },
              { merge: true }
            );
          } catch (err) {
            console.error('Failed to persist earned achievements:', err);
          }
        }
      }

      // If the user just got a daily-challenge word right and now has at least
      // one correct attempt on each of the 5 daily words, mark the daily
      // challenge complete.
      if (
        correct &&
        !dailyChallengeDone &&
        Array.isArray(dailyChallengeWord) &&
        dailyChallengeWord.some((w) => w.id === wordId)
      ) {
        const allDone = dailyChallengeWord.every(
          (w) => (nextProgress[w.id]?.correct || 0) >= 1
        );
        if (allDone) {
          completeDailyChallengeRef.current?.();
        }
      }

      if (!user) return;

      try {
        const docRef = doc(
          db,
          'spelling-progress',
          `${user.uid}_${activeProfileId}_${wordId}`
        );
        // Use increment so concurrent writes for the same word don't clobber
        // each other's counts. Streak isn't safe to increment atomically, so we
        // accept eventual consistency on it.
        await setDoc(
          docRef,
          {
            userId: user.uid,
            profileId: activeProfileId,
            wordId,
            attempts: increment(1),
            correct: increment(correct ? 1 : 0),
            streak: nextStreak,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to record result:', err);
      }
    },
    [user, activeProfileId, progress, achievements, dailyChallengeWord, dailyChallengeDone]
  );

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
    if (!user || !activeProfileId || hintsUsedToday >= 3) return false;

    try {
      const hintsDocRef = doc(
        db,
        'spelling-hints',
        `${user.uid}_${activeProfileId}`
      );
      const today = new Date().toDateString();
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

  const completeDailyChallenge = useCallback(async () => {
    if (!user || !activeProfileId || dailyChallengeDone) return;

    try {
      const today = new Date().toDateString();
      const challengeDocRef = doc(
        db,
        'spelling-daily-challenges',
        `${user.uid}_${activeProfileId}`
      );
      await setDoc(
        challengeDocRef,
        { date: today, completed: true },
        { merge: true }
      );
      setDailyChallengeComplete(true);
      await unlockAchievement('daily_champion');
    } catch (err) {
      console.error('Failed to complete daily challenge:', err);
    }
  }, [user, activeProfileId, dailyChallengeDone, unlockAchievement]);

  useEffect(() => {
    completeDailyChallengeRef.current = completeDailyChallenge;
  }, [completeDailyChallenge]);

  const switchProfile = useCallback(
    async (profileId) => {
      setActiveProfileId(profileId);
      setProgress({});
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
    () => ({
      totalAttempts: Object.values(progress).reduce(
        (s, e) => s + e.attempts,
        0
      ),
      totalCorrect: Object.values(progress).reduce((s, e) => s + e.correct, 0),
      wordsSeen: Object.keys(progress).length,
      bestStreak: Object.values(progress).reduce(
        (max, e) => Math.max(max, e.streak),
        0
      ),
    }),
    [progress]
  );

  const value = {
    user,
    loading,
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
    stats,
    soundEnabled,
    toggleSound,
    achievements,
    unlockAchievement,
    hintsUsedToday,
    useHint,
    dailyChallengeWord,
    dailyChallengeDone,
    completeDailyChallenge,
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
