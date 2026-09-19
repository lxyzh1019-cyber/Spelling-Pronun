# Handoff — Spelling Tutor, 2026-09-17

Written so a fresh conversation can pick this up without reading the old ones. It points at the ledger
rather than restating it: `docs/IMPLEMENTATION_STATUS.md` is the single record of evidence, defects and
decisions, and `docs/MASTER_PLAN.md` is the product authority.

## Where things stand

The app is **live**. GitHub Pages has deployed from `main` since 2026-09-11 (`e162dad`, workflow run 76).
Every push to `main` redeploys.

- 337 automated tests: 336 pass, 1 is `todo` and names the one content finding nobody has decided yet.
  The production build is green.
- **Nothing is `released`.** 0 released objects, prompts or episodes.
- 96 lesson objects, both chapter-one episodes and 28 Part B assessment prompts are **`pilot_approved`**
  (parent decision 2026-09-09; the episodes re-approved at version 3 on 2026-09-18 after the rewrite). All 40 Part A prompts are excluded: they depend on audio nobody has
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
3. **Listening check — dictation** (~15 min, 16 rows) and **the spoken sentences** (~8 min, 8 rows).
   These are no longer minimal pairs: after `corr.c0.011` each row plays one sentence and asks whether
   it is clear and says the right words. There is deliberately nothing to compare, because the options
   are homophones.
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

**All seven content corrections are installed.** The parent read the full before-and-after of every
replacement and resolved `corr.c0.007` to `corr.c0.013` on 2026-09-18: 86 items across the four packs
and both assessment forms, plus both story episodes. The replacement text is in
`src/data/corrections.c0.replacements.js`; `installReplacements` applies it and moves each corrected
item to version 2, and the records in `src/data/corrections.c0.json` say what each one changed.

| Finding | What changed | Record |
|---|---|---|
| The answer was the only option ending in a full stop | every fragment gained an end mark | `corr.c0.007` |
| 46 pack questions offered two options | four options, each wrong one a different error | `corr.c0.008` |
| 36 assessment prompts offered two options | the same, plus the decoding breaks | `corr.c0.009` |
| `runnning` has three n's, so nobody picks it | `runeing`, the mistake the rule is about | `corr.c0.010` |
| Listening pairs were EAL, the children are not | homophones, -ed endings, the possessive | `corr.c0.011` |
| Explanations read above the grade they teach | shorter sentences, same rule and example | `corr.c0.012` |
| The story reads at grade 9 to 10 | grade 7 to 8, every disclosure kept | `corr.c0.013` |

Installing them cost nothing elsewhere, which is the point of the item-level route: the pack and form
versions did not move, so the educational review records and the 2026-09-09 pilot approval stayed
valid. Each challenge review's per-item result was moved to version 2 and marked re-checked by the
parent on 2026-09-18, exactly as the 2026-09-08 corrections were recorded.

### Four options, not three

The parent asked for four wherever the content supports it. A blind guess is 50/50 on two options, one
in three on three, one in four on four. Ten items keep three, and each says why in
`THREE_OPTION_ITEMS`: their answer set is closed. There are exactly three spellings of
*their/there/they're*, exactly three sounds the *-ed* ending makes. A fourth there would have to be
either arguable, which makes the question unfair, or silly, which is a coin flip wearing a disguise —
the very fault these corrections removed. A test requires four options unless that list gives a reason.

Two classes of fourth option were written and then rejected as **defensible rather than wrong**: a
consistently past-tense sentence inside an item about keeping tense consistent, and a list without the
final comma, which is correct under most Canadian style.

### The listening check changed shape

`corr.c0.011` retargeted the eight listening prompts, and the Test Lab had to follow. It used to speak
one distractor so the parent could hear the difference between two sides. `their` against `there` has no
difference to hear, by design, so those items now get **one row** asking whether the audio says the
sentence clearly and says the right one. `testLabAudio.js` decides this from the item — the spoken text
is one of the options for a minimal pair, and is a whole sentence for these — never from a list of ids,
so a future listening item is classified by what it does. The contrast check is now 8 rows, not 16.

