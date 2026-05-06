import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useWords } from '../context/WordProvider';
import styles from './Leaderboard.module.css';

export default function Leaderboard() {
  const { profiles, user } = useWords();
  const [statsByProfile, setStatsByProfile] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'spelling-progress'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const agg = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const pid = data.profileId;
          if (!pid) return;
          if (!agg[pid]) agg[pid] = { correct: 0, totalAttempts: 0 };
          agg[pid].correct += data.correct || 0;
          agg[pid].totalAttempts += data.attempts || 0;
        });
        setStatsByProfile(agg);
      },
      (err) => console.error('Leaderboard listener error:', err)
    );
    return () => unsub();
  }, [user]);

  const leaderboard = profiles
    .map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      correct: statsByProfile[p.id]?.correct || 0,
      totalAttempts: statsByProfile[p.id]?.totalAttempts || 0,
    }))
    .sort((a, b) => b.correct - a.correct);

  const getMedalEmoji = (index) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || '·';
  };

  const getAccuracy = (correct, total) => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📊 Family Leaderboard</h3>
      {leaderboard.length === 0 ? (
        <p className={styles.empty}>Start spelling to compete!</p>
      ) : (
        <div className={styles.list}>
          {leaderboard.map((player, idx) => (
            <div key={player.id} className={styles.entry}>
              <div className={styles.rank}>
                <span className={styles.medal}>{getMedalEmoji(idx)}</span>
                <span className={styles.position}>#{idx + 1}</span>
              </div>

              <div className={styles.profile}>
                <span className={styles.avatar}>{player.avatar}</span>
                <div className={styles.info}>
                  <span className={styles.name}>{player.name}</span>
                  <span className={styles.stats}>
                    {player.correct}/{player.totalAttempts} (
                    {getAccuracy(player.correct, player.totalAttempts)}%)
                  </span>
                </div>
              </div>

              <div className={styles.score}>{player.correct}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
