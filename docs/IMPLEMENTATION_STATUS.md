# Implementation Status

Updated: 2026-09-06 (America/Edmonton)
Baseline: `58fe21ebb6ad351094d4686a9713e6ccbdba6744`
Working release: R2 Pilot Engine

This ledger tracks implementation evidence separately from content review, real-device testing, and family piloting. A checked automated test does not imply educational or iPad validation.

## Requirements and repairs

| ID | Owner | Release | State | Artifact/commit | Verification evidence | Blocker/next action |
|---|---|---|---|---|---|---|
| GOV-01 | Codex + parent | R1–R3 | integrated | `docs/MASTER_PLAN.md`, this ledger | Master plan and one status ledger present | Maintain per release |
| F01 / ENG-01 | Codex | R1 | verified | `src/context/WordProvider.jsx` | Baseline failure reproduced; `npm run build` passes after repair; GitHub Actions passed on the working PR | Monitor checks after each push |
| F02 | Codex | R1 | verified | `src/pages/SpellingTest.jsx` | Unit test plus browser completion → Try Again → word 1, zero score | PR check |
| F03 | Codex | R1 | verified | spelling score helpers | Unit test; 25-skip browser completion showed no perfect result | PR check |
| F04 | Codex | R1 | verified | daily session route/evidence | Unit test; browser used exact five-word route and retained completion after five skips | Remote authenticated path still needs device test |
| F05 | Codex | R1 | verified | learner-bound multiplayer child sessions | Browser switch Jenn → Jess → Jenn showed isolated start/resume state | Verify remote event attribution after Firebase auth setup |
| F06 | Codex | R1 | verified | dynamic crossword generator | Long-word invariant test; browser rendered an 11×11 valid puzzle | Real iPad layout check |
| F07 | Codex | R1 | verified | batched attempt events and functional progress | Five-result unit test; crossword browser check/repair path | Remote offline reconciliation is R2 scope |
| F08 | Codex | R1 | integrated | evidence labels across existing games | Unit test for `self_report`; source inspection for assisted/timed/game labels | R2 mastery engine must enforce eligibility |
| F09 | Codex | R1 | verified | auth timeout, local store, truthful status | Browser showed local-only status after auth configuration failure; reload retained session | Verify online state after Firebase setup |
| F10 / DATA-02 | Parent + Codex | R2 | integrated locally / externally blocked | Parent sign-in/register UI; local-to-cloud attempt reconciliation; empty-cloud-only legacy import; learner-keyed async completion guards | Automated sync invariants pass; browser verified sign-in/create mode, local-only fallback, and ordinary Jenn/Jess state isolation; source/build review verifies late save/sync callbacks write only their captured learner key and cannot mutate the newly active learner | Parent must enable Email/Password in Firebase; then run two-device and in-flight-save reconciliation tests |
| F11 | Codex | R1 | verified | learner/category-bound session snapshot | Unit test rejects wrong learner; browser reload resumed word 2 with original skip count | IndexedDB/outbox expansion in R2 |
| F12 | Codex | R1 | integrated | game hints remain game-scoped; local hints work | Source review and production build | Full lesson help ladder arrives in R2 |
| DATA-01 | Codex | R2 | integrated locally | evaluator, mastery, scheduling, version-pinned delayed-review runner, revision-guarded IndexedDB session snapshots, attempt outbox, and learner-scoped local bootstrap | Recovery tests prove corrupt/missing local state restores only a matching learner/mode/content version; older IndexedDB revisions cannot replace newer snapshots; browser verified exact lesson and assessment resume after route interruption and confirmed review bootstrap; draft content remains excluded from mastery | Connect authenticated remote sync after Firebase setup; exercise the review runner after C0 is independently reviewed |
| DATA-03 | Codex | R2 | integrated locally | expiring per-tab leases and explicit takeover for resumable lesson, assessment, and review sessions | Three deterministic lease tests prove second-writer refusal, explicit takeover, stale-writer rejection, and expiry recovery; browser verified the owning lesson tab can advance; all session inputs and late cursor writes are ownership-guarded | The in-app browser exposes one isolated tab, so a natural two-tab storage-event demonstration remains to run in a shared browser; this local lease is not cross-device arbitration |
| DATA-04 | Codex + parent | R2 | integrated locally / externally blocked | Authenticated durable-session hook, stable device identity, serialized Firebase transaction adapter, and owner-scoped `spelling-sessions` rules | Pure contract tests prove first claim, returning-owner sync, second-device read-only, state-preserving explicit takeover, owner epochs, monotonic revisions, stale-owner/revision rejection, path-safe IDs, and pinned learner/mode/content/order; browser verified auth failure still permits saved local repair work without runtime errors | Deploy the rules after parent authorization, enable Email/Password auth, then verify claims, queued saves, takeover, and stale-write rejection with two linked clients; no live Firebase session write has occurred |
| EDU-01 | Codex | R2 | integrated draft preview; 4/4 packs challenged | `/case`, `lessonCatalog.js`, `lessonFlow.js`, `/lesson/:sessionId`, `reviews.c0.json` | Browser completed the C0 spelling and capitals lessons; two misses produced a worked solution; `I don’t know yet` remained unresolved and entered guided repair; pause/back resumed that exact repair; reload resumed at question 2; six independent plus two transfer tasks led to reflection/evidence; all 96 C0 lesson objects now have item-level challenge results against exact Canadian sources; seven discrepancies were corrected and recorded | Complete the separate educational/source review before integration, learner testing, release, or mastery use |
| EDU-02 | Codex | R2 | integrated draft preview | Full 34-item `/assessment/:sessionId` Form A/B runner, `/progress`, `/review`, `/parent`, `assessmentReport.js` | Browser showed 1/34 → reload at 2/34 and transition from Part A to Part B at 21/34; an explicit pause resumed at the exact item; a deliberate rapid double-click advanced only once; Jenn → Jess reset to Jess question 1 and switching back restored Jenn question 2; reports separate assistance, omission, pending, technical issues, and exposure | Independent content/audio challenge is required before placement use |
| EDU-03 | Codex | R2 | integrated draft preview | `src/components/RecordingAnswer.jsx`, `src/utils/recording.js`, `src/utils/speech.js`, IndexedDB `recordings` store | Capability/MIME/cancellation and empty/short/silent-capture tests; recording input is invalidated before Record again; recording and speech stop on item, route, or learner change; browser reached speaking item 17/34 and technical failure advanced to 18/34 without a wrong mark; blobs remain pending human review | Calibrate silence threshold and run microphone, playback, persistence, and human-review checks on a real iPad |

