# WORKING RECORD — Spelling-Pronun — rules v2

Single working record for this repository. Updated by the main session at the end of every
implementation turn (the record guard hook checks this). Keep it terse; history lives in git.

## Approved baseline
- Plan v1 approved 2026-09-28 (R4): share the 48-question diagnostic result in one tap. Share sheet + dated file download + printable page; one combined all-children report; device only, no cloud and no share link; keep the existing tested wording and add a summary lead, a completion count and the child's actual wrong choices. Branch `diagnostic-share`.
- Plan v2 approved 2026-09-22, option (a): install working-rules bundle v2 at the repo root on branch `rules-v2`; root `CLAUDE.md` is the bundle file plus a three-line footer pointing at `docs/PROJECT_ARCHITECTURE.md`, which holds the repo's pre-bundle architecture document unchanged; keep `README.md`; delete the bundle zip and `docs/CLAUDE.review-rev2.md`; track `.claude/`, ignore `.claude/state/`; run `tests/replay-hooks.sh`; commit and push to `rules-v2`.
- Plan v1 (2026-09-22) superseded: it merged both documents into one root `CLAUDE.md`.

## Pending
- One wording decision, raised by the implementation and NOT actioned. `diagnosticReportMarkdown` still emits "This report is for the learner who was selected on the parent page when it was copied." In a combined export from the finish screen nothing was selected on the parent page and nothing was copied, so the sentence is now stale. It was kept verbatim because R4 asked to keep the existing wording exactly and an existing assertion requires the string. Fixing it is one line plus one assertion; awaiting the parent's call.

## Request ledger
| # | Round/date | Requirement (user's words, short) | Status | Note |
|---|---|---|---|---|
| 1 | R1 2026-09-21 | "Check out branch rules-v2. Unzip … Copy the contents of bundle/ into the repo root" | done | Installed; `.claude/` did not exist, so no `settings.json` merge was needed. |
| 2 | R1 2026-09-21 | "Delete the zip and docs/CLAUDE.review-rev1.md" | done | No `rev1` exists anywhere. Bundle ships `rev2` and its README lists it as "Review only — deleted during install". Deleted `rev2`. Conflict resolved in favour of the file that exists. |
| 3 | R1 2026-09-21 | "Make .gitignore track .claude/ and ignore .claude/state/" | done | Also added `__pycache__/`; the hook replay writes `.claude/hooks/__pycache__/` on every run. |
| 4 | R1 2026-09-21 | "Run bash tests/replay-hooks.sh and show the last line" | done | `passed=14 failed=0`. |
| 5 | R1 2026-09-21 | "Then commit and push to rules-v2" | done | `15530fb` pushed; lands on open PR #27. |
| 6 | R2 2026-09-22 | "combine the existing claude.md with the uploaded one, the uploaded one is the general rule" | superseded | Implemented as a merged two-part `CLAUDE.md` in `15530fb`, then withdrawn by #8. |
| 7 | R2 2026-09-22 | Record guard: fill `WORKING_RECORD.md` and `FEATURES.md` | done | Manifest v1 derived from the architecture document and `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md`. |
| 8 | R3 2026-09-22 | "your previous structure, replace the claude.md and keep the repo's Claude.md as Project_architecture is more clean" | done | Supersedes #6. Split restored: root `CLAUDE.md` = bundle file + pointer footer (option (a), approved); `docs/PROJECT_ARCHITECTURE.md` = the pre-bundle root `CLAUDE.md`, byte-identical to `61324fc:CLAUDE.md`. |

| 9 | R4 2026-09-28 | "can you create a feature to be able to share the 48 questions results easier?" | done | Implemented as one combined all-children export with share sheet, file download and print. |
| 10 | R4 2026-09-28 | Share output: native share sheet + download as a file + printable/PDF | done | `shareReport.js` + `DiagnosticShare`; all three routes present. |
| 11 | R4 2026-09-28 | No cloud, no share link — device only | done | Nothing added to Firestore or `firestore.rules`; `diagnosticStore.js` untouched. |
| 12 | R4 2026-09-28 | Scope: all children in one report | done | Entries built over every profile with answers, in device profile order. |
| 13 | R4 2026-09-28 | Keep current wording + summary lead + completion count + actual wrong choices | partial | Three of four done. Existing wording kept verbatim — which is why the now-stale "selected on the parent page" sentence survives; see Pending. |

