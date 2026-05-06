import { useState } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './MultiplayerWrapper.module.css';

export default function MultiplayerWrapper({ children }) {
  const { profiles, activeProfileId } = useWords();
  const [multiplayerMode, setMultiplayerMode] = useState(false);
  const [opponentId, setOpponentId] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(activeProfileId);

  const others = profiles.filter((p) => p.id !== activeProfileId);

  if (!multiplayerMode) {
    return (
      <>
        {children}
        {others.length >= 1 && (
          <div className={styles.multiplayerPrompt}>
            <button
              className={styles.enableMultiplayer}
              onClick={() => {
                setOpponentId(others[0].id);
                setCurrentTurn(activeProfileId);
                setMultiplayerMode(true);
              }}
              aria-label="Enable 1 vs 1 mode"
            >
              👥 Play 1 vs 1
            </button>
          </div>
        )}
      </>
    );
  }

  const opponent =
    profiles.find((p) => p.id === opponentId) || others[0];
  if (!opponent) return children;
  const me = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className={styles.multiplayerContainer}>
      <div className={styles.header}>
        <div className={`${styles.playerInfo} ${currentTurn === activeProfileId ? styles.active : ''}`}>
          <span className={styles.avatar}>{me?.avatar}</span>
          <span className={styles.name}>{me?.name}</span>
        </div>
        <div className={styles.vs}>VS</div>
        <div className={`${styles.playerInfo} ${currentTurn === opponent.id ? styles.active : ''}`}>
          <span className={styles.avatar}>{opponent.avatar}</span>
          <span className={styles.name}>{opponent.name}</span>
        </div>
      </div>

      {others.length > 1 && (
        <div className={styles.multiplayerPrompt}>
          <label htmlFor="opponent-select" style={{ marginRight: 8, fontWeight: 600 }}>
            Opponent:
          </label>
          <select
            id="opponent-select"
            value={opponent.id}
            onChange={(e) => {
              setOpponentId(e.target.value);
              setCurrentTurn(activeProfileId);
            }}
          >
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.avatar} {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.content}>{children}</div>

      <div className={styles.footer}>
        <p>
          {currentTurn === activeProfileId
            ? `${me?.name}'s turn`
            : `${opponent.name}'s turn`}
        </p>
        <button
          className={styles.switchBtn}
          onClick={() =>
            setCurrentTurn(currentTurn === activeProfileId ? opponent.id : activeProfileId)
          }
          aria-label="Switch player"
        >
          Switch Player →
        </button>
        <button
          className={styles.exitBtn}
          onClick={() => setMultiplayerMode(false)}
          aria-label="Exit 1 vs 1"
        >
          Exit 1 vs 1
        </button>
      </div>
    </div>
  );
}
