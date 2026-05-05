import { useState, useRef, useEffect } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './ProfileSwitcher.module.css';

export default function ProfileSwitcher() {
  const { profiles, activeProfileId, switchProfile, addProfile } = useWords();
  const [showMenu, setShowMenu] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const menuRef = useRef(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleAddProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    await addProfile(newProfileName);
    setNewProfileName('');
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Switch profile"
        aria-expanded={showMenu}
      >
        <span className={styles.icon} aria-hidden="true">
          👤
        </span>
        <span className={styles.label}>{activeProfile?.name || 'Profile'}</span>
      </button>

      {showMenu && (
        <div className={styles.menu} role="menu">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`${styles.menuItem} ${
                profile.id === activeProfileId ? styles.active : ''
              }`}
              onClick={() => {
                switchProfile(profile.id);
                setShowMenu(false);
              }}
              role="menuitem"
            >
              {profile.name}
              {profile.id === activeProfileId && (
                <span className={styles.checkmark} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}

          <div className={styles.divider} role="separator" />

          <form className={styles.form} onSubmit={handleAddProfile}>
            <input
              type="text"
              placeholder="New profile name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className={styles.input}
              aria-label="New profile name"
            />
            <button
              type="submit"
              className={styles.addBtn}
              disabled={!newProfileName.trim()}
              aria-label="Add new profile"
            >
              + Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
