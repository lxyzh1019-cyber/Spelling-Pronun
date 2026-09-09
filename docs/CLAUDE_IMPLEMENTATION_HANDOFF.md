# Claude implementation handoff

Updated: 2026-09-07 (America/Edmonton)

This file transfers day-to-day implementation to Claude. Codex will supervise and audit Claude's work against `docs/MASTER_PLAN.md` and `docs/IMPLEMENTATION_STATUS.md`. It is a status handoff, not a replacement plan and not permission to weaken a release gate.

## Repository starting point

- Repository: `lxyzh1019-cyber/Spelling-Pronun`
- Base branch: `main`
- Working branch: `codex/implementation-plan`
- Draft pull request: <https://github.com/lxyzh1019-cyber/Spelling-Pronun/pull/17>
- Baseline before this implementation: `58fe21ebb6ad351094d4686a9713e6ccbdba6744`
- Handoff head before this document: `203bab0ef4ab2f04e47c5ba2d4b220e75c9d4859`
- PR state at handoff: draft, cleanly mergeable, GitHub Actions successful
- Local verification at handoff: `npm test` passes 102/102; `npm run build` passes with 129 modules transformed

Claude should continue on the existing working branch and PR unless the user explicitly requests another workflow. Do not merge PR #17 or publish a production release merely because automated checks pass.

## Work completed

### R1 repair and preservation

- Restored the production build and added GitHub build/test checks.
- Fixed spelling-test reset and skip/perfect-score errors.
- Corrected daily-challenge accounting, learner attribution, crossword sizing, and batched attempt persistence.
- Preserved legacy word IDs, profiles, and history; new learning attempts are additive.
- Labelled flashcard self-report and game activity honestly so they do not become independent mastery evidence.
- Added a truthful local-only fallback when Firebase authentication is unavailable.
- Added PWA icons, standalone metadata, and production-only service-worker registration.

### R2 learning engine

- Implemented immutable, learner-scoped attempt records and evidence categories.
- Implemented evaluators for spelling, choices, punctuation, sentence repair, human-rubric pending states, omissions, and technical failures.
- Implemented mastery derivation and delayed-review scheduling with independent-evidence rules.
- Implemented resumable, content-version-pinned lesson, assessment, and review sessions.
- Added IndexedDB session snapshots, local identity-bound mirrors, attempt outbox, duplicate protection, and recovery from corrupt or incompatible local state.
- Added same-browser writer leases, explicit takeover, and stale-writer rejection.
- Added the authenticated cloud-session transaction adapter and candidate Firestore rules; these remain undeployed and unverified on two devices.
- Added progress, parent, review, assessment, lesson, and story routes.

### C0 pilot content and product flow

- Authored and challenged 68 assessment prompts across matched Form A and Form B.
- Authored, challenged, educationally reviewed, and integrated four 24-object lesson packs (96 objects):
  - spelling patterns;
  - complete sentences;
  - capitals and end marks;
  - subject and object pronouns.
- Authored, challenged, source-reviewed, and integrated the two Chapter 1 story episodes.
- Implemented the lesson sequence: teaching examples -> independent attempts -> feedback -> guided repair -> worked solution after two misses -> unseen transfer -> reflection -> completion.
- Implemented matching post-assessment lesson recommendations only for covered C0 tracks. The app refuses to substitute an unrelated lesson for uncovered decoding or pronunciation results.
- Implemented the assessment runner, honest per-track reports, A/B comparison and prior-exposure disclosure.
- Implemented the delayed-review runner, but it correctly excludes unreleased C0 content.
- Changed the home screen and header to prioritize Learn, Assessment, Progress, and the four C0 language lessons. Original spelling games remain available as optional practice.
- Separated word-game totals from language-lesson progress in the interface.

### Audio, recording, and learner isolation

- Added scoped, cancellable speech playback across learner/item/route changes.
- Added reviewed-recording playback support and a versioned human-audio registry seam.
- Added truthful Canadian-English/fallback messages and visible audio retry/defer wording.
- Added feature-detected microphone recording, short/silent/empty capture handling, local IndexedDB storage, playback, and pending-human-review status.
- Enlarged Start/Stop recording controls to a 56px minimum height, 190px minimum width, and 1.125rem text with distinct start/stop states and keyboard focus treatment after user testing.
- Technical audio or microphone failures advance as technical issues, not wrong answers.

### Verification and preparation

- Current automated suite: 102/102 passing.
- Current production build: 129 modules transformed.
- Browser checks cover lesson repair, pause/resume, story unlock/recap, assessment resume and Part A-to-B transition, profile isolation, session recovery, two-tab takeover, audio cancellation, technical-failure continuation, parent gate display, and the lesson-first home/grammar route.
- Prepared a mapping for all remaining 38 C1/C2 packs (912 future objects) and ten future episodes without claiming they are authored or released.
- Prepared official research destinations and explicit claim boundaries for Chapters 2–6. These are research leads, not verified episode sources.
- Added a Parent-view tracker for the five external dependency groups.