Superseded: #6 (merge into one file) → superseded by #8 (split, with a pointer footer). R1's original reading — bundle `CLAUDE.md` at root, project document alongside it — is what now stands.

## Hotspot counter
| Area / feature | Fix rounds | Recurrences | Last symptom | Rewrite-vs-repair reviewed? |
|---|---|---|---|---|
| Below-grade diagnostic export | 1 | 0 | R4: export was single-learner, clipboard-only, and reachable only after switching profiles. Fixed structurally (one shared component over all children) rather than by another prose warning | n/a — first fix round |
| Root `CLAUDE.md` composition | 2 | 1 | R1 split the documents; R2 merged them into one file; R3 reverted to the split with a pointer footer | no — next round hits the threshold |
Rule: 3 fix rounds, or 2 recurrences, or a fix causing a nearby regression → no further patch until the comparison is presented.
**Live warning:** one more change to how the root `CLAUDE.md` and the architecture document are split trips the threshold. The next such request gets a rewrite-vs-repair comparison before any edit.

## Deliverable ledger
| Deliverable | State | Evidence |
|---|---|---|
| `.claude/` installed (settings, 6 hooks + 2 json, opus-worker agent, hz-guarantee-audit skill) | COMPLETE | 13 files in `15530fb`; `tests/replay-hooks.sh` → `passed=14 failed=0` |
| Root `CLAUDE.md` = bundle general rules v2.1 + pointer footer | COMPLETE | `diff` against the zip's `bundle/CLAUDE.md` shows only the 5 appended footer lines |
| `docs/PROJECT_ARCHITECTURE.md` = pre-bundle architecture document | COMPLETE | `git diff --no-index` against `61324fc:CLAUDE.md` → identical |
| `tests/`, `docs/HZ-skill-trigger-tuning.md` | COMPLETE | in `15530fb` |
| Zip and `docs/CLAUDE.review-rev2.md` removed | COMPLETE | in `15530fb` |
| `.gitignore` tracks `.claude/`, ignores `.claude/state/` and `__pycache__/` | COMPLETE | `git check-ignore -v .claude/state/x` → `.gitignore:7` |
| Pushed to `rules-v2` | COMPLETE | `61324fc..15530fb rules-v2 -> rules-v2` |
| `FEATURES.md` manifest v1 | COMPLETE | 2026-09-22, this turn |
| `WORKING_RECORD.md` ledgers | COMPLETE | this file |
| Merge PR #27 into `main` | BLOCKED | Parent action on github.com. Cloud sessions start from `main`, so hooks govern new sessions only after the merge. |
| R4: `diagnosticReport.js` — `itemCount`, `answeredCount`, `chose`, `diagnosticSummaryLine`, `combinedDiagnosticReportMarkdown` | COMPLETE | In tree on `diagnostic-share`; covered by 5 new cases in `test/diagnostic.test.js` |
| R4: `src/utils/shareReport.js` — share / download / print, injectable deps, truthful `{ ok, via, reason }` | COMPLETE | 3 new cases in `test/diagnosticShare.test.js` |
| R4: `DiagnosticShare` component + first `@media print` rules in the repo | COMPLETE | Compiled into `dist/assets/diagnosticStore-*.css`; print preview NOT observed |
| R4: finish screen and parent page both export via the shared component | COMPLETE | `git diff src/pages/` reviewed by the main session, not only reported by the worker |
| R4: `npm test` | COMPLETE | Main session re-ran it: 468 tests / 467 pass / 0 fail / 1 todo. `git stash -u` baseline on the same branch: 460 / 459 / 0 fail / 1 todo. +8 tests, all passing; the todo is pre-existing |
| R4: `npm run build` | COMPLETE | Clean, built in 3.34s; only the pre-existing >500 kB main-chunk warning |
| R4: `FEATURES.md` manifest v2 | COMPLETE | Below-grade diagnostic + export sections added; three rules added under "must not be weakened" |
| R4: `WORKING_RECORD.md` R4 rows (request ledger, hotspot counter, deliverable ledger, checks) | COMPLETE | This file |
| R4: browser / iPad verification (share sheet, real download, print preview) | NOT STARTED | Needs a device. No dev server was run; plan verification steps 3–6 are untested |
| R4: deployed | BLOCKED | No deploy stamp exists in this repo, so "deployed" cannot be claimed under the rules. Building one is a separate request |
| `routing_guard_mode` → `enforce` | NOT STARTED | Gated on running `tests/test-routing-hook.md` first, per the bundle README. |
| Fable/Opus routing verified | NOT STARTED | `settings.json` sets `model: fable`, but this session was served Opus and the setting was picked up mid-session. Not verified against a session that started with it. |

