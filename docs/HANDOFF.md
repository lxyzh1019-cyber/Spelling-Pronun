# Handoff — Spelling Tutor, 2026-09-17

Written so a fresh conversation can pick this up without reading the old ones. It points at the ledger
rather than restating it: `docs/IMPLEMENTATION_STATUS.md` is the single record of evidence, defects and
decisions, and `docs/MASTER_PLAN.md` is the product authority.

## Where things stand

The app is **live**. GitHub Pages has deployed from `main` since 2026-09-11 (`e162dad`, workflow run 76).
Every push to `main` redeploys.

- 264 automated tests: 259 pass, 5 are `todo` and name the content findings nobody has fixed yet. The
  production build is green.
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
4. **Receptive decoding** (~20 min, 12 rows). Each row states the reading it is supposed to produce. If a
   distractor sounds the same as the expected reading, that item is not usable.
5. **The pilot itself** — one watched lesson and story episode one, in the Family Pilot half. This is the
   check everything else exists to make possible.

Items 3 and 4 are what unblock the 40 Part A assessment prompts. Items 1, 2 and 5 do not depend on them, so
the pilot can start before the audio is checked.

## How to feed findings back

Work the rows, then press **Copy the log** at the bottom of `/checks` and paste it into the next
conversation. It exports as markdown with the row, result, tester, device and your note, and it states
which rows were Test Lab and which were real learner sessions.

A plain sentence works too. The report that produced DEF-37 was: *"the play function only works on the
second tap when it is showing play again."* That was enough to find and fix it.

## What the 2026-09-17 content audit changed

The engine defects it found are fixed (DEF-38 to DEF-42). Before them, a repeated assessment showed the
options in the same positions every time and the answer keys were patterned, ten of every pack's
twenty-four objects could never be reached, a reasonable typed answer was shown to the child as wrong,
and the Grade 6 word list was a mix of Grade 3 words and spelling-bee words.

**The corrections are drafted and waiting for you** (asked for on 2026-09-18, before the pilot).
Seven records, `corr.c0.007` to `corr.c0.013` in `src/data/corrections.c0.json`, covering 88 items and
both episodes. The replacement text is in `src/data/corrections.c0.draft.js`, which is the file to read:
it is the actual words a child would see, grouped by finding, with a note on each group saying why.

| Finding | What changes | Record |
|---|---|---|
| The answer was the only option ending in a full stop | every fragment gains an end mark | `corr.c0.007` |
| 46 pack questions offered two options | four options, each wrong one a different error | `corr.c0.008` |
| 36 assessment prompts offered two options | the same, plus the decoding breaks | `corr.c0.009` |
| `runnning` has three n's, so nobody picks it | `runeing`, the mistake the rule is about | `corr.c0.010` |
| Listening pairs are EAL, the children are not | homophones, -ed endings, the possessive | `corr.c0.011` |
| Explanations read above the grade they teach | shorter sentences, same rule and example | `corr.c0.012` |
| The story reads at grade 9 to 14 | grade 7 to 8, every disclosure kept | `corr.c0.013` |

**Two things changed on 2026-09-18, after you read the first draft.**

*Four options, not three.* You asked for four wherever the content supports it. A blind guess is 50/50 on
two options, one in three on three, one in four on four. Ten items keep three, and each one says why in
`THREE_OPTION_ITEMS` at the top of the draft file: their answer set is closed. There are exactly three
spellings of *their/there/they're*, exactly three sounds the *-ed* ending makes. A fourth option there
would have to be either arguable, which makes the question unfair, or silly, which is the coin flip
wearing a disguise — the very fault these corrections exist to remove. A test now requires four options
unless that list gives a reason, so a later edit cannot quietly slip back to three.

*The story aims at grade 7 to 8, not grade 5.* The first rewrite took it to grade 5 and you were right
that it was too easy: a child in grade 5 or 6 reading grade 5 prose has nothing to stretch for. It now
reads at 7.6 and 7.5, about where a good novel for this age sits. The "history behind the mystery" box
sits a little lower, at 8.4 and 8.7, because that is the part that tells them what is real and what was
invented, and that has to be understood rather than admired. The rule in the tests is now a **band** with
a floor as well as a ceiling — every simplifying edit passes a ceiling, which is exactly how prose drifts
down over time.

Nothing is installed, so **the app is unchanged and the lessons are whole**. These are recorded as
`improvement` rather than `defect` severity: the items teach and grade correctly today, so withholding
them would empty the lessons and protect nobody. `test/correctionDrafts.test.js` proves every draft
really closes its finding, keeps the same correct answer, and does not drop a single historical
disclosure from the story.

To accept a record, set its `reviewStatus` to `reviewed`, add `reviewedBy` and `reviewedAt`, and the
replacement gets installed at `toVersion`. Tell me and I will do that part.

Every record says what installing it costs, in `requiresOnInstall`. Six are item-level: the item moves
to version 2, the pack and form versions do not move, so the review records and your pilot approval stay
valid. That is exactly how the 2026-09-08 corrections were installed, and your resolution of the record
is the review.

**The story is different.** An episode carries its own version, and both its story review record and
your 2026-09-09 pilot approval pin it. Installing `corr.c0.013` moves each episode to version 3,
which needs the story review records updating and a new pilot approval recorded at version 3. Until
that approval exists the episodes stop being `pilot_approved`. That is the mechanism working, not a
fault: you approved version 2, and version 3 is different text.

`corr.c0.011` also needs a change to the Test Lab before it is installed. The listening check speaks one
distractor so you can hear the difference between the two sides, and `their` against `there` has no
difference to hear. Those items need a single row asking whether the spoken sentence is clear.

One change was installed rather than drafted, because leaving it would have shipped something false:
twelve explanations named the answer by its position ("the second choice"), which stopped being true
the moment the options were shuffled. They now name the answer by its words. See DEF-43.

## Known open items

- **Firestore rules are not deployed.** Neither `spelling-sessions` nor `spelling-testlab-sessions`. Until
  they are, the two-device check reports that dependency instead of running, which is correct behaviour.
- **16 decoding and speaking prompts** await an educational review (`docs/AUDIO_REVIEW_HANDOFF.md`, §B).
- **`sessionEngine.js`** is tested but not wired to any page.
- **Pending answers now reach you** at `/parent`, under *Answers waiting for you*. It lists answers the
  app would not mark, shows what the child wrote against what the key expected, and records your
  judgement. Two things to know: it shows the learner **currently selected**, so switch profiles to see
  the other child's, and your judgement is never mastery evidence. The decisions are kept on that device
  only, because no Firestore rule exists for them.
- **Grade 6 holds 91 words, not 200**, after the misfiled words were moved to their real levels.
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