## Release gates

| Gate | State | Evidence / next action |
|---|---|---|
| R1-G1 build | verified locally | Production build remains green after R2 integration |
| R1-G2 regressions | verified locally | Current `npm test`: 65/65; browser restart, skips, daily, crossword, learner ownership, reload checked |
| R1-G3 legacy preservation | integrated | Legacy word IDs/collections remain readable; new attempt collection is additive; no migration/deletion |
| R1-G4 auth fallback | verified locally | Firebase `auth/configuration-not-found` led to usable local-only mode without hanging |
| R1-G5 candidate report | drafting | GitHub PR checks pass; iPad and authenticated Firebase paths are explicitly untested |
| R2 engine build | verified locally | `npm run build`: 124 modules transformed; lazy learner routes emitted |
| R2 preview journey | verified locally | Browser exercised omission → guided repair, explicit pause/exact resume, a two-miss worked solution, two complete eight-task lessons, reflection/evidence, story reveal/unlock, assessment resume, and 42-skill progress |
| R2 C0 inventory | drafting / lesson challenge complete | Exact counts exist: 68 assessment prompts, four 24-object packs, and two story episodes. All 96 lesson objects completed a recorded full-coverage challenge pass; all remain blocked from release/mastery pending separate educational/source review, while assessment and story challenges remain open |
| Content release validator | verified | Manifest proves C0 96/68/2 counts without claiming release readiness; validator rejects unknown tasks/sources/skills, broken audio, synthetic release audio, unsafe recording evaluators, and malformed role distributions |
| R2 assessment evidence | verified preview | Unit tests enforce honest categories and like-for-like comparison; browser showed assisted/omitted counts, a punctuation follow-up signal, and prior Form B exposure disclosure |
| R2 full assessment runner | verified draft preview | Both 34-item forms integrated; browser verified synthetic audio control, explicit pause/exact resume, rapid-submit protection, learner-isolated switching, speaking technical-failure continuation, exact route-interruption resume, and 20-item Part A → 14-item Part B transition; the current 65-test suite and production build pass |
| R2 delayed-review runner | integrated / content blocked | Pure tests verify reviewed-only admission, four-item cap, stable item/version pinning, feedback preservation, machine-evaluable routing, and completion; challenged-but-not-reviewed content remains excluded; browser confirms unreviewed C0 drafts cannot enter the mastery queue and its durable session bootstrap is error-free; 65 tests and production build pass | Complete educational/source review, then browser-test correct, helped, omitted, revealed-repair, pause/resume, and schedule advancement with released items |
| iPad/PWA install metadata | verified locally | Missing icon repaired; honest manifest uses real 192/512 PNGs, 180px Apple touch icon, standalone metadata, and no fake screenshot entries; automated asset checks pass | Real Safari install/offline/microphone test still required |

## Content manifest

| Batch | Required | Authored | Independently challenged | Educational/source reviewed | Integrated | Unresolved discrepancies |
|---|---:|---:|---:|---:|---:|---:|
| C0 assessment A/B | 68 prompts | 68 draft | 0 | 0 | 0 | 0 |
| C0 four pilot packs | 96 objects | 96 draft | 96 | 0 | 0 | 0 |
| C0 chapter 1 | 2 episodes | 2 draft | 0 | 0 | 0 | 0 |
| C1 | 480 objects + 6 episodes | 0 | 0 | 0 | 0 | 0 |
| C2 | 432 objects + 4 episodes | 0 | 0 | 0 | 0 | 0 |

## Known limitations and external gates

- No real-iPad Safari or installed-home-screen test has occurred.
- Browser recording controls compile and use user-triggered permission, durable blobs, and playback; microphone permission/playback was not exercised because that requires an explicit device permission decision and real-iPad follow-up.
- Firebase anonymous authentication is not enabled for the current project, so only local-only behavior was exercised in the browser.
- Parent sign-in UI and additive sync are implemented, but Firebase Email/Password is not enabled and no real account or second-device test has been performed.
- Same-browser resumable sessions now use explicit writer leases, but true two-device ownership still requires authenticated Firebase arbitration and testing.
- The cloud-session transaction contract is wired for non-anonymous parent accounts, but its Firestore rules are not deployed and the authenticated/two-device path is unverified.
- Shared family identity, reviewed curriculum content, full assessment, sourced story chapters, pronunciation recording, and family pilot remain R2/R3 work.
- IndexedDB session snapshots and the attempt outbox are integrated locally; direct browser recovery after deliberately deleting/corrupting the localStorage mirror still needs a shared-browser harness, while remote reconciliation, reviewed C0 content, pronunciation capture, and the family pilot remain incomplete.
- The implementation branch is published in draft GitHub PR #17; the latest published increment passed GitHub Actions, and each later increment must pass again before merge.
- Production publication and Firebase-console changes remain parent-authorized external actions.
