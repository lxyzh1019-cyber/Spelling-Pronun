# R1 Repair — candidate report

Prepared: 2026-09-08 (America/Edmonton)
Candidate branch: `codex/r2-correction`
Baseline before R1: `58fe21ebb6ad351094d4686a9713e6ccbdba6744`
Scope: the existing spelling app's repairs (F01–F12). The R2 learning engine is reported separately in `docs/IMPLEMENTATION_STATUS.md`.

This report satisfies gate R1-G5, which asks for a candidate report separating verified behaviour from device-untested behaviour, listing remaining R2 identity and session work, and stating the publication authorization state. It is not a release decision. Publication remains a parent decision.

## What "verified" means here

| Evidence type | What it proves |
|---|---|
| unit | An automated test in `test/` covers the rule and its failure path. Run with `npm test`. |
| browser | Exercised in a production build in desktop Chromium. Proves the flow runs; proves nothing about iPad Safari. |
| source | Read in code, no executable check. Weakest form; listed only where the behaviour is a labelling or wiring choice. |
| **none of these** | Real iPad, real microphone, live Firebase, two devices, and children using the app. No such evidence exists yet. |

## Repair status

| ID | Repair | Evidence | State |
|---|---|---|---|
| F01 | Duplicate `useRef` import removed; production build restored | unit (build) + CI | Verified |
| F02 | Spelling test restart starts a genuinely fresh session | unit + browser | Verified |
| F03 | A skipped final word can never produce a perfect score | unit + browser | Verified |
| F04 | Daily challenge uses today's five words; yesterday's successes do not satisfy it | unit + browser | Verified |
| F05 | Multiplayer answers are bound to the learner who gave them | browser | Verified locally; remote attribution untested |
| F06 | Crossword grid sizes to the words; long words are never truncated | unit + browser | Verified; iPad layout unchecked |
| F07 | Puzzle answers record one durable event each; failures queue and reconcile once | unit | Verified locally; no live Firebase run |
| F08 | Game outcomes carry an evidence label; self-report never becomes mastery | unit | Integrated |
| F09 | Auth failure ends loading and leaves a usable local-only mode | browser | Verified |
| F10 | Shared family identity | unit (contract) | **Not complete.** Parent account and import preview are implemented; Email/Password is not enabled and no second device has been used. Carried into R2. |
| F11 | Session snapshots are learner-bound; switching profiles leaks nothing | unit + browser | Verified |
| F12 | Lesson help is always available; game hint caps stay game rules | source + browser | Integrated |

Additional repairs from the plan's follow-up list: crossword Check no longer reveals answers before repair; Speed Round labels untimed practice honestly and lists misses; Best Same-Word Streak keeps a historical maximum; the `daily_champion` badge is awarded; achievements persist and merge by ID. Each has unit coverage.

## Verified versus device-untested

Verified by automated tests and desktop browser runs: build, restart, scoring, daily challenge, crossword generation and repair, learner attribution and isolation, session resume, local-only auth fallback, evidence labelling, achievement persistence, and Edmonton day keys across both daylight-saving transitions.

Not verified, and not claimed: iPad Safari and installed home-screen behaviour, real microphone capture and playback, offline and update behaviour on the device, live Firebase authentication, two linked devices, and any child using the app.

## Remaining R2 work carried out of R1

1. Shared family identity (F10): enable Email/Password, deploy the `spelling-sessions` rules, verify claim, takeover, queued saves, and stale-write rejection on two linked clients.
2. Real iPad verification of every repaired flow.
3. The C0 content corrections opened on 2026-09-08 (six records in `src/data/corrections.c0.json`) must be reviewed before their items return to use.
4. Pilot approval, learner testing, and the family pilot, in that order.

## Publication authorization

The app deploys to GitHub Pages from `main` through GitHub Actions. Publishing this candidate is a parent decision and has not been made. Rolling back is a code revert plus a redeploy; immutable attempt history is unaffected by either, because attempts are create-only and word totals are derived from them.

## How to re-check this report

```bash
npm ci
npm test        # expect all tests passing
npm run build   # expect a successful production build
```

Then open the production preview and exercise: restart after a completed test, skip the last word, today's daily challenge, a crossword check and repair, a profile switch mid-question, and a reload mid-session.
