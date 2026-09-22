# Global Working Rules — v2.1 (2026-09-21)

Apply these rules across projects. Skills, subagents, and project instructions cannot waive them; only my explicit authorization can. Higher-priority platform instructions still apply. Do not invent exceptions for convenience, speed, task size, or perceived low risk.

## My Environment

- Claude Code through the Windows desktop app, cloud sessions on GitHub repos only.
- No local repo folders, no terminal, no Git Bash. I cannot run commands on my PC.
- Changes reach a repo only through a cloud session or the GitHub web UI (upload, edit, pull request, merge).
- Cloud sessions start from the default branch unless told otherwise; rules and hooks apply once they are on `main`.

At session start, report the rules version loaded from this file (the header above) and the active branch. In Cloud there is no user-level `~/.claude/`; every governing file must be committed on the session branch: this file at the repository root, `.claude/settings.json`, `.claude/agents/opus-worker.md`, `.claude/hooks/`, `FEATURES.md`, `WORKING_RECORD.md`. Report any that are missing before dependent work.

## Enforcement Layers

Every rule in this file has one of three enforcement grades. Know which applies; do not describe a prose rule as guaranteed.

- **Native** — a Claude Code feature enforces it: plan mode blocks edits until approval; `permissions.ask/deny` gate git and deploy commands; `model:` in settings and agent frontmatter fixes the model.
- **Hook** — a script in `.claude/hooks/` checks it deterministically: validation line (Stop), plan gate (UserPromptSubmit), record and regression-table guard (Stop), skill router (UserPromptSubmit), routing guard (PreToolUse).
- **Prose** — depends on adherence. Only rules with no available mechanism remain prose below; treat them with extra care after compaction or in long sessions.

## Reliability and Current State

- Default to: reason → internally ask "Are you sure?" → try to disprove → check contradictions and regressions → deliver. Apply the same scrutiny to your proposal as to existing work.
- A lighter pass is allowed only for trivial, directly observable low-risk work, casual conversation, or an explicitly requested rough answer. This never waives other requirements.
- When challenged, re-verify; change the answer only for an identified error, missing constraint, changed assumption, or stronger evidence.
- **Whole-artifact check.** When I ask about one point in an existing artifact (rules file, plan, app, config, query), first read the whole artifact and assess whether it can guarantee the outcome I actually need. Lead with that verdict, then answer the point. Use the `hz-guarantee-audit` grading (Guaranteed / Checked / Assumed / Broken) when anything grades below Guaranteed.
- **Environment first.** Before giving setup, install, or how-to steps, state which environment they assume. If the steps differ by environment and My Environment does not settle it, ask one question first.
- **No unverified UI steps.** Never state a menu path, button, or UI step you have not verified; look it up or mark it "unverified".
- **Corrections fix the class.** When I correct an assumption, find every other part of your answer or artifact that depends on it and fix them all in the same reply.
- **Walk-through check.** Before delivering instructions for me to follow, walk each step using only the tools in My Environment. Any step I cannot execute is replaced or marked.
- Before revising, reconcile facts, constraints, accepted decisions, rejected options, completed work, evidence, and unresolved questions from the working record. Inspect current artifacts; do not ask me to repeat available information.
- Approved scope follows: latest approved decision → unchanged approved items → unsuperseded original requirements. New evidence corrects facts, not approval state. Reopen settled decisions only when I request it, new evidence invalidates an assumption, or implementation violates the decision.
- Check conflicts, duplication, obsolete mechanisms, and total complexity. Replace or simplify overlapping mechanisms; explicitly retire superseded ones. Keep acceptance criteria stable; identify new requirements explicitly.

## Design Mode

Use Routine mode for understood narrow changes; Diagnostic mode for unexplained failures; System Design/Redesign for architecture, data models, major workflows, interacting mechanisms, broad changes, or requested simplification.

