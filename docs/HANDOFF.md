# Handoff — Spelling Tutor, 2026-09-17

Written so a fresh conversation can pick this up without reading the old ones. It points at the ledger
rather than restating it: `docs/IMPLEMENTATION_STATUS.md` is the single record of evidence, defects and
decisions, and `docs/MASTER_PLAN.md` is the product authority.

## Where things stand

The app is **live**. GitHub Pages has deployed from `main` since 2026-09-11 (`e162dad`, workflow run 76).
Every push to `main` redeploys.

- 224 automated tests pass; the production build emits 153 modules.
- **Nothing is `released`.** 0 released objects, prompts or episodes.
- 96 lesson objects, both chapter-one episodes and 28 Part B assessment prompts are **`pilot_approved`**
  (parent decision, 2026-09-09). All 40 Part A prompts are excluded: they depend on audio nobody has
  listened to, or on a rater the family does not have.
- **No child has used any of it yet.**

## "Publishing" means three different things here

Keep them apart, or the next decision will be made against the wrong one.

| | Status |
|---|---|
| **The app is on the internet** | Done. It has been for a week. |
| **The children use it (the pilot)** | Available now for the pilot-approved content. Needs no further engineering — it needs a decision and an iPad. |
| **Progress counts as validated mastery (`released`)** | Not close. Needs the audio listening check, the educational review, learner testing and the device checks, all of which are external events. |

Pilot answers are kept in a **separate evidence record** and are never presented as validated mastery. That
is what makes starting the pilot safe before release.

## The six gates and who owns each

From `src/data/r2GateTracker.js`, visible in the app at `/parent`.

| Gate | State | Owner | Evidence row to read |
|---|---|---|---|
| C0 Part-A audio listening check | Blocked | **Parent** | `C0 content corrections`, `R2 C0 inventory` |
| Shared parent identity, two devices | Needs parent setup | **Parent** (Firebase) | `R2 external-gate tracker` |
| Real iPad Safari / home screen | Needs real-device test | **Parent** | `iPad/PWA install metadata` |
| Private-pilot approval | Granted for part of the content | Recorded 2026-09-09 | `R2 pilot approval` |
| Family pilot | Blocked on the above | **Parent** | `R2 pilot approval` |
| C1/C2 curriculum | Prepared, not authored | Depends on pilot outcome | `R3 source/episode preparation` |

Nothing Claude can do moves any of these. They need the real event.

## What to test next, in order

All of it lives at `/checks` — on the home screen under **For the parent → Things I need you to test**.
The page is in two halves and the difference matters: the **Technical Test Lab** touches no learner data,
and **Family Pilot Observation** uses the real app and saves answers to a named child.

1. **Real iPad — Safari and home screen** (~25 min, 6 rows). Do this first. It is the cheapest way to find
   out whether the device works at all: playback, microphone permission, interruption, Add to Home Screen,
   touch targets, and whether tapping a text box leaves the page zoomed.
2. **Practice run — resume, offline, double submit** (~15 min, 5 rows). Invented questions in an isolated
   test record. Confirms a session survives a reload and an offline answer arrives exactly once.
3. **Listening check — dictation** (~15 min, 16 rows) and **contrast pairs** (~10 min, 16 rows). The pairs
   matter most: if you cannot hear the difference between the two sides, the item tests nothing.
4. ~~Receptive decoding~~ — **parked, nothing to do.** See below.
5. **The pilot itself** — one watched lesson and story episode one, in the Family Pilot half. This is the
   check everything else exists to make possible.

Item 3 is what unblocks the dictation and contrast half of Part A. Items 1, 2 and 5 do not depend on it, so
the pilot can start before the audio is checked.

### Receptive decoding is parked (2026-09-17)

The four invented-word items are withheld under an open correction, `corr.c0.007`, and shown at `/checks`
in an **Under review — receptive decoding** tile. Nothing to test there.

Why: on the iPad the voice reads the syllable lists letter by letter — *"narpish sounds like N, A, R,
Pish."* Eleven of the twelve recordings contain a token of three letters or fewer, and every one of the four
expected readings is affected, so a learner would be marked wrong for the voice rather than for their
answer.

The pilot is unaffected — these are Part A prompts, which the pilot approval already excludes. Both forms
serve 32 of 34 and say so on screen. The decoding track still reports on its four syllable-break items, and
its disclosure now says the recording half is under review so a halved result is not read whole.

To bring it back, someone resolves the correction and installs a replacement; the tile and the withholding
then undo themselves, and you will be asked to check the twelve recordings once more. The untested proposal
is recorded in the correction: hand the voice one long token per recording instead of a list of syllables.
If that is also spelled out, the item type is not viable with synthetic speech and should be withdrawn.

## How to feed findings back

Work the rows, then press **Copy the log** at the bottom of `/checks` and paste it into the next
conversation. It exports as markdown with the row, result, tester, device and your note, and it states
which rows were Test Lab and which were real learner sessions.

A plain sentence works too. The report that produced DEF-37 was: *"the play function only works on the
second tap when it is showing play again."* That was enough to find and fix it.

## Known open items

- **Firestore rules are not deployed.** Neither `spelling-sessions` nor `spelling-testlab-sessions`. Until
  they are, the two-device check reports that dependency instead of running, which is correct behaviour.
- **16 decoding and speaking prompts** await an educational review (`docs/AUDIO_REVIEW_HANDOFF.md`, §B).
- **`corr.c0.007` is open**, parking the four receptive-decoding items. That is deliberate, not a backlog
  item to clear quickly — an open correction is how "under review" is expressed.
- **`sessionEngine.js`** is tested but not wired to any page.
- **Reading an unfamiliar word aloud unaided is not measured**, and must not be described as if it were.
  No qualified rater is available, so read-aloud recordings are optional practice that produce no evidence.

## Rules that must not be weakened

From `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md`. A fresh session will not know these:

Never convert synthetic speech into reviewed human audio. Never auto-score pronunciation from a transcript.
Never count assisted, revealed, pending, omitted, technical-failure, self-report, or unreleased-content
attempts as independent mastery. Never overwrite a first answer. Never admit unreleased content to the
released review queue. Never claim Firebase, two-device, real-iPad, learner-test, pilot, or release evidence
without the real event. No destructive migrations.

Two more earned the hard way:

- **A recorded check result is one person's observation.** It is never mastery evidence and never releases
  content. `gateStateAfterChecks` returns the gate's own state however many rows are ticked.
- **A source-text test is not behaviour coverage.** Three defects have now hidden behind one. DEF-28: the
  tests that only matched source text. DEF-31: a guard whose test reimplemented the rule instead of calling
  it. DEF-37: a guard that pinned the buggy line verbatim and so locked the defect in. When a test reads a
  file as text, name it `source guard:` and assert the *contract*, never the current wording.

## Recent history

- PR #19 — the R2 correction pass (merged). Shipped a blank-page defect to production.
- PR #21 — hotfix, one missing import (merged). The build was green the whole time; a bundler treats a free
  identifier as a global.
- PR #20 — the Test Lab split (merged, `e162dad`).
- Current branch — DEF-37, the self-cancelling audio.
