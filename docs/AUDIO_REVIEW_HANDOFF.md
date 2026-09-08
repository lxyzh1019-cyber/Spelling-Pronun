# C0 Part-A audio listening check and educational review

This checklist is the remaining C0 audio dependency. Completing it does **not** authorize release: the educational-review, integration, pilot-approval, learner-test, device, and pilot gates all still apply.

## What changed on 2026-09-08, and why

An earlier version of this file required 24 independently recorded human audio assets and 16 checks by an external phonics specialist. Neither is in the master plan. Section 10 asks for *suitable Canadian English model audio where available*, truthful labelling when only another English model is available, and human review only for isolated phoneme audio, which "ordinary TTS reading letter names" cannot provide. Section 8 requires that pronunciation never be scored from a transcript, which the app already enforces.

The stricter requirement was an implementation choice, not an approved obligation, and no external specialist or native-speaker rater is available to this family. It is withdrawn and replaced by the standard below (decision CHG-07 in `docs/IMPLEMENTATION_STATUS.md`).

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
| B | frantic; remember; Tembish; Lopudent | information; community; sentence-reading prompts 19–20 |

The review must confirm that each invented-word item has exactly one supportable answer **from the spelling alone**, that stress and phrasing targets are observable, and that recordings stay pending rather than receiving an automatic score.

The four invented-word prompts are currently quarantined by corrections `corr.c0.003` and `corr.c0.004`: their earlier form supplied the pronunciation, which measured matching rather than decoding. The proposed replacement is a print-only segmentation item plus a recorded reading the learner compares with the model audio. Because no rater is available, that recording is never scored and the report must state that independent decoding is not measured.

## Import and promotion order

1. Complete the listening check and import the reviewed assets with truthful `kind` and locale.
2. Complete the educational review and resolve every discrepancy, including the open corrections.
3. Promote only the verified Part-A items from challenge-only to reviewed, then integrated.
4. Keep the assessment unreleased. A private pilot needs a recorded parent pilot approval; release additionally needs learner testing and the device checks. Assisted, pending, and technical-failure answers stay excluded from mastery throughout.
