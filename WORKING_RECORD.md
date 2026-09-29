# WORKING RECORD — Spelling-Pronun — rules v2

Single working record for this repository. Updated by the main session at the end of every
implementation turn (the record guard hook checks this). Keep it terse; history lives in git.

## Approved baseline
- Plan v1 approved 2026-09-28 (R6): share the 48-question diagnostic result in one tap. Share sheet + dated file download + printable page; one combined all-children report; device only, no cloud and no share link; keep the existing tested wording and add a summary lead, a completion count and the child's actual wrong choices. Branch `diagnostic-share`.
- Plan v2 approved 2026-09-22, option (a): install working-rules bundle v2 at the repo root on branch `rules-v2`; root `CLAUDE.md` is the bundle file plus a three-line footer pointing at `docs/PROJECT_ARCHITECTURE.md`, which holds the repo's pre-bundle architecture document unchanged; keep `README.md`; delete the bundle zip and `docs/CLAUDE.review-rev2.md`; track `.claude/`, ignore `.claude/state/`; run `tests/replay-hooks.sh`; commit and push to `rules-v2`.
- Plan v1 (2026-09-22) superseded: it merged both documents into one root `CLAUDE.md`.

## Pending
- One wording decision, raised by the implementation and NOT actioned. `diagnosticReportMarkdown` still emits "This report is for the learner who was selected on the parent page when it was copied." In a combined export from the finish screen nothing was selected on the parent page and nothing was copied, so the sentence is now stale. It was kept verbatim because R6 asked to keep the existing wording exactly and an existing assertion requires the string. Fixing it is one line plus one assertion; awaiting the parent's call.

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
| 9 | R4 2026-09-27 | Run the `hz-claude-config` stub installer; commit, push and open a PR if it ends `INSTALL OK` | done | `INSTALL OK`, smoke test `Rules v3.1.4 loaded`. v2 hooks, skill copy, `tests/replay-hooks.sh`, `tests/test-routing-hook.md`, `docs/HZ-skill-trigger-tuning.md` removed; rules and hooks now fetched by `.claude/hz-loader.py`. The installer dropped the `docs/PROJECT_ARCHITECTURE.md` footer (not a `##` section); restored under a `## Project Architecture` heading. |
| 10 | R5 2026-09-29 | Rerun the `hz-claude-config` stub installer from the repo root, show the full output; commit, push and open a PR only if the last line is `INSTALL OK`, else change nothing | done | `INSTALL OK`, smoke test `Rules v3.1.10 loaded`. Nothing removed and `README.md` not restored — R4 had already done both. `CLAUDE.md` untouched, so the `## Project Architecture` section survived and the R4 footer drop did not recur. Changed: `.claude/settings.json` (model `fable`→`opus`, `advisorModel: fable` added, `ask` list dropped, `gh pr merge` denied, git/PR commands allowed, git-guard and completion-guard hooks added), `.claude/agents/opus-worker.md` (routing description), plus new `.claude/agents/sonnet-worker.md`. Corrected the two stale `.claude` bullets in `FEATURES.md` in the same commit. The installer's pipe-to-bash form was refused twice by the session's permission classifier; ran it only after the user allowed it, from a copy read in full first. |
| 11 | R6 2026-09-28 | "can you create a feature to be able to share the 48 questions results easier?" | done | Implemented as one combined all-children export with share sheet, file download and print. |
| 12 | R6 2026-09-28 | Share output: native share sheet + download as a file + printable/PDF | done | `shareReport.js` + `DiagnosticShare`; all three routes present. |
| 13 | R6 2026-09-28 | No cloud, no share link — device only | done | Nothing added to Firestore or `firestore.rules`; `diagnosticStore.js` untouched. |
| 14 | R6 2026-09-28 | Scope: all children in one report | done | Entries built over every profile with answers, in device profile order. |
| 15 | R6 2026-09-28 | Keep current wording + summary lead + completion count + actual wrong choices | partial | Three of four done. Existing wording kept verbatim — which is why the now-stale "selected on the parent page" sentence survives; see Pending. |

Superseded: #6 (merge into one file) → superseded by #8 (split, with a pointer footer). R1's original reading — bundle `CLAUDE.md` at root, project document alongside it — is what now stands.

Numbering note (2026-09-29): rows #11–15 were written as "R4" and numbered #9–13 on branch `diagnostic-share`, which forked before R4/R5 existed on `main`. Renumbered to #11–15 and relabelled **R6** when the branch merged `main`, because `main` already owned R4 and R5. Dates are work dates, so R6's 2026-09-28 precedes R5's 2026-09-29: the two rounds ran on parallel branches.

