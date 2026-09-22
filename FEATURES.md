# FEATURES — Spelling-Pronun — manifest v1 — confirmed 2026-09-22

Locked features of the current version. Every edit is checked against this list and ends with a
regression table. Update this file in the same change that alters a feature. Over-list rather than
under-list.

Derived from `CLAUDE.md` (Project half) and `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md` on 2026-09-22.
Items marked *(not released)* exist in code but are gated; their gating is itself the feature.

## Identity, profiles, auth
- Anonymous Firebase sign-in on load with a bounded timeout; failure yields a truthful local-only mode.
- Parent register / sign-in with email+password; registering links the anonymous account so the UID is kept.
- Signing into an existing account shows an import preview with counts before any device history merges.
- Multiple named learner profiles per device, each with independent progress, achievements, hints, daily challenge.

## Word games and legacy progress
- Categories loaded from `src/data/words.json`; >25 words auto-split into numbered sections.
- Word IDs use the original category slug, not the section slug, so progress survives section changes.
- Per-`wordId` progress in Firestore with optimistic local updates.
- Daily challenge: 5 random words chosen once per calendar day, stored in Firestore.
- Hints capped at 3 per profile per day, tracked in Firestore, reset daily.
- Achievements persist locally per learner and merge by ID with the cloud record (`arrayUnion`); survive reloads and local-only mode.
- Game routes: `/test`, `/flashcards`, `/scramble`, `/hangman`, `/crossword`, `/speed`.
- Crossword: Check keeps first answers; repair recorded as assisted; answers revealed only on request.
- Speed round: 60-second timed retrieval or untimed practice; misses listed after the round.
- Flashcards are self-report only and never independent evidence.
- `MultiplayerWrapper` local hot-seat mode; no network sync; game content unchanged, only surrounding UI.

## Spelling test input
- Answers go into slot elements and never an `<input>`; the page supplies its own QWERTY.
- A source guard test fails if a text box returns.

## Learning engine (pure, `src/learning/`)
- No React or Firebase imports; every rule has a test in `test/`.
- `evaluateItem`: spelling, choice/token IDs, punctuation-preserving sentence checks, scoped `repairScope` repairs, `allowReview` pending path, human rubrics.
- `evidenceEligible`: independent, first-attempt, unhelped, unrevealed, non-pending, non-technical only.
- `deriveMastery`: unassessed / learning / developing / secure; `needsReview` after two failures in the last five eligible attempts.
- `reviewScheduler`: 1/3/7/14/30-day intervals; failures and helped or same-day retries never advance.
- `lessonFlow`: teach → attempt → feedback → repair/worked solution → transfer → reflection → complete; technical failures defer; lesson length is guidance only.
- Released and pilot evidence derived separately by `track` and never mixed (`pilotApproval.js`).
- `contentCorrections.js` quarantine: an item with an open correction is withheld; the proposer may never resolve it; marking reviewed does not release until the replacement is installed at the recorded version.
- `progressAggregate.js`: totals derived from the immutable attempt record; legacy imports kept as a recorded base; guard against lowering another device's count.
- `spellingRound.js`, `dotExpressions.js`, `homeContinue.js`, `assessmentReport.js`, `reviewQueue.js`, `sessionEngine.js`, `contentValidator.js`, `contentReview.js`, `contentManifest.js`, `importPreview.js`, `crossword.js`, `speedRound.js`, `r1Core.js`.
- `sessionEngine.js` is tested but deliberately not yet wired to a page.

## Content lifecycle
- `draft → schema-valid → independently challenged → reviewed → integrated → pilot_approved → learner_tested → released`.
- Only `released` content produces validated mastery evidence; `pilot_approved` runs the same loop into a separate pilot record.
- Nothing is released. *(not released)*
- Parent approved the four C0 packs, both episodes, and the 28 Part B prompts for a private pilot on 2026-09-09; prompts depending on unheard audio are excluded.

## Human checks (`/checks`)
- Two halves: Technical Test Lab (checks the machine) and Family Pilot Observation (checks the child).
- Test Lab audio rows derived from version-pinned assessment items by `testLabAudio.js`, never a hand-written list.
- A contrast item speaks only its target; the distractor is spoken from the item's own choice text, labelled a comparison, never as assessment audio.
- Test Lab scenarios run via `testLabRun.js` against `testLabStore.js` with learner id `__testlab__` and keys prefixed `spelling-testlab-`; never through `LearningProvider`.
- No check in the Technical half links to a learner route; a test enforces this.
- Family Pilot Observation refuses to open anything until the parent names the observed learner and acknowledges answers will be saved (`pilotEntryAllowed`).
- Two-device check gated by a real preflight (`testLabPreflight.js`); no hand-set override; a passing preflight makes the check runnable, never done.
- `checkLog.js` records the tester rather than the selected child, preserves the earlier result on re-check, and still reads first-version entries.
- `gateStateAfterChecks` returns the gate's own state however many rows are ticked; `summariseChecks` exposes no `ready` or `released` field. Both enforced by test.