## Checks and evidence
- 2026-09-21 `bash tests/replay-hooks.sh` → passed=14 failed=0 (expected 14/0 per bundle README).
- 2026-09-22 re-run after the `CLAUDE.md` merge → passed=14 failed=0.
- 2026-09-22 `npm test` → 449 pass, 3 fail, 1 todo. Compared against a `git stash` baseline on the same branch: byte-identical failure set, so all three are pre-existing and none was introduced here. Failing: `source guard: every shared helper a component calls is imported by it`; `a choice question offers four options` (TODO OPEN-05); `test/persistenceHeadless.test.js` / `the Firebase transaction adapter loads with claim and save operations`.
- `npm run build` not run this round; no source file changed.
- Live stamp: not read. Nothing was deployed.

## Checks and evidence — R4 2026-09-28
- Implementation routed to `opus-worker` (`model: opus`, effort configured: high — not observable). Main session planned, inspected the diff and re-ran both checks itself; the worker's "done" was not taken as evidence.
- Session model note: `.claude/settings.json` requests `fable`, this session was served Opus. Fallback chain applied — Opus planned and checked, `opus-worker` implemented.
- Worker reported a failing-test-first pass: tests written before implementation gave 466/458/7 fail, all seven new cases. Reported, not independently reproduced by the main session.
- One existing assertion set was intentionally rewritten: the diagnostic source guard required the strings `Copy the report` and `diagnosticReportMarkdown(` on `ParentPage.jsx`, which this change removes. It now guards the new structure instead. Recorded here because it is the only existing test changed.

## Open questions / blockers
- **Record-guard blind spot, found R4 2026-09-28.** `.claude/hooks/record-guard.py` decides the record was untouched by inspecting `Edit`/`Write`/`MultiEdit`/`NotebookEdit` tool calls only. A session editing the record through `Bash` (heredoc, `sed`, a script) updates the file correctly and is still blocked, and the reverse also holds: the guard would pass on an `Edit` that changed nothing. It checks the tool used, not the file. Enforcement grade is weaker than "Hook" implies for this one rule. Not fixed this round — hook changes were not in R4's approved scope.
- The stale "selected on the parent page" sentence in the exported report — see Pending.
- Nothing in R4 was verified in a browser or on an iPad. Share-sheet, download and print behaviour are proven against fakes only.
- Three pre-existing `npm test` failures on `rules-v2` are unowned by this round. They predate the bundle and need their own plan.
- The bundle's `defaultMode: plan` took effect mid-session, which is why R1's commit/push needed approval. Expected behaviour per the bundle README step 2, not a defect.
- `.claude/agents/opus-worker.md` effort is configured, not observable. Report it as "configured: high", never as verified.
- `spelling-sessions` and `spelling-testlab-sessions` Firestore rules are still undeployed, so the two-device preflight reports a dependency rather than passing. Unchanged by this round.
