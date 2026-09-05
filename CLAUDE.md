# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
```

There are no lint or test scripts configured.

## Architecture

This is a React 18 + Vite SPA — a spelling/pronunciation tutor targeting Alberta curriculum grade words. It deploys to GitHub Pages at the base path `/Spelling-Pronun/` (set in `vite.config.js`).

### Central State: `WordProvider`

`src/context/WordProvider.jsx` is the single source of truth for everything. All game pages consume it via `useWords()`. It manages:

- **Anonymous Firebase auth** — signs in on load via `ensureAuth()` in `src/firebase.js`. Every user gets a stable anonymous UID automatically.
- **Multi-profile system** — multiple named learner profiles per device (e.g. "Jenn", "Jess"), each with independent progress, achievements, hints, and daily challenge state.
- **Word categories** — loaded from `src/data/words.json`. Categories with more than 25 words are automatically split into numbered sections so each game session stays focused. Word IDs use the *original* category slug (not the section slug) so progress is stable even if section boundaries change.
- **Progress tracking** — recorded per `wordId` in Firestore with optimistic local updates so the UI responds immediately before the round-trip completes.
- **Daily challenge** — 5 random words chosen once per calendar day and stored in Firestore.
- **Hints** — capped at 3 per profile per day, tracked in Firestore and reset daily.
- **Achievements** — defined in `src/utils/achievements.js`. Stat-based achievements are checked automatically; game-specific achievements (perfect round, speed demon, etc.) are triggered manually by calling `unlockAchievement(id)` inside the relevant page component.

### Firestore Collections

| Collection | Document ID pattern | Purpose |
|---|---|---|
| `spelling-users` | `{userId}` | Profiles array, active profile, sound setting |
| `spelling-progress` | `{userId}_{profileId}_{wordId}` | Per-word attempt/correct/streak counts |
| `spelling-achievements` | `{userId}_{profileId}` | Array of unlocked achievement objects |
| `spelling-hints` | `{userId}_{profileId}` | Daily hint count + date string |
| `spelling-daily-challenges` | `{userId}_{profileId}` | Daily 5-word challenge + completion flag |

Firestore security rules enforce that users can only read/write their own documents (`firestore.rules`).

### Routing and Pages

`src/App.jsx` sets up React Router v6 routes. All game pages except `Home` are lazy-loaded via `React.lazy`. Each game page wraps its inner component with `MultiplayerWrapper` if it supports hot-seat multiplayer (currently SpellingTest, and the pattern is available for others).

Routes:
- `/` → Home (category picker, stats, game grid, badge shelf, leaderboard)
- `/test` → SpellingTest (speech synthesis reads words aloud, user types)
- `/flashcards` → Flashcards
- `/scramble` → WordScramble
- `/hangman` → Hangman
- `/crossword` → Crossword
- `/speed` → SpeedRound (60-second timed challenge)

### Multiplayer

`MultiplayerWrapper` is a local hot-seat mode — no network sync. It renders a "Play 1 vs 1" button when at least two profiles exist, then displays a turn header and a "Switch Player" button. The game content is unchanged; only the surrounding UI changes.

### Utilities

- **`src/utils/speech.js`** — wraps Web Speech API (`SpeechSynthesisUtterance`). Call `speak(text)` to read a word aloud.
- **`src/utils/sounds.js`** — Web Audio API synth sounds (no external audio files). Exports `playCorrectSound`, `playIncorrectSound`, `playMilestoneSound`, `playHintSound`. Also exports `setSoundEnabled`/`getSoundEnabled` for module-level sync (the context's `soundEnabled` state is the source of truth for UI, but game pages call these utilities directly).
- **`src/utils/haptics.js`** — `navigator.vibrate` calls for tablet feedback.
- **`src/utils/confetti.js`** — wraps `canvas-confetti` for celebration animations.
- **`src/utils/shuffle.js`** — Fisher-Yates shuffle used by all game pages to randomize word order.
- **`src/utils/achievements.js`** — `ACHIEVEMENTS` definitions and `checkAchievements(stats, existing)` helper. Some achievements have `condition: () => false` because they're triggered manually in game logic rather than by stat thresholds.

### Styling

Every component and page has a co-located CSS Module (`.module.css`). Global styles are in `src/index.css`. No CSS framework is used.

### Word Data

`src/data/words.json` has a `categories` array. Each word object has:
```json
{ "word": "accident", "definition": "...", "hint": "..." }
```

Adding a new grade level means adding a new object to `categories`. Categories with >25 words are auto-split by `WordProvider`.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and pushes to the `gh-pages` branch on every push to `main` using `peaceiris/actions-gh-pages`. The app is a PWA (`public/manifest.json` + `public/sw.js`).