### The story, and what installing it cost

`corr.c0.013` is installed. Both episodes are at version 3, reading at 7.7 and 7.0 with the fact box a
little lower at 8.4 and 8.7 — a year or two above the children, about where a novel for this age sits.
A first attempt took them to grade 5 and the parent rejected it as too easy: a child in grade 5 or 6
reading grade 5 prose has nothing to stretch for. The rule in the tests is a **band with a floor as
well as a ceiling**, because every simplifying edit passes a ceiling, which is exactly how prose drifts
down over time.

This one could not be installed on Claude's say-so. An episode carries its own version, the 2026-09-09
pilot approval named version 2, and `validatePilotApprovals` rejects an approval naming a version the
content no longer has. So installing required a **new parent decision**, given on 2026-09-18: *approve
version 3 for the reading material*. The version 2 approval is kept in `previousDecisions` rather than
overwritten — an approval history is not a scratch field — and a test asserts both that each episode
runs at the version someone actually approved and that the older decision survived.

The story review, educational review and integration records are re-pinned to story version 3, with the
parent recorded as the re-checker. Their ids keep the `.v2` suffix, which names the review pass rather
than the story version, exactly as the pack challenge records kept `.v1` while their items moved to
version 2.

### One finding nobody has decided yet

44 spelling and dictation questions still offer three options. They were never part of the two-option
finding — they always had three — so no correction record covers them, and raising them to four means
writing a fourth distractor for each, which is new content the parent has not reviewed. It is recorded
as a `todo` in `test/contentLint.test.js` rather than fixed quietly, because content nobody has read
must not reach a child.

One change was installed rather than drafted, back on 2026-09-18, because leaving it would have shipped
something false: twelve explanations named the answer by its position ("the second choice"), which
stopped being true the moment the options were shuffled. They now name the answer by its words. See
DEF-43.

## What the curriculum mapping says, 2026-09-18

The parent supplied the Alberta ELAL (K–6) PDF on 2026-09-18, which unblocked the gate this whole plan
was waiting on: this container cannot reach `curriculum.learnalberta.ca`, `alberta.ca` or
`open.alberta.ca`, and `MASTER_PLAN.md` forbids calling anything curriculum-aligned without the source.

`src/data/curriculum.alberta.elal.json` now holds **all 214 Grade 5 and Grade 6 Skills & Procedures
outcomes**, lifted from the PDF's own text layer. Grade 5 and Grade 6 share a page in two columns, so
the extraction keeps the column positions and attributes each statement to the grade whose column it
physically sits in; read as flat text the two grades interleave. A test proves the separation held —
the two grades ask a different guiding question on every organizing idea, which no column mix-up
survives.

**The statements are the curriculum's words. The coverage decision beside each one is Claude's and the
parent has not checked it.** Until `mappingReviewedBy` is set, nothing may describe this app as
covering the Alberta curriculum, and a test enforces that the file keeps saying so.

### What the app measures today

| Organizing idea | Gr 5 | Gr 6 | Covered | Machine-scorable, not built | Needs a person |
|---|---|---|---|---|---|
| Text Forms and Structures | 20 | 21 | 0 | 30 | 11 |
| Oral Language | 12 | 13 | 0 | 0 | 25 |
| Vocabulary | 15 | 15 | 0 | 26 | 4 |
| Comprehension | 18 | 23 | 0 | 39 | 2 |
| Writing | 27 | 27 | 0 | 2 | 52 |
| Conventions | 14 | 9 | 9 + 1 partial | 11 | 2 |

Nine outcomes of 214, all in Conventions. That is the honest answer to "what does this tell me about
what they know": at the moment, their pronoun case and their spelling patterns, and nothing else.

