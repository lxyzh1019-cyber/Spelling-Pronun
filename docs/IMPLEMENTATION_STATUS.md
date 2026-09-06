# Implementation Status

Updated: 2026-09-05 (America/Edmonton)
Baseline: `58fe21ebb6ad351094d4686a9713e6ccbdba6744`
Working release: R1 Repair

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

## Release gates

| Gate | State | Evidence / next action |
|---|---|---|
| R1-G1 build | verified locally | `npm run build`: 92 modules transformed, production bundle generated |
| R1-G2 regressions | verified locally | `npm test`: 8/8; browser restart, skips, daily, crossword, learner ownership, reload checked |
| R1-G3 legacy preservation | integrated | Legacy word IDs/collections remain readable; new attempt collection is additive; no migration/deletion |
| R1-G4 auth fallback | verified locally | Firebase `auth/configuration-not-found` led to usable local-only mode without hanging |
| R1-G5 candidate report | drafting | Await GitHub PR checks; iPad and authenticated Firebase paths are explicitly untested |

## Content manifest

| Batch | Required | Authored | Independently challenged | Educational/source reviewed | Integrated | Unresolved discrepancies |
|---|---:|---:|---:|---:|---:|---:|
| C0 assessment A/B | 68 prompts | 0 | 0 | 0 | 0 | 0 |
| C0 four pilot packs | 96 objects | 0 | 0 | 0 | 0 | 0 |
| C0 chapter 1 | 2 episodes | 0 | 0 | 0 | 0 | 0 |
| C1 | 480 objects + 6 episodes | 0 | 0 | 0 | 0 | 0 |
| C2 | 432 objects + 4 episodes | 0 | 0 | 0 | 0 | 0 |

## Known limitations and external gates

- No real-iPad Safari or installed-home-screen test has occurred.
- Firebase anonymous authentication is not enabled for the current project, so only local-only behavior was exercised in the browser.
- Shared family identity, durable IndexedDB outbox, curriculum content, assessment, story, pronunciation recording, and family pilot remain R2/R3 work.
- Production publication and Firebase-console changes remain parent-authorized external actions.
