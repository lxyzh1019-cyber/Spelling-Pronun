# C0 Part-A audio listening check and educational review

This checklist is the remaining C0 audio dependency. Completing it does **not** authorize release: the educational-review, integration, pilot-approval, learner-test, device, and pilot gates all still apply.

## What changed on 2026-09-08, and why

An earlier version of this file required 24 independently recorded human audio assets and 16 checks by an external phonics specialist. Neither is in the master plan. Section 10 asks for *suitable Canadian English model audio where available*, truthful labelling when only another English model is available, and human review only for isolated phoneme audio, which "ordinary TTS reading letter names" cannot provide. Section 8 requires that pronunciation never be scored from a transcript, which the app already enforces.

The stricter requirement was an implementation choice, not an approved obligation, and no external specialist or native-speaker rater is available to this family. It is withdrawn and replaced by the standard below (decision CHG-07 in `docs/IMPLEMENTATION_STATUS.md`).

## Where to run this

Open the app and go to **For the parent → Things I need you to test** (`/checks`), in the **Technical Test
Lab** half. All three listening checks play there: the sixteen dictation words, both sides of all eight
contrast pairs, and the twelve receptive decoding recordings. You do not take the assessment to hear them,
and nothing you do there touches Jenn's or Jess's progress.

Each row is derived from the assessment item itself and shows the item id and version it came from, so a
row cannot drift from what the app will really play. One row is not something the app plays: a contrast
item speaks only its target, so the Test Lab speaks the other side too, labelled as a comparison. That
comparison is the only way to answer whether the pair is distinguishable.

The page keeps your place, preserves an earlier result if you re-check a row, and exports the findings as
markdown for the ledger. Recording a pass there is an observation only; it imports no audio asset and
releases nothing.

## A. Listening check — 24 spoken prompts

Play each prompt in the app and record the result. Model or synthetic audio is acceptable; a human recording is required only where the item sets `requiresHumanAudio` (isolated phoneme audio). Nothing here is a language judgement: the check is that the audio says the intended word, clearly, on the device the children will use.

| Form | Dictation words | Listening contrasts |
|---|---|---|
| A | adventure; carefully; planned; disappear; celebration; comfortable; independent; transportation | ship/sheep; bit/beat; full/fool; cap/cab |
| B | remarkable; readiness; stopping; impatient; observation; temperature; responsible; communication | live/leave; sit/seat; pull/pool; rice/rise |

For each prompt record:

1. The audio plays the intended word, and only that word.
2. It is understandable on the target iPad at normal volume.
3. For a contrast pair, the two options sound different from each other.
4. The voice actually used, and its locale. If it is not Canadian English, the app must say so on screen. Never describe a non-Canadian voice as Canadian, and never mark synthesis as a human recording.

An asset is then imported into `src/data/audio.c0.js` with a stable ID, version, URL, the exact transcript, locale, `kind` (`model_speech` or `human_recording`), and `reviewStatus: 'reviewed'`. The item carries `audioStatus: 'reviewed_model'` or `'reviewed_human'` to match. The content validator rejects any mismatch between the asset transcript and the item's spoken text.

## B. Educational review — 16 decoding and speaking prompts

A qualified reviewer in the project's own review role (Codex, per the plan's ownership table) checks these prompts, their options, rubrics, and named targets, and records the item ID, version, reviewer role, date, findings, and any resolved discrepancy in `reviews.educational.assessment.c0.json`.

| Form | Decoding prompts | Speaking prompts |
|---|---|---|
| A | splendid; astonish; Narpish; Vemicate | photograph; invitation; sentence-reading prompts 19–20 |
| B | frantic; remember; Tembish; Lopadent | information; community; sentence-reading prompts 19–20 |

The review must confirm that each invented-word item has exactly one supportable answer **from the spelling alone**, that stress and phrasing targets are observable, and that recordings stay pending rather than receiving an automatic score.

## Receptive decoding recordings — 12 to check

The four invented-word prompts were rebuilt on 2026-09-09 (corrections `corr.c0.003` and `corr.c0.004`, resolved by the parent). The learner now sees the printed word and chooses which of three recordings matches how the spelling would normally be read. The choice is machine-scored, so **each recording must be listened to before the pilot uses these items**: synthesis can render an invented word differently from the intended reading, and the learner would then be marked wrong for the voice rather than for their answer. The validator refuses pilot approval for any item whose audio is still an unchecked synthetic preview.

Each item names its expected reading in `targetPronunciation`, and each choice carries a `checkerNote` describing the misreading it represents.

| Form | Word | Expected reading | The three recordings |
|---|---|---|---|
| A | Narpish | NAR-pish | long-a misreading; the expected reading; long-e misreading of the i |
| A | Vemicate | VEM-ih-kayt | the expected reading; long-e misreading of the first e; short-a misreading of the final syllable |
| B | Tembish | TEM-bish | long-e misreading of the e; long-e misreading of the i; the expected reading |
| B | Lopadent | LOH-puh-dent | the expected reading; closed first syllable; long-a misreading of the middle a |

For each of the twelve, confirm that the recording is intelligible, that it renders the reading its note describes, and that the expected reading is the one a Grade 5 reader would produce from the spelling. If a distractor is indistinguishable from the expected reading, the item is not usable and must go back for correction rather than into the pilot.

The read-aloud step offered after each of these items is optional practice. It stays on the device, is never scored, and produces no attempt record, because no qualified rater is available.

## Import and promotion order

1. Complete the listening check for the dictation and contrast prompts and for the twelve receptive decoding recordings, then import the reviewed assets with truthful `kind` and locale.
2. Complete the educational review and resolve every discrepancy.
3. Promote only the verified Part-A items from challenge-only to reviewed, then integrated.
4. Keep the assessment unreleased. A private pilot needs a recorded parent pilot approval; release additionally needs learner testing and the device checks. Assisted, pending, and technical-failure answers stay excluded from mastery throughout.
