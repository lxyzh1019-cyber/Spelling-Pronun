# C0 Part-A audio and specialist-review handoff

This checklist is the remaining C0 content dependency. It does **not** authorize release by itself: after the assets and reviews are supplied, the existing educational-review, integration, learner-test, real-iPad, and pilot gates still apply.

## Human-audio delivery — 24 prompts

Supply one final audio asset for each spelling dictation and listening prompt below. Every asset needs a stable ID, version, public app URL, exact transcript, locale, and review status. The validator accepts a non-Canadian English locale only if the app has a learner-facing disclosure; it does not let that audio be described as Canadian English.

| Form | Dictation words | Listening contrasts |
|---|---|---|
| A | adventure; carefully; planned; disappear; celebration; comfortable; independent; transportation | ship/sheep; bit/beat; full/fool; cap/cab |
| B | remarkable; readiness; stopping; impatient; observation; temperature; responsible; communication | live/leave; sit/seat; pull/pool; rice/rise |

For each asset, a separate reviewer must confirm that the spoken word/contrast matches the exact transcript and item key, that the recording is intelligible on target iPad playback, and that it is suitable for the named locale. Do not substitute browser synthesis or mark `synthetic_preview` as reviewed human audio.

## Specialist phonics/pronunciation pass — 16 prompts

A qualified independent reviewer must check the following Part-A decoding and speaking prompts, their options/rubrics, and the named target. Record the reviewed item ID, version, reviewer role/date, sources used, findings, and any discrepancy/resolution in `reviews.educational.assessment.c0.json` before promotion.

| Form | Decoding prompts | Speaking prompts |
|---|---|---|
| A | splendid; astonish; NAR-pish; VEM-ih-kayt | photograph; invitation; sentence-reading prompts 19–20 |
| B | frantic; remember; TEM-bish; LOH-puh-dent | information; community; sentence-reading prompts 19–20 |

The review must verify that each invented-word pronunciation makes one choice uniquely supportable, that stress/phrasing targets are observable, and that recordings remain `pending human review` rather than receiving automatic pronunciation scores.

## Import and promotion order

1. Add reviewed human-audio assets and attach an `audioRef` plus `audioStatus: 'reviewed_human'` to the 24 spelling/listening items. The asset transcript must exactly equal each item’s `spokenText`.
2. Record the independent audio and specialist-review evidence; resolve every discrepancy.
3. Promote only the verified Part-A items from challenge-only to educational/source reviewed, then run the content-review and integration validation.
4. Keep the assessment unreleased until learner testing and the real-iPad checks are complete. Release eligibility must still exclude assisted, pending-human-review, and technical-failure attempts from mastery.