## Hotspot counter
| Area / feature | Fix rounds | Recurrences | Regressions caused | Workarounds/exceptions | Last symptom | Rewrite-vs-repair reviewed? |
|---|---|---|---|---|---|---|
| Root `CLAUDE.md` composition | 2 | 1 | 1 | 1 | R1 split the documents; R2 merged them into one file; R3 reverted to the split with a pointer footer; R4's stub install dropped the pointer footer, restored by hand as a `## Project Architecture` section | no — threshold tripped by the R4 regression |
| `.claude/` stub install | 2 | 0 | 0 | 1 | R5 2026-09-29 reran the installer: settings and worker agents refreshed, `CLAUDE.md` untouched — the R4 footer drop did not recur | not needed — no recurrence |
| Below-grade diagnostic export | 1 | 0 | 0 | 0 | R6: export was single-learner, clipboard-only, and reachable only after switching profiles. Fixed structurally (one shared component over all children) rather than by another prose warning | n/a — first fix round |
Rule: 3 fix rounds, or 2 recurrences, or a fix causing a nearby regression → no further patch until the comparison is presented.
**Live warning:** the `CLAUDE.md` composition row has tripped the threshold on the regression clause (R4's install dropped the pointer footer that R3 had established). Any further change to how the root `CLAUDE.md` and the architecture document are split gets a rewrite-vs-repair comparison before any edit. R5 did not change `CLAUDE.md`, so no counter moved for it; the workaround column records the by-hand footer restore as the compensating patch.

## Deliverable ledger
| Deliverable | State | Evidence |
|---|---|---|
| `.claude/` installed (settings, 6 hooks + 2 json, opus-worker agent, hz-guarantee-audit skill) | SUPERSEDED | Was COMPLETE as 13 files in `15530fb`. R4 2026-09-27 replaced the copied v2 hooks and skill with the `hz-claude-config` stub; see the stub-install row. |
| Root `CLAUDE.md` = bundle general rules v2.1 + pointer footer | COMPLETE | `diff` against the zip's `bundle/CLAUDE.md` shows only the 5 appended footer lines |
| `docs/PROJECT_ARCHITECTURE.md` = pre-bundle architecture document | COMPLETE | `git diff --no-index` against `61324fc:CLAUDE.md` → identical |
| `tests/`, `docs/HZ-skill-trigger-tuning.md` | SUPERSEDED | Was COMPLETE in `15530fb`. Both removed by the R4 stub install; `tests/` no longer exists. Hook coverage now lives in `hz-claude-config`. |
| Zip and `docs/CLAUDE.review-rev2.md` removed | COMPLETE | in `15530fb` |
| `.gitignore` tracks `.claude/`, ignores `.claude/state/` and `__pycache__/` | COMPLETE | `git check-ignore -v .claude/state/x` → `.gitignore:7` |
| Pushed to `rules-v2` | COMPLETE | `61324fc..15530fb rules-v2 -> rules-v2` |
| `FEATURES.md` manifest v1 | COMPLETE | 2026-09-22 |
| `WORKING_RECORD.md` ledgers | COMPLETE | this file |
| Merge PR #27 into `main` | COMPLETE | Merged as `334b1f7` on `main`. |
| `routing_guard_mode` → `enforce` | SUPERSEDED | R4 2026-09-27: `.claude/hooks/config.json` and `tests/test-routing-hook.md` removed by the stub install; routing-guard mode is now set in `hz-claude-config`. |
| Stub install (rules from `hz-claude-config`) | COMPLETE | R4 merged to `main` as PR #28 (`fa9b484`). That session started on `main`'s stub and its own session-start line read `Rules v3.1.10 loaded`, which proves the repo fetches from `hz-claude-config` without the installer. R5 2026-09-29 reran the installer to refresh the stub: `INSTALL OK`, same smoke line. |
| Fable/Opus routing verified | NOT STARTED | Re-scoped R5: the central stub now sets `model: opus` with `advisorModel: fable`, replacing the earlier `model: fable`. Still unverified — R5's session was served Opus and read the new setting mid-session, not from its start. Needs a session that starts on the merged setting. |
| Settings/permission change from R5 reviewed by the user before merge | NOT STARTED | The stub dropped the `ask` list, so `firebase deploy` and `npm run deploy` no longer prompt, and `git commit`/`git push` are auto-allowed. Parent decision on github.com; not changeable here (settings route through `hz-claude-config`). |
| R6: `diagnosticReport.js` — `itemCount`, `answeredCount`, `chose`, `diagnosticSummaryLine`, `combinedDiagnosticReportMarkdown` | COMPLETE | `8986fbc` on `diagnostic-share`; covered by 5 new cases in `test/diagnostic.test.js` |
| R6: `src/utils/shareReport.js` — share / download / print, injectable deps, truthful `{ ok, via, reason }` | COMPLETE | 3 new cases in `test/diagnosticShare.test.js` |
| R6: `DiagnosticShare` component + first `@media print` rules in the repo | COMPLETE | Compiled into `dist/assets/diagnosticStore-*.css`; print preview NOT observed |
| R6: finish screen and parent page both export via the shared component | COMPLETE | `git diff src/pages/` reviewed by the main session, not only reported by the worker |
| R6: `npm test` | COMPLETE | Main session re-ran it: 468 tests / 467 pass / 0 fail / 1 todo. `git stash -u` baseline on the same branch: 460 / 459 / 0 fail / 1 todo. +8 tests, all passing; the todo is pre-existing |
| R6: `npm run build` | COMPLETE | Clean, built in 3.34s; only the pre-existing >500 kB main-chunk warning |
| R6: `FEATURES.md` manifest v2 | COMPLETE | Below-grade diagnostic + export sections added; three rules added under "must not be weakened". Auto-merged cleanly with R5's corrected `.claude` bullets. |
| R6: `WORKING_RECORD.md` R6 rows (request ledger, hotspot counter, deliverable ledger, checks) | COMPLETE | This file |
| R6: merge `main` into `diagnostic-share` and resolve | COMPLETE | One conflict, this file; `FEATURES.md` auto-merged. Resolution kept `main`'s newer rows throughout and renumbered R6; see the numbering note. |
| R6: PR #30 opened | COMPLETE | https://github.com/lxyzh1019-cyber/Spelling-Pronun/pull/30, open, not a draft, base `main` |
| R6: browser / iPad verification (share sheet, real download, print preview) | NOT STARTED | Needs a device. No dev server was run; plan verification steps 3–6 are untested |
| R6: deployed | BLOCKED | No deploy stamp exists in this repo, so "deployed" cannot be claimed under the rules. Building one is a separate request |

## Checks and evidence
- 2026-09-29 (R5) stub installer → `SMOKE TEST: [session-start] Rules v3.1.10 loaded · branch: claude/confident-clarke-4dshy3`, last line `INSTALL OK`. Hook count read back from `.claude/settings.json` → 8. `npm test` and `npm run build` not run: no source file changed, only `.claude/` and two markdown files. No deploy, so no live stamp read.
- 2026-09-21 `bash tests/replay-hooks.sh` → passed=14 failed=0 (expected 14/0 per bundle README). Script removed by the R4 stub install; not re-runnable.
- 2026-09-22 re-run after the `CLAUDE.md` merge → passed=14 failed=0.
- 2026-09-22 `npm test` → 449 pass, 3 fail, 1 todo. Compared against a `git stash` baseline on the same branch: byte-identical failure set, so all three are pre-existing and none was introduced here. Failing: `source guard: every shared helper a component calls is imported by it`; `a choice question offers four options` (TODO OPEN-05); `test/persistenceHeadless.test.js` / `the Firebase transaction adapter loads with claim and save operations`.
- Live stamp: not read. Nothing has been deployed.

## Checks and evidence — R6 2026-09-28/29
- Implementation routed to `opus-worker` (`model: opus`, effort configured: high — not observable). Main session planned, inspected the diff and re-ran both checks itself; the worker's "done" was not taken as evidence.
- Session model note: at the time of this round `.claude/settings.json` still requested `fable` and the session was served Opus, so the fallback chain applied — Opus planned and checked, `opus-worker` implemented. R5's merged stub has since changed that setting to `model: opus` with `advisorModel: fable`.
- Worker reported a failing-test-first pass: tests written before implementation gave 466/458/7 fail, all seven new cases. Reported, not independently reproduced by the main session.
- One existing assertion set was intentionally rewritten: the diagnostic source guard required the strings `Copy the report` and `diagnosticReportMarkdown(` on `ParentPage.jsx`, which this change removes. It now guards the new structure instead. Recorded here because it is the only existing test changed.
- 2026-09-29 merged `origin/main` (4 commits: R4/R5 stub work, PRs #28 and #29). `src/` and `test/` were untouched by those commits. Post-merge checks are recorded on the merge commit.

## Open questions / blockers
- **Record-guard blind spot, observed R6 2026-09-28 against the v2 local hook — NOT re-checked since.** The then-local `.claude/hooks/record-guard.py` decided the record was untouched by inspecting `Edit`/`Write`/`MultiEdit`/`NotebookEdit` tool calls only, so a session editing the record through `Bash` updated the file correctly and was still blocked, and an `Edit` that changed nothing would have passed. It checked the tool used, not the file. That local file no longer exists: the R4/R5 stub removed `.claude/hooks/` and `hz-loader.py` now fetches the hook from `hz-claude-config`. Whether the fetched version still has this behaviour has not been read and must not be assumed either way.
- The stale "selected on the parent page" sentence in the exported report — see Pending.
- Nothing in R6 was verified in a browser or on an iPad. Share-sheet, download and print behaviour are proven against fakes only.
- `hz-claude-config-v3.1.13.zip` is committed at the repo root, arriving with the R4/R5 stub work on `main`. R1 explicitly deleted the earlier bundle zip from the repo; this one was not reviewed by R6 and is left as found.
- This file's title still reads "rules v2" while the loaded rules are v3.1.10. Not changed by R6; governance wording is the parent's call.
- Three pre-existing `npm test` failures on `rules-v2` are unowned. They predate the bundle and need their own plan.
- The bundle's `defaultMode: plan` took effect mid-session, which is why R1's commit/push needed approval. Expected behaviour per the bundle README step 2, not a defect.
- Worker-agent effort is configured, not observable. Report it as "configured: high", never as verified.
- `spelling-sessions` and `spelling-testlab-sessions` Firestore rules are still undeployed, so the two-device preflight reports a dependency rather than passing. Unchanged by this round.
