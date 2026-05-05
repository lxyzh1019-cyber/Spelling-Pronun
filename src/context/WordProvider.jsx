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
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import wordData from '../data/words.json';

const WordContext = createContext(null);

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
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [progress, setProgress] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(
    () => FALLBACK_CATEGORIES[0]?.name ?? ''
  );

  // 1. Initialize auth
  useEffect(() => {
    let mounted = true;
    ensureAuth().then((u) => {
      if (mounted) {
        setUser(u);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load profiles from Firestore (once user is ready)
  useEffect(() => {
    if (!user) return;
    let unsub;
    (async () => {
      try {
        const userDocRef = doc(db, 'spelling-users', user.uid);
        const userDoc = await getDoc(userDocRef);

        let allProfiles = [];
        if (userDoc.exists()) {
          allProfiles = userDoc.data().profiles || [];
        } else {
          // Create default profile on first visit
          allProfiles = [{ id: 'default', name: 'Guest', createdAt: new Date() }];
          await setDoc(userDocRef, { profiles: allProfiles });
        }

        setProfiles(allProfiles);
        const active = allProfiles[0];
        if (active) {
          setActiveProfileId(active.id);
        }
      } catch (err) {
        console.error('Failed to load profiles:', err);
        setProfiles([{ id: 'default', name: 'Guest' }]);
        setActiveProfileId('default');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      unsub?.();
    };
  }, [user]);

  // 3. Listen to progress for the active profile (per-profile isolation via Firestore query)
  useEffect(() => {
    if (!user || !activeProfileId) return;

    // Query: collection('spelling-progress') where userId == user.uid AND profileId == activeProfileId
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
      (err) => {
        console.error('Progress listener error:', err);
      }
    );

    return () => unsub();
  }, [user, activeProfileId]);

  const recordResult = useCallback(
    async (wordId, correct) => {
      if (!user || !activeProfileId) return;

      const entry = progress[wordId] || {
        attempts: 0,
        correct: 0,
        streak: 0,
        lastSeen: null,
      };
      const newEntry = {
        userId: user.uid,
        profileId: activeProfileId,
        wordId,
        attempts: entry.attempts + 1,
        correct: entry.correct + (correct ? 1 : 0),
        streak: correct ? entry.streak + 1 : 0,
        lastSeen: serverTimestamp(),
      };

      try {
        const docRef = doc(
          db,
          'spelling-progress',
          `${user.uid}_${activeProfileId}_${wordId}`
        );
        await setDoc(docRef, newEntry);
      } catch (err) {
        console.error('Failed to record result:', err);
      }
    },
    [user, activeProfileId, progress]
  );

  const switchProfile = useCallback(async (profileId) => {
    setActiveProfileId(profileId);
    setProgress({});
  }, []);

  const addProfile = useCallback(
    async (profileName) => {
      if (!user) return;
      const newProfile = {
        id: slug(profileName),
        name: profileName,
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
