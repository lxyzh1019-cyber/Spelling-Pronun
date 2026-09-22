# WORKING RECORD — Spelling-Pronun — rules v2

Single working record for this repository. Updated by the main session at the end of every
implementation turn (the record guard hook checks this). Keep it terse; history lives in git.

## Approved baseline
- Plan v1 approved 2026-09-22: install working-rules bundle v2 at the repo root on branch `rules-v2`; combine `CLAUDE.md` (bundle general rules first, project architecture under a `# Project` heading) rather than replacing it; keep `README.md`; delete the bundle zip and `docs/CLAUDE.review-rev2.md`; track `.claude/`, ignore `.claude/state/`; run `tests/replay-hooks.sh`; commit and push to `rules-v2`.

## Pending
- None.

## Request ledger
| # | Round/date | Requirement (user's words, short) | Status | Note |
|---|---|---|---|---|
| 1 | R1 2026-09-21 | "Check out branch rules-v2. Unzip … Copy the contents of bundle/ into the repo root" | done | Installed; `.claude/` did not exist, so no `settings.json` merge was needed. |
| 2 | R1 2026-09-21 | "Delete the zip and docs/CLAUDE.review-rev1.md" | done | No `rev1` exists anywhere. Bundle ships `rev2` and its README lists it as "Review only — deleted during install". Deleted `rev2`. Conflict resolved in favour of the file that exists. |
| 3 | R1 2026-09-21 | "Make .gitignore track .claude/ and ignore .claude/state/" | done | Also added `__pycache__/`; the hook replay writes `.claude/hooks/__pycache__/` on every run. |
| 4 | R1 2026-09-21 | "Run bash tests/replay-hooks.sh and show the last line" | done | `passed=14 failed=0`. |
| 5 | R1 2026-09-21 | "Then commit and push to rules-v2" | done | `15530fb` pushed; lands on open PR #27. |
| 6 | R2 2026-09-22 | "combine the existing claude.md with the uploaded one, the uploaded one is the general rule" | done | Supersedes the R1 reading that the bundle `CLAUDE.md` replaces the project one. Interim `docs/PROJECT_ARCHITECTURE.md` removed; its content is Part 2 of the merged file. |
| 7 | R2 2026-09-22 | Record guard: fill `WORKING_RECORD.md` and `FEATURES.md` | done | Manifest v1 derived from `CLAUDE.md` Part 2 and `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md`. |

Superseded: R1's implied "bundle `CLAUDE.md` replaces the project `CLAUDE.md`" → superseded by #6.

## Hotspot counter
| Area / feature | Fix rounds | Recurrences | Last symptom | Rewrite-vs-repair reviewed? |
|---|---|---|---|---|
| Root `CLAUDE.md` composition | 1 | 0 | R1 moved the project architecture out to `docs/PROJECT_ARCHITECTURE.md`; R2 required one merged file instead | no — below threshold |
Rule: 3 fix rounds, or 2 recurrences, or a fix causing a nearby regression → no further patch until the comparison is presented.

## Deliverable ledger
| Deliverable | State | Evidence |
|---|---|---|
| `.claude/` installed (settings, 6 hooks + 2 json, opus-worker agent, hz-guarantee-audit skill) | COMPLETE | 13 files in `15530fb`; `tests/replay-hooks.sh` → `passed=14 failed=0` |
| Merged root `CLAUDE.md` (general rules v2.1 + project architecture) | COMPLETE | 31,117 bytes; both `# ` headings present; never-weaken section intact |
| `tests/`, `docs/HZ-skill-trigger-tuning.md` | COMPLETE | in `15530fb` |
| Zip and `docs/CLAUDE.review-rev2.md` removed | COMPLETE | in `15530fb` |
| `.gitignore` tracks `.claude/`, ignores `.claude/state/` and `__pycache__/` | COMPLETE | `git check-ignore -v .claude/state/x` → `.gitignore:7` |
| Pushed to `rules-v2` | COMPLETE | `61324fc..15530fb rules-v2 -> rules-v2` |
| `FEATURES.md` manifest v1 | COMPLETE | 2026-09-22, this turn |
| `WORKING_RECORD.md` ledgers | COMPLETE | this file |
| Merge PR #27 into `main` | BLOCKED | Parent action on github.com. Cloud sessions start from `main`, so hooks govern new sessions only after the merge. |
| `routing_guard_mode` → `enforce` | NOT STARTED | Gated on running `tests/test-routing-hook.md` first, per the bundle README. |
| Fable/Opus routing verified | NOT STARTED | `settings.json` sets `model: fable`, but this session was served Opus and the setting was picked up mid-session. Not verified against a session that started with it. |

## Checks and evidence
- 2026-09-21 `bash tests/replay-hooks.sh` → passed=14 failed=0 (expected 14/0 per bundle README).
- 2026-09-22 re-run after the `CLAUDE.md` merge → passed=14 failed=0.
- 2026-09-22 `npm test` → 449 pass, 3 fail, 1 todo. Compared against a `git stash` baseline on the same branch: byte-identical failure set, so all three are pre-existing and none was introduced here. Failing: `source guard: every shared helper a component calls is imported by it`; `a choice question offers four options` (TODO OPEN-05); `test/persistenceHeadless.test.js` / `the Firebase transaction adapter loads with claim and save operations`.
- `npm run build` not run this round; no source file changed.
- Live stamp: not read. Nothing was deployed.

## Open questions / blockers
- Three pre-existing `npm test` failures on `rules-v2` are unowned by this round. They predate the bundle and need their own plan.
- The bundle's `defaultMode: plan` took effect mid-session, which is why R1's commit/push needed approval. Expected behaviour per the bundle README step 2, not a defect.
- `.claude/agents/opus-worker.md` effort is configured, not observable. Report it as "configured: high", never as verified.
- `spelling-sessions` and `spelling-testlab-sessions` Firestore rules are still undeployed, so the two-device preflight reports a dependency rather than passing. Unchanged by this round.