## Current user feedback already incorporated

- Existing spelling test, flashcards, word scramble, hangman, and crossword function correctly in user testing.
- The earlier interface looked too similar to the original spelling tutor and hid grammar/sentence/punctuation work. The branch now leads with the four language lessons and primary learning navigation.
- Start/Stop recording controls were too small. They have been enlarged in commit `203bab0`.

## Work remaining

### Gate snapshot

| Gate | Handoff state | Meaning |
|---|---|---|
| R1-G1–G4 | verified/integrated locally | Build, regressions, legacy preservation, and truthful auth fallback are covered. |
| R1-G5 | candidate report remains draft | The evidence ledger exists, but device/Firebase limitations still prevent a final release claim. |
| R2-G1 | incomplete | Forty Part-A assessment prompts still require human audio or specialist review; all C0 content still requires learner testing before release. |
| R2-G2 | partial preview only | The flow works through preview content, but a real delayed-review journey requires released content. |
| R2-G3 | verified locally | Correct, wrong, skipped, helped, pending, and technical-failure paths are independently protected. |
| R2-G4 | partial/local only | Durable/local behavior is covered; Firebase shared identity and two linked clients are not verified. |
| R2-G5 | verified locally | A/B comparison, incomplete/resume, assisted exclusion, and pending speaking states are covered. |
| R2-G6 | incomplete | No real iPad Safari/home-screen evidence exists. |
| R2-G7 | not started | No family pilot has occurred. |
| R3-G1–G7 | not started | Only inventory/source/research preparation exists; no C1/C2 final content is authored. |

### R2-G1: finish C0 assessment review and integration

Status: blocked on real review inputs, and on six open content corrections.

- Complete the listening check for the 24 spoken prompts in `docs/AUDIO_REVIEW_HANDOFF.md`. Reviewed model audio is acceptable when labelled truthfully; a human recording is required only for isolated phoneme audio (decision CHG-07, 2026-09-08).
- Complete the educational review for the 16 listed decoding and speaking prompts.
- Resolve `corr.c0.001`–`corr.c0.006` in `src/data/corrections.c0.json`. Their items are withheld from lessons and assessments until Codex records a review; Claude proposed them and may not resolve them.
- Record reviewer role/date, sources, findings, and resolved discrepancies.
- Attach versioned audio assets with exact transcripts and truthful locale metadata.
- Promote only verified Part-A items from challenge-only to educational/source reviewed, then integrated.
- Keep all C0 content unreleased until learner and device gates pass.

Current inventory boundary:

- 96/96 lesson objects reviewed and integrated, none released.
- 68/68 assessment prompts challenged.
- 28/68 assessment prompts educationally reviewed and integrated.
- 40/68 Part-A prompts remain blocked by human audio or specialist review.
- 2/2 Chapter 1 episodes reviewed and integrated, none released.

### R2-G2: complete one real end-to-end pilot journey

Status: partially verified with unreleased preview content.

After C0 release eligibility exists, verify one actual journey:

`assessment -> matching lesson -> first answer -> explanation -> repair -> unseen transfer -> story reveal -> delayed review queue -> progress report`

The delayed-review portion cannot be closed by admitting draft content. It must use explicitly reviewed, learner-tested, and released content.

### R2-G4: shared identity and two-device verification

Status: code integrated locally; external setup incomplete.

- Obtain parent authorization for Firebase changes.
- Enable Email/Password authentication.
- Deploy the candidate `spelling-sessions` Firestore rules.
- Test two linked clients for claim, read-only state, explicit takeover, queued saves, reconnection, stale-owner rejection, and no cross-learner leakage.
- Record actual evidence; pure transaction tests do not close this gate.

### R2-G6: real iPad verification

Status: not performed.

- Test Safari and installed home-screen mode.
- Test lesson/assessment input, pause/resume, offline/update behavior, playback, microphone permission, Start/Stop controls, recording quality, local playback, interruption, and technical-failure defer paths.
- Record the device/iOS/browser mode and results. Desktop emulation does not close this gate.

### R2-G7: family pilot

Status: not started.

- Begin only after R2-G1 through R2-G6 are satisfied.
- Aim for two resumed visits per child and one delayed review after at least seven days when practical.
- Record actual exposure, unclear explanations, grading disagreements, navigation problems, progress loss, and item IDs.
- Claude fixes software defects; Codex audits content observations and gate evidence.
- Do not claim a pilot occurred until the children actually use the candidate.

### R3: full curriculum and story

Status: mapping/research preparation only; final authoring has not started.

Begin final C1/C2 authoring only after the R2 pilot feedback is reviewed, as required by the master plan.

