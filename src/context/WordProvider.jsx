import {
  createContext,
  useContext,
  useState,
  useEffect,
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
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { checkAchievements } from '../utils/achievements';
import wordData from '../data/words.json';

const WordContext = createContext(null);

const AVATAR_OPTIONS = ['🧠', '🚀', '🎨', '🦁', '🌟', '📚', '🎯', '🏆'];
const DEFAULT_AVATAR = '🧠';

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function withIds(categories) {
  return categories.map((cat) => ({
    ...cat,
    id: slug(cat.name),
    words: cat.words.map((w) => ({
      ...w,
      id: `${slug(cat.name)}__${slug(w.word)}`,
    })),
  }));
}

const FALLBACK_CATEGORIES = withIds(wordData.categories || []);

export function WordProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories] = useState(FALLBACK_CATEGORIES);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
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

        let savedActiveId = null;
        if (userDoc.exists()) {
          const data = userDoc.data();
          allProfiles = data.profiles || [];
          userSettings = data.settings || {};
          savedActiveId = data.activeProfileId || null;
        } else {
          allProfiles = [
            {
              id: 'default',
              name: 'Guest',
              avatar: DEFAULT_AVATAR,
              color: '#3b82f6',
              createdAt: new Date(),
            },
          ];
          await setDoc(userDocRef, {
            profiles: allProfiles,
            activeProfileId: 'default',
            settings: { soundEnabled: true },
          });
          savedActiveId = 'default';
        }

        if (allProfiles.length === 0) {
          allProfiles = [
            {
              id: 'default',
              name: 'Guest',
              avatar: DEFAULT_AVATAR,
              color: '#3b82f6',
              createdAt: new Date(),
            },
          ];
          savedActiveId = 'default';
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
        setProfiles([
          {
            id: 'default',
            name: 'Guest',
            avatar: DEFAULT_AVATAR,
            color: '#3b82f6',
          },
        ]);
        setActiveProfileId('default');
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
      if (!user || !activeProfileId || !wordId) return;

      const entry = progress[wordId] || {
        attempts: 0,
        correct: 0,
        streak: 0,
      };
      const nextStreak = correct ? entry.streak + 1 : 0;

      // Optimistic local update so the UI reflects the result even before the
      // Firestore snapshot round-trips back.
      setProgress((prev) => ({
        ...prev,
        [wordId]: {
          attempts: (prev[wordId]?.attempts || 0) + 1,
          correct: (prev[wordId]?.correct || 0) + (correct ? 1 : 0),
          streak: nextStreak,
          lastSeen: new Date(),
        },
      }));

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
    [user, activeProfileId, progress]
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
      if (!user) return;
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
      const newProfiles = [...profiles, newProfile];
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        await setDoc(userDocRef, { profiles: newProfiles }, { merge: true });
        setProfiles(newProfiles);
        return newProfile;
      } catch (err) {
        console.error('Failed to add profile:', err);
      }
    },
    [user, profiles]
  );

  const deleteProfile = useCallback(
    async (profileId) => {
      if (!user) return;
      if (profiles.length <= 1) return;
      const newProfiles = profiles.filter((p) => p.id !== profileId);
      const nextActive =
        profileId === activeProfileId
          ? newProfiles[0]?.id || null
          : activeProfileId;
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        await setDoc(
          userDocRef,
          { profiles: newProfiles, activeProfileId: nextActive },
          { merge: true }
        );
        setProfiles(newProfiles);
        if (profileId === activeProfileId) {
          setActiveProfileId(nextActive);
          setProgress({});
        }
      } catch (err) {
        console.error('Failed to delete profile:', err);
      }
    },
    [user, profiles, activeProfileId]
  );

  const updateProfileAvatar = useCallback(
    async (profileId, avatar) => {
      if (!user) return;
      const updated = profiles.map((p) =>
        p.id === profileId ? { ...p, avatar } : p
      );
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        await setDoc(userDocRef, { profiles: updated }, { merge: true });
        setProfiles(updated);
      } catch (err) {
        console.error('Failed to update avatar:', err);
      }
    },
    [user, profiles]
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
