# FEATURES — Spelling-Pronun — manifest v2 — confirmed 2026-09-28

Locked features of the current version. Every edit is checked against this list and ends with a
regression table. Update this file in the same change that alters a feature. Over-list rather than
under-list.

Derived from `docs/PROJECT_ARCHITECTURE.md` and `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md` on 2026-09-22.
v2 (2026-09-28) adds the Below-grade diagnostic section, which manifest v1 omitted entirely although
the feature already existed, and records the combined share/download/print export added this round.
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

## Below-grade diagnostic (`/diagnostic`) — added to the manifest at v2
- 48 questions: the 16 skills Alberta finishes with before Grade 5, three each. `test/diagnostic.test.js` derives the 16 from `endsBeforeGrade5` on the ladder, so the form cannot drift from the curriculum.
- Every question probes a grade its own skill is actually taught at, asserted row by row against the ladder.
- It teaches nothing: no worked example, no help, no repair step, no right/wrong feedback. A diagnostic that taught would measure the teaching.
- Parent gate before it opens: name the observed child and acknowledge what is recorded, the same shape the Family Pilot checks use.
- Answers are written to `diagnosticStore.js` under the `spelling-diagnostic-` prefix, which refuses any key outside its own namespace. There is no path from there into `spelling-attempts`, and nothing routes through `LearningProvider`. The fence is structural, not a filter.
- A diagnostic answer can never be mastery evidence, whatever the child scores — every item is `draft`, and both evidence tracks exclude it. Tests enforce both halves.
- The first answer stands; a resumed run never overwrites it, and `firstAttempts` applies the same rule when the report is built.
- `diagnosticReport.js` reports the SHAPE of the gap, never a score or proportion: per skill `solid` / `partly solid` / `needs building` / `not enough evidence`, and the word "behind" appears nowhere about a child.
- `separateAppReading` is the only place the separate-catch-up-app judgement is made, and it refuses to answer until at least half the form is done.
- The summary line and the separate-app detail name `needs building` and `partly solid` skills as two separate lists, so every number and list in the export agrees with the counts line (R7, 2026-09-29); `separateAppQuestion.needing` keeps both groups together for callers, with `needsBuilding` / `partlySolid` alongside. Each section says "This section is for <name> only." rather than claiming a parent-page selection.
- `itemCount` / `answeredCount` are carried on the report so a part-way run can never read as a finished one.
- Each located gap names the specific thing found and quotes the choice the child actually made (`chose`); an answer recorded without a `choiceId` carries no quoted choice rather than an invented one.

## Getting a diagnostic result off the device (`DiagnosticShare`) — added at v2
- One shared component renders the export on both the diagnostic finish screen and the parent page, so the two surfaces cannot drift apart in wording or capability. It replaces the parent page's single-learner "Copy the report" button and the prose instruction to switch profiles.
- The export covers **every child who has answered**, in device profile order. No profile has to be selected and no child can be forgotten.
- Three routes, all local, no cloud and no share link: `navigator.share` (the iPad share sheet), a dated `.md` file download, and a print / Save-as-PDF page.
- `shareReport.js` returns `{ ok, via, reason }` and never claims a success it did not get: share sheet, copied, cancelled, and copy-blocked are four different sentences. Dependencies are injected so `node --test` covers every path with no browser.
- A dismissed share sheet does not silently fall back to the clipboard; the parent's choice not to send stands.
- The read-only textarea remains the floor: when every route fails the report is still on the page to be selected by hand.
- The repo's only `@media print` rules live in `DiagnosticShare.module.css`; the printed page is the report alone, without app chrome.

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
- A diagnostic answer never reaches `spelling-attempts` and never counts as mastery, however it is scored.
- The combined diagnostic export carries no cross-child total, no aggregate and no ranking, and orders children by device profile order — never by result. One child's gaps say nothing about another's.
- No export route may report a success it did not get.

## Working-rules governance (added 2026-09-22; stub install 2026-09-27)
- Root `CLAUDE.md` is the `hz-claude-config` pointer stub plus a "Project Architecture" section pointing at `docs/PROJECT_ARCHITECTURE.md`. The working rules themselves are not copied into this repository.
- `docs/PROJECT_ARCHITECTURE.md` holds this repository's architecture map, Firestore collection table and never-weaken rules, byte-identical to the pre-bundle root `CLAUDE.md`. It is not auto-loaded; the pointer section is what makes a session aware of it.
- `.claude/settings.json`: model `opus`, `advisorModel: fable`, `defaultMode: plan`, git/PR commands `allow`, destructive git plus `gh pr merge` `deny`, eight hooks registered (session-start on SessionStart; plan-gate and skill-router on UserPromptSubmit; routing-guard on Edit/Write/MultiEdit/NotebookEdit and git-guard on Bash, both PreToolUse; record-guard, completion-guard and validation-line on Stop), each run through `.claude/hz-loader.py`, which fetches the hook scripts from `hz-claude-config`.
- Two worker agents, both with instructions read from `hz-claude-config` and effort configured (not verifiable): `.claude/agents/opus-worker.md` (`model: opus`) for Diagnostic and System Design/Redesign work, anything touching shared state, configuration or the data model, and escalations; `.claude/agents/sonnet-worker.md` (`model: sonnet`) for Routine micro-plan-tier assignments, which escalates to opus-worker when an assignment turns out to need a design decision.
- `.claude/` is tracked; `.claude/state/` and `__pycache__/` are ignored.

## Regression table format (paste at the end of every edit)
| Feature | v<old> → v<new> | Note |
|---|---|---|
| <feature> | kept / added / intentionally removed / missing | <why, if not kept> |