- C1: 20 packs / 480 objects and Chapters 2–4 / six episodes.
- C2: 18 packs / 432 objects and Chapters 5–6 / four episodes.
- Final total: 42 packs / 1,008 lesson objects, 68 separate assessment prompts, and 12 episodes.
- Every released primary skill needs teaching, guided practice, independent questions, transfer, and delayed review.
- Select two compatible episode-specific historical sources per chapter before learner-facing authoring.
- Chapter 3 requires relevant Indigenous nation/community sources; a generic archive collection cannot substitute for them.
- Complete item-level challenge, educational/source review, integration, learner testing, device regression, and final acceptance-matrix evidence.
- Update README/CLAUDE documentation to actual final behavior only after implementation is true.

## Items awaiting Codex review (opened 2026-09-08)

| Correction | Items | What Claude proposed |
|---|---|---|
| `corr.c0.001` | `c0.pu.capitals-endmarks.19` | Explanation rewritten: "Falling rocks." is a fragment that is conventional on a sign, not a complete sentence |
| `corr.c0.002` | `c0.sp.patterns.06` | Explanation rewritten: the tch rule keyed to the vowel sound, with the Canadian pronunciation of *watch* described honestly |
| `corr.c0.003` / `corr.c0.004` | `c0.assessment.a.11`, `.12`, `c0.assessment.b.11`, `.12` | Print-only segmentation item plus an unscored read-aloud self-comparison; decoding reported as not measured |
| `corr.c0.005` / `corr.c0.006` | `c0.assessment.a.33`, `c0.assessment.b.33` | Explicit intended meaning, a four-target answer key, and the ambiguous alternative named and excluded |

Codex resolves each by setting `reviewStatus` to `reviewed` with `reviewedBy: 'codex'`, or by returning it with findings. The validator rejects a correction reviewed by the role that proposed it.

## Rules Claude must preserve

- Never convert synthetic speech into `reviewed_human` audio.
- Never auto-score pronunciation from speech-to-text or a transcript match.
- Never count assisted, revealed, pending-review, omitted, technical-failure, self-report, or unreleased-content attempts as independent mastery.
- Never overwrite an original wrong answer with a repaired answer.
- Never admit draft/reviewed-only content to the released delayed-review queue.
- Never claim Firebase, two-device, real-iPad, learner-test, pilot, or release evidence without the real event and recorded result.
- Never reduce the required inventory silently.
- Preserve legacy data and immutable attempt history; do not use destructive migrations.
- Keep historical facts, fictional reconstruction, and uncertainty visibly separate.
- Do not merge PR #17 while the user intends it to represent a completed plan and the listed release gates remain open. (PR #17 was merged on 2026-09-08 at `6f76557`; the audit corrections continue on `codex/r2-correction`.)
- Never present pilot evidence as released evidence, and never add a pilot approval record without a recorded parent decision.
- Never resolve a content correction Claude proposed; only the named reviewer may.

## Claude delivery protocol

For every implementation batch:

1. Pull the latest `codex/implementation-plan` branch and inspect the working tree before editing.
2. Read `docs/MASTER_PLAN.md`, `docs/IMPLEMENTATION_STATUS.md`, and this handoff.
3. State the exact requirement/gate being advanced.
4. Make the smallest coherent implementation and preserve unrelated user changes.
5. Add or update tests for the behavior and failure path.
6. Run `npm test` and `npm run build`.
7. Update `docs/IMPLEMENTATION_STATUS.md` without upgrading external evidence from assumptions.
8. Commit and push to the existing PR branch.
9. Report the commit SHA, changed files, commands/results, browser/device evidence, and gates still open.
10. Wait for Codex audit before treating the batch as accepted or recommending merge.

## Codex supervision and audit protocol

Codex will:

- review Claude's diff against the master plan and this handoff;
- verify inventory counts, content lifecycle states, evaluator behavior, evidence eligibility, persistence, learner isolation, and privacy boundaries;
- rerun proportionate automated/build checks and inspect GitHub Actions;
- independently challenge educational answers, explanations, grading ambiguity, source claims, and fictional/history labelling where affected;
- distinguish unit, browser, real-device, reviewer, and pilot evidence;
- record defects with severity and required correction;
- approve a gate only when its required evidence exists;
- recommend merge only when the intended release scope and authorization state are truthful.

## Primary reference files

- `docs/MASTER_PLAN.md` — authoritative requirements and gates.
- `docs/IMPLEMENTATION_STATUS.md` — current evidence ledger.
- `docs/AUDIO_REVIEW_HANDOFF.md` — the parent listening check (24 dictation and contrast prompts, plus the 12 receptive decoding recordings) and the educational review of the 16 decoding and speaking prompts.
- `src/data/integration.c0.json` — current C0 integration records.
- `src/data/curriculum.c1-c2.preparation.json` — future pack/episode mapping only.
- `src/data/story.research.c1-c2.json` — future story research boundaries only.
- `src/data/r2GateTracker.js` — learner-facing external dependency tracker.
