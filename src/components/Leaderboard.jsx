import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useWords } from '../context/WordProvider';
import styles from './Leaderboard.module.css';
import { accuracyPercent, medalFor, rankLeaderboard } from '../learning/leaderboard';

export default function Leaderboard() {
  const { profiles, user } = useWords();
  const [progressRows, setProgressRows] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'spelling-progress'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = [];
        snap.forEach((docSnap) => rows.push(docSnap.data()));
        setProgressRows(rows);
      },
      (err) => console.error('Leaderboard listener error:', err)
    );
    return () => unsub();
  }, [user]);

  const leaderboard = rankLeaderboard(progressRows, profiles);
  const getMedalEmoji = medalFor;
  const getAccuracy = accuracyPercent;

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
