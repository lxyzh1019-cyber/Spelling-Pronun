import { useWords } from '../context/WordProvider';
import { getAchievementById } from '../utils/achievements';
import styles from './BadgeShelf.module.css';

export default function BadgeShelf() {
  const { achievements } = useWords();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>🏆 Achievements</h3>
      {achievements.length === 0 ? (
        <p className={styles.empty}>Keep playing to unlock badges!</p>
      ) : (
        <div className={styles.grid}>
          {achievements.map((ach) => {
            const def = getAchievementById(ach.id);
            if (!def) return null;
            return (
              <div
                key={ach.id}
                className={styles.badge}
                title={def.name}
                role="img"
                aria-label={`${def.name}: ${def.description}`}
              >
                <span className={styles.icon}>{def.icon}</span>
                <span className={styles.label}>{def.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