The 96 "needs a person" outcomes are not a failing to fix. Speaking, discussion, presentation and
composition cannot be marked by an answer key, and the app already routes open writing to the parent
review queue. The 108 machine-scorable-but-unbuilt outcomes are the real gap: comprehension of a
passage, genre and text structure, word study, figurative language.

### Two packs teach below Grade 5

Recorded in `appContentPlacement`, each against the statement it was judged by:

- **Complete sentences** is a **Grade 3** outcome. Alberta states "A sentence has two main parts, a
  subject and a predicate" and "Identify the subject of a variety of sentences" at Grade 3. The nearest
  Grade 5/6 outcome is Grade 6's independent and dependent clauses, which is a level above this pack.
- **Capitals and end marks** is a **Grade 3 to 4** outcome. Grade 5/6 states it only in the general
  form, and adds parentheses at Grade 5 and the colon at Grade 6, neither of which the pack teaches.
- **Subject and object pronouns** is at grade level (Grade 5, word for word).
- **Spelling patterns** is at grade level (Grade 5).

Below-grade content is not useless — a child who needs it needs it — but two of the four lessons cannot
be reported as a Grade 5/6 check, and the app must not imply otherwise.

### Phonics is not a Grade 5/6 outcome in Alberta

Alberta ends **Phonological Awareness after Grade 2**, and **Phonics and Fluency after Grade 4**. There
is no phonics outcome at Grade 5 or Grade 6. The 自然拼读 tile the parent asked for is still worth
having if the children need it, but it is Grade 1–4 foundation support and must be labelled as that,
never as Alberta Grade 5/6 curriculum. `organizingIdeasNotInGrade56` records this and a test holds it.

The same finding retires the `PR.*` pronunciation skills: ELAL has **no pronunciation organizing idea at
any grade**. Those skills came from the EAL benchmarks, and both children are native English speakers —
the same reason the listening prompts were retargeted in `corr.c0.011`.

## What is written and waiting for you, 2026-09-18

All of it is visible at `/parent` under **Written and waiting for you**, assembled from the data
rather than from a hand-written list, so nothing can be added without appearing there. None of it is
in front of a child: new content cannot reach a learner until it has been challenged, reviewed,
integrated and approved, and a test holds every new pack at `draft`.

| Waiting | What it is |
|---|---|
| `corr.c0.014`, `corr.c0.015` | A fourth option for 30 of the 44 questions that offered three. The other 14 keep three, with a reason each. |
| 2 vocabulary lessons, 48 questions | Word parts (prefixes and suffixes), and working out a word from its sentence. |
| 2 comprehension lessons, 48 questions | What the text says versus what you worked out, and drawing an inference. |
| 2 phonics lessons, 48 questions | Vowel sounds and what changes them; breaking long words into beats, including which syllable is stressed. |

The vocabulary and comprehension packs are written against named Alberta outcomes; every item carries
`curriculumOutcomeIds` and a test resolves each against the mapping.

The phonics packs deliberately claim **no** Alberta Grade 5/6 outcome, because there is none to claim:
Alberta ends Phonics after Grade 4. They carry an `albertaPlacement` saying so instead. They exist
because the parent asked for them on 2026-09-18 knowing that, on the ground that their children are
behind on exactly this. Every question in them is answered by looking rather than listening, and a
test enforces it — audio would put them behind the same human-listening gate that has held the
assessment's Part A prompts since 2026-09-08.

### What the coverage report now says

`/parent` reports, per organizing idea, how many outcomes are checked, measured without enough
evidence, not built, and **yours to mark**. That last state is the parent's own decision on
2026-09-18: speaking, discussion and composition are theirs to judge, not a gap for the app to close.
There is no percentage anywhere and a test forbids one — 10 of 214 rendered as 5% reads as a small
shortfall rather than as what it is, and a single number invites being read as a grade for the child.