## Persistence and sync
- `indexedDb.js` stores session snapshots, attempts, an outbox, and recordings; opener injectable via `useDatabaseOpener`.
- `outboxSync.js` plans idempotent cloud writes; outbox flushes on mount, after submit, on `online`, and on tab visible.
- `durableSession.js` + `useDurableSession.js`: resumable, learner-and-version-pinned state with per-tab leases (`sessionLease.js`).
- Cloud-owner contract (`sessionSync.js`, `firebaseSessionStore.js`) is wired but not yet verified against a live Firebase project. *(not released)*
- `spellAgain.js` holds the per-learner "words to spell again" list; practice bookkeeping the child opts into, never evidence.

## Data and rules
- Firestore collections and document-ID patterns per the table in `CLAUDE.md`.
- `spelling-attempts` is create-only; attempts cannot be updated or deleted.
- `firestore.rules` restricts every collection to its owner; checked by text assertions in `test/firestoreRules.test.js`, not an emulator.
- Neither `spelling-sessions` nor `spelling-testlab-sessions` rules are deployed; the two-device preflight reports a dependency rather than passing. *(not released)*

## Speech, media, UI
- `speak()` returns `{ ok, reason, usedRequestedLocale }` with bounded voice-loading fallback; `useCancellableSpeech(scopeKey)` aborts on learner/item/route change.
- `usedRequestedLocale` false when no `en-CA` voice exists; synthetic audio is never described as Canadian or as reviewed human audio.
- Recording: feature-detected, started only by a visible tap, quality checks, local IndexedDB storage with delete, technical-failure messaging; never auto-scored, stays pending human review.
- Web Audio synth sounds only, no external audio files; haptics; confetti; Fisher-Yates shuffle.
- `--sp-*` facelift tokens; depth is always a hard shadow with no blur; the only press affordance is `translateY(4px)`; nothing interactive below 44px; `prefers-reduced-motion` turns animation off.
- `Dot` is CSS shapes on a 100×100 grid, seven expressions, no image assets; decorative and `aria-hidden`; never announces; her text appears only when the child asks and spends one of the three daily hints. A test holds all of this.
- Co-located CSS Modules per component and page; no CSS framework.

## Build and deploy
- Vite SPA at base path `/Spelling-Pronun/`; all game pages except Home lazy-loaded.
- GitHub Actions runs `npm test` and `npm run build` on PRs and pushes to `main`, deploys `dist/` to `gh-pages` on `main`.
- PWA; service worker registered only in production builds (`import.meta.env.PROD`).
- `npm test` uses Node's built-in runner; no browser, no Firebase. Two hand-written fakes in `test/fakes`, no packages.
- `test/componentImports.test.js` guards components calling helpers they never imported — a class of bug the build cannot see.

## Rules that must not be weakened
- Never convert synthetic speech into reviewed human audio.
- Never auto-score pronunciation from a transcript.
- Never count assisted, revealed, pending, omitted, technical-failure, self-report, or unreleased-content attempts as independent mastery.
- Never overwrite a first answer.
- Never admit unreleased content to the released review queue.
- Never claim Firebase, two-device, real-iPad, learner-test, pilot, or release evidence without the real event.
- No destructive migrations.

## Working-rules governance (added 2026-09-22)
- Root `CLAUDE.md` is two parts: bundle general rules v2.1 verbatim, then `# Project — Spelling-Pronun`; the project half never waives the general rules and the stricter rule wins.
- `.claude/settings.json`: model `fable`, `defaultMode: plan`, git/deploy `ask`, destructive git `deny`, five hooks registered.
- `.claude/hooks/`: plan-gate and skill-router on UserPromptSubmit, routing-guard on PreToolUse, record-guard and validation-line on Stop.
- `.claude/agents/opus-worker.md` sets `model: opus`, effort configured (not verifiable).
- `.claude/skills/hz-guarantee-audit/`.
- `tests/replay-hooks.sh` must report `passed=14 failed=0`.
- `.claude/` is tracked; `.claude/state/` and `__pycache__/` are ignored.
- `routing_guard_mode` stays at `observe` until `tests/test-routing-hook.md` is run.

## Regression table format (paste at the end of every edit)
| Feature | v<old> → v<new> | Note |
|---|---|---|
| <feature> | kept / added / intentionally removed / missing | <why, if not kept> |
