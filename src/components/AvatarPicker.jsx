import { useState } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './AvatarPicker.module.css';

export default function AvatarPicker() {
  const { profiles, activeProfileId, updateProfileAvatar, AVATAR_OPTIONS } =
    useWords();
  const [showPicker, setShowPicker] = useState(false);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const handleSelectAvatar = (avatar) => {
    updateProfileAvatar(activeProfileId, avatar);
    setShowPicker(false);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setShowPicker(!showPicker)}
        aria-label="Change avatar"
        aria-expanded={showPicker}
      >
        <span className={styles.avatar}>
          {activeProfile?.avatar || '🧠'}
        </span>
      </button>

      {showPicker && (
        <div className={styles.picker} role="menu">
          <p className={styles.label}>Pick your avatar</p>
          <div className={styles.grid}>
            {AVATAR_OPTIONS.map((avatar) => (
              <button
                key={avatar}
                className={`${styles.option} ${
                  activeProfile?.avatar === avatar ? styles.active : ''
                }`}
                onClick={() => handleSelectAvatar(avatar)}
                role="menuitem"
                aria-label={`Select avatar ${avatar}`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
