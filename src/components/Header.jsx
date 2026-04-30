import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/test', label: 'Test', icon: '✏️' },
  { to: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { to: '/scramble', label: 'Scramble', icon: '🔀' },
  { to: '/hangman', label: 'Hangman', icon: '🎯' },
  { to: '/crossword', label: 'Crossword', icon: '🧩' },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.brand}>
        <span className={styles.logo}>🔤</span>
        <span className={styles.title}>Spelling Tutor</span>
      </NavLink>
      <nav className={styles.nav}>
        {links.slice(1).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{link.icon}</span>
            <span className={styles.label}>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
