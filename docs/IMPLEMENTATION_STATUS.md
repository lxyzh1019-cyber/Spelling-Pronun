# Implementation Status

Updated: 2026-09-06 (America/Edmonton)
Baseline: `58fe21ebb6ad351094d4686a9713e6ccbdba6744`
Working release: R2 Pilot Engine

This ledger tracks implementation evidence separately from content review, real-device testing, and family piloting. A checked automated test does not imply educational or iPad validation.

## Requirements and repairs

| ID | Owner | Release | State | Artifact/commit | Verification evidence | Blocker/next action |
|---|---|---|---|---|---|---|
| GOV-01 | Codex + parent | R1–R3 | integrated | `docs/MASTER_PLAN.md`, this ledger | Master plan and one status ledger present | Maintain per release |
| F01 / ENG-01 | Codex | R1 | verified | `src/context/WordProvider.jsx` | Baseline failure reproduced; `npm run build` passes after repair | Verify GitHub Actions on PR |
| F02 | Codex | R1 | verified | `src/pages/SpellingTest.jsx` | Unit test plus browser completion → Try Again → word 1, zero score | PR check |
| F03 | Codex | R1 | verified | spelling score helpers | Unit test; 25-skip browser completion showed no perfect result | PR check |
| F04 | Codex | R1 | verified | daily session route/evidence | Unit test; browser used exact five-word route and retained completion after five skips | Remote authenticated path still needs device test |
| F05 | Codex | R1 | verified | learner-bound multiplayer child sessions | Browser switch Jenn → Jess → Jenn showed isolated start/resume state | Verify remote event attribution after Firebase auth setup |
| F06 | Codex | R1 | verified | dynamic crossword generator | Long-word invariant test; browser rendered an 11×11 valid puzzle | Real iPad layout check |
| F07 | Codex | R1 | verified | batched attempt events and functional progress | Five-result unit test; crossword browser check/repair path | Remote offline reconciliation is R2 scope |
| F08 | Codex | R1 | integrated | evidence labels across existing games | Unit test for `self_report`; source inspection for assisted/timed/game labels | R2 mastery engine must enforce eligibility |
| F09 | Codex | R1 | verified | auth timeout, local store, truthful status | Browser showed local-only status after auth configuration failure; reload retained session | Verify online state after Firebase setup |
| F10 / DATA-02 | Parent + Codex | R2 | not started | — | — | Parent email/password provider setup required during R2 |
| F11 | Codex | R1 | verified | learner/category-bound session snapshot | Unit test rejects wrong learner; browser reload resumed word 2 with original skip count | IndexedDB/outbox expansion in R2 |
| F12 | Codex | R1 | integrated | game hints remain game-scoped; local hints work | Source review and production build | Full lesson help ladder arrives in R2 |
| DATA-01 | Codex | R2 | integrated | evaluator, mastery, scheduling, session engine, IndexedDB outbox, and learner-scoped local store | Focused engine/validator tests plus production build | Connect authenticated remote sync after Firebase setup |
| EDU-01 | Codex | R2 | integrated preview | `/case` and `/lesson/:sessionId` explicit learning flow | Browser: wrong first answer → separate helped repair → unseen transfer → gated reveal; reload persistence implemented | Replace fixtures with independently reviewed C0 pack |
| EDU-02 | Codex | R2 | integrated draft preview | Full 34-item `/assessment/:sessionId` Form A/B runner, `/progress`, `/review`, `/parent`, `assessmentReport.js` | Browser showed 1/34 → reload at 2/34 and transition from Part A to Part B at 21/34; reports separate assistance, omission, pending, technical issues, and exposure | Independent content/audio challenge is required before placement use |
| EDU-03 | Codex | R2 | integrated foundation | `src/utils/recording.js`, IndexedDB `recordings` store | Capability/MIME tests; explicit permission/technical failure reasons; blobs remain pending human review | Add learner recording control and real iPad microphone/playback test |

## Release gates

| Gate | State | Evidence / next action |
|---|---|---|
| R1-G1 build | verified locally | `npm run build`: 92 modules transformed, production bundle generated |
| R1-G2 regressions | verified locally | `npm test`: 8/8; browser restart, skips, daily, crossword, learner ownership, reload checked |
| R1-G3 legacy preservation | integrated | Legacy word IDs/collections remain readable; new attempt collection is additive; no migration/deletion |
| R1-G4 auth fallback | verified locally | Firebase `auth/configuration-not-found` led to usable local-only mode without hanging |
| R1-G5 candidate report | drafting | Await GitHub PR checks; iPad and authenticated Firebase paths are explicitly untested |
| R2 engine build | verified locally | `npm run build`: 106 modules transformed; lazy learner routes emitted |
| R2 preview journey | verified locally | Browser exercised repair, transfer gate, story reveal, assessment resume, and 42-skill progress |
| R2 C0 inventory | drafting | Exact draft counts now exist: 68 assessment prompts, four 24-object packs, and two story episodes; all remain blocked from release/mastery pending independent educational/source challenge |
| R2 assessment evidence | verified preview | Unit tests enforce honest categories and like-for-like comparison; browser showed assisted/omitted counts, a punctuation follow-up signal, and prior Form B exposure disclosure |
| R2 full assessment runner | verified draft preview | Both 34-item forms integrated; browser verified synthetic audio control, exact resume, and 20-item Part A → 14-item Part B transition; 27 automated tests and production build pass |

## Content manifest

| Batch | Required | Authored | Independently challenged | Educational/source reviewed | Integrated | Unresolved discrepancies |
|---|---:|---:|---:|---:|---:|---:|
| C0 assessment A/B | 68 prompts | 68 draft | 0 | 0 | 0 | 0 |
| C0 four pilot packs | 96 objects | 96 draft | 0 | 0 | 0 | 0 |
| C0 chapter 1 | 2 episodes | 2 draft | 0 | 0 | 0 | 0 |
| C1 | 480 objects + 6 episodes | 0 | 0 | 0 | 0 | 0 |
| C2 | 432 objects + 4 episodes | 0 | 0 | 0 | 0 | 0 |

## Known limitations and external gates

- No real-iPad Safari or installed-home-screen test has occurred.
- Browser recording controls compile and use user-triggered permission, durable blobs, and playback; microphone permission/playback was not exercised because that requires an explicit device permission decision and real-iPad follow-up.
- Firebase anonymous authentication is not enabled for the current project, so only local-only behavior was exercised in the browser.
- Shared family identity, reviewed curriculum content, full assessment, sourced story chapters, pronunciation recording, and family pilot remain R2/R3 work.
- The IndexedDB attempt outbox and learner-facing R2 routes are integrated locally; remote reconciliation, reviewed C0 content, pronunciation capture, and the family pilot remain incomplete.
- The GitHub installation currently permits reads but rejected branch/blob creation with `Resource not accessible by integration`; the tested commits remain local until repository write scope is restored.
- Production publication and Firebase-console changes remain parent-authorized external actions.