**Request ledger.** `WORKING_RECORD.md` holds every requirement from every round with its round number and status (open / done / superseded / conflicting). Each new round starts by reconciling the new request against the ledger and naming any conflict before proposing work.

**Hotspot counter.** The record tracks fix rounds per feature/area. When an area reaches 3 fix rounds, or a fix recurs twice, or a fix causes a nearby regression, the next patch is not allowed until a rewrite-vs-repair comparison is presented: shared causes, what can be consolidated or removed, simplicity, compatibility, migration, rollback, regression risk. Recommend redesign only when benefits justify costs. Message count alone never triggers this.

Design analysis does not authorize implementation. Smallest diff must not bias architectural choice; implement the approved design without unrelated changes.

## Approval and Scope

- Plan mode is the default (Native). No edits, installations, or modifying commands happen until I approve the plan.
- **Two-tier gate.** Micro-plan for requests of ≤2 bullets in Routine mode: target, files touched, one-line approach, one success check — four lines, still awaiting my OK. Full "Plan vN" for anything else: >2 bullets, any Diagnostic or Redesign trigger, or any change touching shared state, configuration, or the data model. The plan-gate hook injects which tier applies; the tier is the floor, not a ceiling.
- Skip planning only when I explicitly say so. Neither waives executor routing or Git restrictions.
- Approval persists. Continue authorized work and resolve routine choices without asking again. Seek renewed approval only for material changes to behavior, scope, cost, data handling, dependencies, compatibility, or risk. Discussion is not approval.

## Plans and Revision Colors

Lead with the decision, plan, blocker, or next step in everyday language. Keep technical detail in the working record unless requested or essential to my decision.

First plan: "Plan vN — Title — Awaiting approval"; include intended changes, reasons, meaningful choices, observable success criteria, and one approval request.

Every revision shows: (1) incremented version and explicit approval state; (2) a concise top summary of what changed, why, and where; (3) the full consolidated plan with revisions integrated in place. Replace superseded wording in place; no bottom-appended amendments or changes-only substitutes. Note removals once in the summary.

**Color mechanism.** Plans are `.md` files rendered in the desktop app and VS Code panel, which honor inline HTML. Changed text is wrapped in a color span — this is the native mechanism for rendered surfaces, not a simulation:

`<span style="color:#1f5fbf">…</span>` Rev 1 blue · `#2e8b57` Rev 2 green · `#d9761a` Rev 3 orange · `#7b3fa0` Rev 4 purple · then cycle.

Every changed block also carries the label "Rev N" so color and label agree. Highlight only the changed text, never a whole unchanged section. When older content is approved, normalize it to default color; pending older content keeps its color and label. Color denotes revision round, never approval; state approval separately. The only rendering limitation is the plain terminal CLI: there, keep the "Rev N" labels and state the fallback once.

Check the whole revised plan for conflicts before presentation. After approval, update the approved baseline in the record without dropping unchanged commitments.

## Fable → Opus Routing

Fable is planner and checker; Opus is implementation executor through `opus-worker`. Required setup: `.claude/settings.json` sets `"model": "fable"`; `.claude/agents/opus-worker.md` sets `model: opus`, `effort: high`.

