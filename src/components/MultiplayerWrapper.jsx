import { useState, useCallback } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './MultiplayerWrapper.module.css';

export default function MultiplayerWrapper({ children, gameKey }) {
  const { profiles, activeProfileId } = useWords();
  const [multiplayerMode, setMultiplayerMode] = useState(false);
  const [otherPlayerProfile, setOtherPlayerProfile] = useWords();
  const [currentTurn, setCurrentTurn] = useState(activeProfileId);

  if (!multiplayerMode) {
    return (
      <>
        {children}
        {profiles.length > 1 && (
          <div className={styles.multiplayerPrompt}>
            <button
              className={styles.enableMultiplayer}
              onClick={() => setMultiplayerMode(true)}
              aria-label="Enable multiplayer mode"
            >
              👥 Play with another profile
            </button>
          </div>
        )}
      </>
    );
  }

  const otherProfile = profiles.find((p) => p.id !== activeProfileId);
  if (!otherProfile) return children;

  return (
    <div className={styles.multiplayerContainer}>
      <div className={styles.header}>
        <div className={`${styles.playerInfo} ${currentTurn === activeProfileId ? styles.active : ''}`}>
          <span className={styles.avatar}>{profiles.find((p) => p.id === activeProfileId)?.avatar}</span>
          <span className={styles.name}>
            {profiles.find((p) => p.id === activeProfileId)?.name}
          </span>
        </div>
        <div className={styles.vs}>VS</div>
        <div className={`${styles.playerInfo} ${currentTurn === otherProfile.id ? styles.active : ''}`}>
          <span className={styles.avatar}>{otherProfile.avatar}</span>
          <span className={styles.name}>{otherProfile.name}</span>
        </div>
      </div>

      <div className={styles.content}>
        {children}
      </div>

      <div className={styles.footer}>
        <p>
          {currentTurn === activeProfileId
            ? `${profiles.find((p) => p.id === activeProfileId)?.name}'s turn`
            : `${otherProfile.name}'s turn`}
        </p>
        <button
          className={styles.switchBtn}
          onClick={() => setCurrentTurn(currentTurn === activeProfileId ? otherProfile.id : activeProfileId)}
          aria-label="Switch player"
        >
          Switch Player →
        </button>
        <button
          className={styles.exitBtn}
          onClick={() => setMultiplayerMode(false)}
          aria-label="Exit multiplayer"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