The report refuses to read as an alignment claim while `mappingReviewedBy` is null, which it still is.

## The story: 7 episodes of the 12 the plan commits to

`docs/MASTER_PLAN.md` commits Season 1 to **six chapters of two episodes each**, and the R3-G1 gate
requires all twelve. `src/data/story.ledger.json` counts what exists against that, and is generated
from the story files by `tools/build_story_ledger.mjs` rather than kept by hand — on 2026-09-18 six
new lessons were built with no episode at all, against the standing decision to keep the story for
everything, and nobody noticed because nothing counted.

| Chapter | Setting | Episodes | State |
|---|---|---|---|
| 1 | British printing workshop | 2 of 2 | Pilot-approved at version 3 |
| 2 | British port | 1 of 2 | Blocked: the second needs punctuation content that does not exist |
| 3 | Community in Canada | 2 of 2 | Draft |
| 4 | Canadian newspaper office | 0 of 2 | Blocked: needs commas, quotations, fragments and run-ons |
| 5 | Railway journey west | 2 of 2 | Draft |
| 6 | Alberta archive | 0 of 2 | Blocked: needs editing content, and resolves chapters not yet written |

Each new episode is placed in the chapter the plan assigns it **by language focus**, not by when it
was written: word parts and multisyllable vocabulary belong to chapter 5's railway journey, and
"two accounts describe the same incident differently" is chapter 3, which is exactly what the
stated-versus-inferred lesson teaches.

Chapter 2's first episode covers `GR.subject-object-pronouns` — a C0 pack that has been
pilot-approved since 2026-09-09 **with no episode at all**, which the ledger exposed. Chapter 2's
case in the plan is "a letter's intended recipient is unclear", which is a pronoun problem.

Every episode outside chapter 1 is draft: not challenged, not reviewed, not integrated, not
pilot-approved. A test holds the prose inside the grade band, the fact box below it, the recap at
two sentences, and every linked task to a lesson object that really exists.

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

## The grade ladder, 2026-09-19

The parent's goal sharpened on 2026-09-19: test the 知识点 from before Grade 5 to find what was missed,
consolidate Grade 5 and 6 (夯实基础), then prepare for what comes after — and have every tile and every
question say which grade it belongs to. That last part changes the architecture. A knowledge point used to
be either in the app or not; it now carries a grade placement, and the app reports POSITION rather than
pass or fail.

**What exists.** `src/data/curriculum.k6.json` holds all 813 Skills & Procedures across Kindergarten to
Grade 6, extracted from the PDF's own text layer with column positions preserved. `curriculum.ladder.json`
places 41 of the app's 50 skills on it; the other 9 get a stated reason instead of a grade. Both are
generated — `tools/build_k6.mjs` and `tools/build_ladder.mjs` — and neither is hand-edited.

**Why it can be trusted, and what it still cannot claim.** Every rung cites outcome ids that are resolved
against the extraction, and the build fails on an id that does not exist, so a rung cannot name a grade the
curriculum does not state. The generalised extractor reproduces all 214 hand-verified Grade 5/6 statements
word for word, held by test. But **nobody has checked the ladder itself**: `mappingReviewedBy` is null, and
while it is null no learner is shown a grade at all. That is OPEN-10, and it is the one thing blocking the
feature the parent asked for.

**Three things a fresh session will get wrong otherwise:**

- Alberta ends **Phonics after Grade 3**, not Grade 4. Phonological Awareness ends after Grade 2, Fluency
  after Grade 4. The older note in `skillsWithNoGrade56Outcome` says Grade 4 for Phonics and is off by one
  (DEF-58). The conclusion it supports is still right.
- A **missing learner grade is not an unplaceable skill**. They were one bucket for an afternoon, and the
  parent page told anyone who had not yet set a grade that all fifty skills were absent from the
  curriculum. `no_learner_grade` and `unplaced` are separate and must stay separate.
