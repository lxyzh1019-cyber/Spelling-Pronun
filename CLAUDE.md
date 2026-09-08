# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
npm test         # node --test over test/*.test.js (pure engine, persistence, content, and source checks)
```

There is no lint script. Tests use Node's built-in runner; they do not start a browser or Firebase.

## Architecture

This is a React 18 + Vite SPA — originally a spelling/pronunciation tutor for Alberta curriculum grade words, now extended with a Grade 5 English learning engine (lessons, assessment, review, story) described in `docs/MASTER_PLAN.md`. Evidence and open release gates live in `docs/IMPLEMENTATION_STATUS.md`; read both before changing learning behaviour. It deploys to GitHub Pages at the base path `/Spelling-Pronun/` (set in `vite.config.js`).

### State providers

Two providers wrap the app. `src/context/WordProvider.jsx` owns identity, profiles, word categories, legacy word-game progress, hints, the daily challenge, and achievements; game pages consume it via `useWords()`. `src/context/LearningProvider.jsx` (inside it) owns immutable learning attempts, mastery derivation, review scheduling, the attempt outbox, and the parent import preview; learning pages consume it via `useLearning()`.

`WordProvider` manages:

- **Auth** — `ensureAuth()` in `src/firebase.js` signs in anonymously on load with a bounded timeout; failure yields a truthful local-only mode. A parent can register or sign in with email/password (`registerParent` links the anonymous account so the UID is kept). Signing into an existing account shows an import preview with counts before any device history is merged.
- **Multi-profile system** — multiple named learner profiles per device (e.g. "Jenn", "Jess"), each with independent progress, achievements, hints, and daily challenge state.
- **Word categories** — loaded from `src/data/words.json`. Categories with more than 25 words are automatically split into numbered sections so each game session stays focused. Word IDs use the *original* category slug (not the section slug) so progress is stable even if section boundaries change.
- **Progress tracking** — recorded per `wordId` in Firestore with optimistic local updates so the UI responds immediately before the round-trip completes.
- **Daily challenge** — 5 random words chosen once per calendar day and stored in Firestore.
- **Hints** — capped at 3 per profile per day, tracked in Firestore and reset daily.
- **Achievements** — defined in `src/utils/achievements.js`. Stat-based achievements are checked automatically; game-specific achievements (perfect round, speed demon, daily champion) are triggered by calling `unlockAchievement(id)`. Awards persist locally per learner and merge by ID with the cloud record (`arrayUnion`), so they survive reloads and local-only mode.

### Learning engine (`src/learning/`)

Pure modules with no React or Firebase imports; every rule has a test in `test/`:

- `evaluators.js` — `evaluateItem` (spelling, choice/token IDs, punctuation-preserving sentence checks, scoped `repairScope` structural repairs, `allowReview` pending path, human rubrics) and `evidenceEligible` (independent, first-attempt, unhelped, unrevealed, non-pending, non-technical only).
- `mastery.js` — `deriveMastery` (unassessed/learning/developing/secure; `needsReview` after two failures in the last five eligible attempts).
- `reviewScheduler.js` — 1/3/7/14/30-day intervals; failures and helped or same-day retries never advance.
- `lessonFlow.js` — teach → attempt → feedback → repair/worked solution → transfer → reflection → complete; technical failures defer; lesson length is guidance only.
- `assessmentReport.js`, `reviewQueue.js`, `sessionEngine.js` (tested, not yet wired to a page), `contentValidator.js`, `contentReview.js`, `contentManifest.js`, `importPreview.js`, `crossword.js`, `speedRound.js`, `r1Core.js`.

Content lives in `src/data/` (C0 packs, assessment forms, story, review records, integration records). Content status is lifecycle-gated: only `released` content can affect mastery or enter the delayed-review queue, and nothing is released yet.

### Persistence (`src/persistence/`)

`indexedDb.js` stores session snapshots, attempts, an outbox, and recordings. `outboxSync.js` plans idempotent cloud writes; the outbox flushes on mount, after a submit, on `online`, and when the tab becomes visible. `durableSession.js` + `src/hooks/useDurableSession.js` give lesson/assessment/review pages resumable, learner-and-version-pinned state with per-tab leases (`sessionLease.js`) and an authenticated cloud-owner contract (`sessionSync.js`, `firebaseSessionStore.js`) that is wired but not yet verified against a live Firebase project.

### Firestore Collections

| Collection | Document ID pattern | Purpose |
|---|---|---|
| `spelling-users` | `{userId}` | Profiles array, active profile, sound setting |
| `spelling-progress` | `{userId}_{profileId}_{wordId}` | Per-word attempt/correct/streak counts |
| `spelling-achievements` | `{userId}_{profileId}` | Array of unlocked achievement objects |
| `spelling-hints` | `{userId}_{profileId}` | Daily hint count + date string |
| `spelling-daily-challenges` | `{userId}_{profileId}` | Daily 5-word challenge + completion flag |
| `spelling-attempts` | `{userId}_{profileId}_{attemptId}` | Immutable learning and word-game attempt events (create-only) |
| `spelling-sessions` | `{userId}__{sessionId}` | Cloud-owned resumable sessions with owner epoch and monotonic revision |

Firestore security rules (`firestore.rules`) restrict every collection to its owner; attempts cannot be updated or deleted. The rules are checked by text assertions in `test/firestoreRules.test.js`, not by an emulator, and the `spelling-sessions` rules are not yet deployed.

### Routing and Pages

`src/App.jsx` sets up React Router v6 routes. All game pages except `Home` are lazy-loaded via `React.lazy`. Each game page wraps its inner component with `MultiplayerWrapper` if it supports hot-seat multiplayer (currently SpellingTest, and the pattern is available for others).

Routes:
- `/` → Home (four C0 language lessons first, then Continue my case / Practise again / Assessment / My progress, stats, optional word games, badge shelf, leaderboard)
- `/case` → CasePage (story episodes and their lessons)
- `/lesson/:sessionId` → LessonPage
- `/assessment`, `/assessment/:sessionId` → AssessmentPage / AssessmentRunner (Form A/B preview; comparison of the latest two completions)
- `/review` → ReviewPage (delayed review; released content only)
- `/progress` → ProgressPage (per-skill mastery, needs-review and pending-review counts)
- `/parent` → ParentPage (parent account, import preview, R2 gate tracker)
- `/test` → SpellingTest (speech synthesis reads words aloud, user types)
- `/flashcards` → Flashcards (self-report only; never independent evidence)
- `/scramble` → WordScramble
- `/hangman` → Hangman
- `/crossword` → Crossword (Check keeps first answers; repair is recorded as assisted; answers are revealed only on request)
- `/speed` → SpeedRound (60-second timed retrieval or untimed practice; misses listed after the round)

### Multiplayer

`MultiplayerWrapper` is a local hot-seat mode — no network sync. It renders a "Play 1 vs 1" button when at least two profiles exist, then displays a turn header and a "Switch Player" button. The game content is unchanged; only the surrounding UI changes.

### Utilities

- **`src/utils/speech.js`** — wraps Web Speech API. `speak(text, { lang, rate, signal })` resolves `{ ok, reason, usedRequestedLocale }` with a bounded voice-loading fallback; use `useCancellableSpeech(scopeKey)` in pages so playback aborts on learner/item/route changes. `usedRequestedLocale` is false when no `en-CA` voice exists; never describe synthetic audio as Canadian or as reviewed human audio.
- **`src/utils/recording.js`** + `src/components/RecordingAnswer.jsx` — feature-detected microphone capture started only by a visible tap, quality checks (empty/short/silent), local IndexedDB storage with a delete control, and technical-failure messaging. Recordings are never auto-scored; they stay pending human review.
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

GitHub Actions (`.github/workflows/deploy.yml`) runs `npm test` and `npm run build` on pull requests and pushes to `main`, and deploys `dist/` to the `gh-pages` branch on `main`. The app is a PWA (`public/manifest.json` + `public/sw.js`); the service worker is registered only in production builds (`import.meta.env.PROD` in `src/main.jsx`) because caching dev `/src` modules produced a stale app shell.

### Rules that must not be weakened

From `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md`: never convert synthetic speech into reviewed human audio; never auto-score pronunciation from a transcript; never count assisted, revealed, pending, omitted, technical-failure, self-report, or unreleased-content attempts as independent mastery; never overwrite a first answer; never admit unreleased content to the released review queue; never claim Firebase, two-device, real-iPad, learner-test, pilot, or release evidence without the real event; no destructive migrations.