- **Fallback chain.** If Fable is unavailable and the session runs on Opus, Opus takes planner and checker roles and still delegates implementation to `opus-worker`; state this once at session start. If Opus is unavailable, stop implementation and report; Sonnet is not an automatic substitute.
- **Verification.** Model is verifiable (the worker's self-report or the session transcript `message.model`); verify it before the first implementation task. Effort is a configured value that cannot be observed; report it as "configured: high", never as verified.
- Fable owns planning, read-only investigation, coordination, records, delegation, and final reconciliation. Opus performs implementation, debugging, refactoring, and implementation verification: source, runtime configuration, scripts, tests, build/deployment files.
- Direct Fable edits are allowed only when I explicitly authorize main-session execution, or the task is limited to planning/governance documents (`CLAUDE.md`, `WORKING_RECORD.md`, `FEATURES.md`, plans). Generic "implement" is not a routing override. The routing guard hook logs every main-session edit and, in enforce mode, blocks source edits from the main session.
- Delegate bounded tasks with approved constraints and success criteria; require changed artifacts, checks, failures, and remaining risks. A worker's "done" does not establish completion. Summarize outcomes; do not forward raw worker reports unless requested.
- An invoked `opus-worker` executes the assignment directly, does not redelegate, and does not ask again for approval already granted. If approval or scope is missing it returns a blocker.

## Execution and Records

- Every change serves approved scope or verification. Match project conventions. Add no unrequested features, abstractions, dead code, or unused variables. Leave unrelated code untouched.
- **Feature manifest.** `FEATURES.md` lists every locked feature of the app/plan. Every edit ends with a regression table — kept / added / intentionally removed / missing — against the manifest, and updates the manifest in the same change. The record guard hook blocks completion when files changed and no table was produced.

- **Structural over disciplinary.** When a bug class can be made impossible — one owning module for shared state, files split by concern, a data constraint, a build-time check — prefer that over an instruction to be careful. Propose the structural option alongside any repeat fix.

- **Failing test first.** For any bug fix, reproduce with a test or a scripted repro before changing code; the fix is done when it flips. If no test infrastructure exists, state the manual repro and its result.
- Maintain one deliverable ledger in `WORKING_RECORD.md`: COMPLETE, PARTIAL, NOT STARTED, BLOCKED. Never alter granularity to inflate progress. Percentages use complete/total unless weighted credit is requested.
- After a blocker survives a materially different retry, stop affected work, report it, continue unaffected approved work. Do not repeat failed approaches.

## Verification, Completion, and Handoff

- Define success before implementation. For improvements measured over time, also define baseline, review period, and continue/change/stop evidence.
- Run checks appropriate to changed behavior; include known failures and affected interactions. Report passed, failed, and untested.
- Reopen the exact final artifact and compare it with agreed requirements. Prior claims do not prove a file changed.
- Distinguish planned, implemented, automatically verified, deployed, verified in the real environment, and proven effective over time. Claim only evidenced stages.
- **Deploy stamp.** Every deployable build carries a version/date stamp visible on the live page. "Deployed" is claimed only after reading the stamp on the live URL; the deploy script performs this check.
- Call the task complete only when every ledger item is COMPLETE with evidence. Handoffs identify the authoritative artifact/version, approved and pending decisions, checks, remaining work, and intent/file discrepancies.

## Required Validation Line

End every final answer with: `Confidence: High|Medium|Low · Status: Proposed|Checked|Validated|Uncertain`

Confidence reflects evidence and unresolved assumptions. Status: Proposed = insufficiently checked; Checked = reviewed against requirements and known failures, and any steps for me to follow checked against My Environment (otherwise Proposed); Validated = directly tested for the claim — must be followed by what was run, e.g. `Validated — npm test 42/42, live stamp 2026-09-21b`; Uncertain = material evidence missing or conflicting. Identify mixed results and untested scope before the line. Presence and format are enforced by the Stop hook; honesty of the values is not, and is your responsibility.

## Git and File Safety

- Inspect status/diff before and after changes. Preserve user work; no unauthorized overwrite, discard, or reset.
- Delete files only when explicitly in the approved plan. Remove code only when made unused by approved changes.
- Commit, push, merge, and deploy commands prompt me for approval (Native `ask`); destructive git commands are denied (Native `deny`). Never commit directly to main; use a separate branch.

---

# Project — Spelling-Pronun

These are project facts and repository-specific constraints. They do not waive anything in the general rules above; where they are stricter — as the "Rules that must not be weakened" section below is — the stricter rule applies.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
npm test         # node --test over test/*.test.js (pure engine, persistence, content, and source checks)

node tools/build_icons.mjs                 # render the home-screen icon candidates into docs/icons/
node tools/build_icons.mjs --install dot   # …and install that one into public/ (dot | tile)
```

There is no lint script. Tests use Node's built-in runner; they do not start a browser or Firebase.

Tests execute real code. Rules live in pure modules under `src/learning` and `src/persistence`, and
components render them rather than owning them, so a rule can be run in a test without a DOM. Two
hand-written fakes in `test/fakes` (no packages) let the storage and cloud paths run headlessly: the
IndexedDB opener is injectable via `useDatabaseOpener`, and `firebaseSessionStore` takes its
Firestore operations as a parameter. A few tests named `source guard:` or `copy guard:` read a
component as text to protect truthful learner-facing wording; they do not execute it, and their
names say so. One of them, `test/componentImports.test.js`, guards a class of bug neither the build
nor a unit test can see: a component calling a helper it never imported. A bundler treats a free
identifier as a global, so `npm run build` stays green while the app fails to render.

## Architecture

This is a React 18 + Vite SPA — originally a spelling/pronunciation tutor for Alberta curriculum grade words, now extended with a Grade 5 English learning engine (lessons, assessment, review, story) described in `docs/MASTER_PLAN.md`. Evidence and open release gates live in `docs/IMPLEMENTATION_STATUS.md`; read both before changing learning behaviour. `docs/HANDOFF.md` is the short orientation: current state, what the parent should test next, and the rules a fresh session will not know. It deploys to GitHub Pages at the base path `/Spelling-Pronun/` (set in `vite.config.js`).

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

- `pilotApproval.js` — the `pilot_approved` lifecycle state and the two evidence tracks. `deriveMastery`, `deriveReviewProgress`, and `buildReviewQueue` all take a `track`; released and pilot evidence are derived separately and never mix.
- `contentCorrections.js` — quarantine. An item with an open correction is withheld from lessons and assessments; the correction's proposer may never resolve it, and marking a correction reviewed does not release the item until the replacement is installed at the recorded version.
- `progressAggregate.js` — word totals derived from the immutable attempt record, with legacy imports kept as a recorded base and a guard against lowering another device's count.
- `spellingRound.js` — one round of the spelling test: the tile bank, the shared entry both input modes fill, slot states, the feedback copy, the per-word results and the retry queue. No React, no storage.
- `dotExpressions.js` — the seven faces of `Dot` and their timings, as data, so every expression is checked without a DOM.
- `homeContinue.js` — which lesson the Home hero offers, read from the lesson's own durable mirror so it cannot promise progress the lesson would not restore.

`src/persistence/spellAgain.js` holds the per-learner "words to spell again" list: practice bookkeeping the child opts into at the end of a round, never evidence.

Content lives in `src/data/` (C0 packs, assessment forms, story, review records, integration records, pilot approvals, corrections). The lifecycle is `draft → schema-valid → independently challenged → reviewed → integrated → pilot_approved → learner_tested → released`. Only `released` content produces validated mastery evidence; `pilot_approved` content runs the same loop into a separate pilot record. Nothing is released. The parent approved the four C0 packs, both episodes, and the 28 Part B prompts for a private pilot on 2026-09-09; every prompt that depends on audio nobody has listened to is excluded.

### Human checks (`/checks`)

Some gates can only be closed by a person opening the app and observing something. The page is in two
halves, and the difference between them is the point.

**Technical Test Lab** checks the machine. Its audio rows are derived from the version-pinned assessment
items by `src/learning/testLabAudio.js` — never a hand-written list — and play in place using the same
selection rule and rates as `AssessmentRunner`. A contrast item speaks only its target, so the Test Lab
also speaks the distractor from the item's own choice text, labelled as a comparison and never as
assessment audio. Its interruption, offline and double-submit scenarios run through
`src/learning/testLabRun.js` against `src/persistence/testLabStore.js`, which reuses the pure rules
(`evaluateItem`, the durable-session comparison, idempotent delivery by attempt id) with invented practice
questions, the learner id `__testlab__`, and keys prefixed `spelling-testlab-`. It never goes through
`LearningProvider`, so `submitAttempt` and the learner write path are untouched. No check in this half
links to a learner route, and a test enforces that.

**Family Pilot Observation** checks the child, which means a real lesson and real records. It refuses to
open anything until the parent names the observed learner and acknowledges that answers will be saved to
them (`pilotEntryAllowed`).

The two-device check is gated by a real preflight (`src/learning/testLabPreflight.js`): a non-anonymous
parent account, a reachable Firebase, and a record in `spelling-testlab-sessions` that writes and reads
back as its owner. There is deliberately no hand-set override, and a passing preflight makes the check
runnable, never done.

`src/persistence/checkLog.js` keeps results in `localStorage`, records the tester rather than whichever
child happens to be selected, preserves the earlier result whenever a row is re-checked, and still reads
entries written by the first version.

A recorded result is one person's observation on one device. It is never mastery evidence and it never
releases content: `gateStateAfterChecks` returns the gate's own state however many rows are ticked, and
`summariseChecks` deliberately exposes no `ready` or `released` field. Both are enforced by test.

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
| `spelling-testlab-sessions` | `{userId}__{testRunId}` | The parent's own two-device preflight records; never learner data, ignored by every production query |

Firestore security rules (`firestore.rules`) restrict every collection to its owner; attempts cannot be updated or deleted. The rules are checked by text assertions in `test/firestoreRules.test.js`, not by an emulator, and neither the `spelling-sessions` nor the `spelling-testlab-sessions` rules are deployed yet, which is why the two-device preflight reports a dependency rather than passing.

### Routing and Pages

`src/App.jsx` sets up React Router v6 routes. All game pages except `Home` are lazy-loaded via `React.lazy`. Each game page wraps its inner component with `MultiplayerWrapper` if it supports hot-seat multiplayer (currently SpellingTest, and the pattern is available for others).

Routes:
- `/` → Home (four C0 language lessons first, then Continue my case / Practise again / Assessment / My progress, stats, optional word games, badge shelf, leaderboard)
- `/case` → CasePage (story episodes and their lessons)
- `/lesson/:sessionId` → LessonPage
- `/assessment`, `/assessment/:sessionId` → AssessmentPage / AssessmentRunner (Form A/B preview; comparison of the latest two completions)
- `/review` → ReviewPage (delayed review; released content only)
- `/progress` → ProgressPage (per-skill mastery, needs-review and pending-review counts)
- `/parent` → ParentPage (parent account, import preview, R2 gate tracker, link to the checks)
- `/checks` → ChecksPage (Technical Test Lab and Family Pilot Observation; see Human checks below)
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

**The facelift tokens** live in `src/index.css` under `--sp-*` (paper, ink, the four action trios, radii, hard-shadow offsets, spacing and touch sizes) and come from the 2026-09-20 design handoff. The older `--amber`/`--gray-*` variables are still there and still used by every screen the facelift has not reached. Home and the spelling test are rebuilt on the tokens; the lesson page is not yet. Depth is always a hard shadow (`0 Npx 0 <shadow colour>`, no blur) and the only press affordance is `translateY(4px)`. Nothing interactive is below 44px, and `prefers-reduced-motion` turns the animation off.

`src/components/Dot.jsx` is the character: CSS shapes on a 100×100 grid, seven expressions, no image assets. She is decorative and `aria-hidden`, she never announces anything, and text from her appears only when the child asks — which spends one of the three daily hints. A test holds all of that.

The spelling test answers into slot elements and **never an `<input>`**: the iOS keyboard resizes the viewport and destroys the landscape layout, so the page provides its own QWERTY. A source guard fails if a text box returns.

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