- **The recommendation is not to build a separate catch-up app.** A child can be Grade 6 on vocabulary and
  Grade 3 on apostrophes; one app with grade tags represents that and two apps cannot, and splitting them
  splits the evidence record. The 48-question below-grade diagnostic exists to test that recommendation
  rather than assume it, and answers from the SHAPE of the gap — scattered means packs here, wholesale
  means talk first, less than half the form done means no answer at all.

## What was built on 2026-09-19

Beyond the grade ladder above:

- **Season 1 is 12 of 12 episodes written**, up from 7. Ten of the twelve are draft; only chapter 1 is
  pilot-approved. The ledger's per-chapter blockers are now derived from what has content, so it moves
  on its own instead of needing an edit.
- **Nine new packs, 216 questions**, all draft: five punctuation (`PU.list-commas`, `PU.clause-commas`,
  `PU.apostrophes`, `PU.dialogue`, `PU.direct-address`), two sentence (`SE.fragments`, `SE.runons`) and
  two editing (`ED.locate`, `ED.repair`). These were the skills the story was blocked on, all declared
  in `skills.json` with nothing behind them.
- **A 48-question below-grade diagnostic**, three questions for each of the sixteen skills Alberta
  finishes with before Grade 5.
- **One pack builder** instead of three. The three copies had drifted in the direction that mattered:
  only C0 honoured the fields a correction writes back, so a correction installed into a C1 or F1 pack
  would have been dropped by the builder that assembled it.

**The count that matters: 15 draft packs holding 360 questions are waiting at `/parent`, and nothing
new has reached a child.** That is the lifecycle working. What it needs next is reading, not building.

## The second pass on 2026-09-19: making what exists usable

The morning built the grade ladder. The afternoon found that a lot of what had been built could not
actually be used, and fixed it.

- **The parent could not approve anything.** Three of the five pack files never ran through
  `applyPilotApproval`, so an approval record for 264 of the 360 drafted questions would have done
  nothing. One tail for every batch now, in `src/data/draftBatch.js`.
- **The ten story episodes were unread, not gated.** Fixing the story path was item four of the
  morning's own plan and was skipped.
- **The diagnostic could not be answered.** `/diagnostic` runs it now, into a fenced store that has
  no path into the learner record.
- **Nine packs cited four outcomes no answer key can judge**, and two hand-written cross-references
  between the mapping and the packs had gone stale within a day. Both are derived now.
- **Six grammar packs**, taking grammar from 1 of 11 skills to 7 of 12: agreement, tense, pronoun
  reference, possessives, plural forms, and one pack for the five pronoun types that share a single
  Alberta outcome.

**What a fresh session should know before touching any of this:**

- `test/reachability.test.js` requires any module or content file nothing imports to be **declared
  with a reason**. If you add a data file and the tests fail, that is the guard working — wire it or
  say why it is author-time.
- **Claude may never set a verdict, `reviewStatus`, `integrationStatus`, or a pilot approval.**
  `test/lifecycleRecords.test.js` makes this mechanical: integration records may be drafted in full,
  challenge records only as self-challenges that say so in their own fields, and educational review
  forms are prepared with the judgement left blank.
- **A count pinned in a test is usually a tripwire, not drift.** Adding one skill fired four of them
  and all four were right to fire. Update them with the reason recorded beside the change, the way
  the existing entries do.
- `/parent` is long now. It carries the approval path, the grade ladder, the diagnostic and its
  report, the coverage report, and the three lifecycle records — which is the point, because it is
  the only surface where the parent can act.

## Recent history

- PR #19 — the R2 correction pass (merged). Shipped a blank-page defect to production.
- PR #21 — hotfix, one missing import (merged). The build was green the whole time; a bundler treats a free
  identifier as a global.
- PR #20 — the Test Lab split (merged, `e162dad`).
- Current branch — DEF-37, the self-cancelling audio.
