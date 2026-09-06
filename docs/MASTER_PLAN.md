# The Missing Manuscript — Master Implementation Plan

Version: 2.0 • Revised 5 September 2026 • Replaces v1 in full
Repository: https://github.com/lxyzh1019-cyber/Spelling-Pronun
Reviewed baseline: `58fe21ebb6ad351094d4686a9713e6ccbdba6744` (PRs #15 and #16 merged).
Status: planning deliverable, with explicit content-production and release governance. No repository implementation, complete question pool, historical research pack or pilot testing is delivered by this document. The repository findings below are from the recorded baseline, not a new live audit.

> Codex execution note: references to “Claude” identify the implementation-agent role. Codex performs that role for this repository; ownership, evidence, review, and user-approval boundaries remain unchanged.

## 0. Project control: one plan, three software releases

This is the single authoritative implementation plan. Place it at `docs/MASTER_PLAN.md` when the user authorizes repository work. Do not also retain v1 as an active instruction file. Git/version history retains earlier versions. Seven learning tracks, work packages and release gates are sections of this plan, not seven planning documents.

### 0.1 What is released and when

| Deliverable | Number | Release point | What it is not |
|---|---:|---|---|
| Master plan v2 | 1 | This handoff | Not an authored question pool or implemented app |
| R1 Repair | 1 software release candidate | Critical existing-app repairs and regression gates pass | Not the expanded curriculum |
| R2 Pilot | 1 software/content release candidate | Complete assessment A/B, four reviewed skill packs, first two story episodes and complete learning flow pass | Not the full app scope completed |
| R3 Full | 1 software/content release candidate | All 42 skill packs, 12 episodes, retained pilot fixes and full acceptance matrix pass | Not a collection of placeholder pages |

Only these three product release milestones are planned. Internal commits/PRs and content batches do not require new plans. If a defect requires a patch release, label it a patch to the relevant milestone, not a new project phase. Candidate ready is distinct from deployed; deployment follows the user's existing approval workflow.

No calendar delivery dates are claimed. After initial inspection, Claude records an effort range, dependencies and a proposed date per release in the status ledger. Track hands-on implementation effort separately from waiting for content, credentials, child participation and user decisions. Revise estimates when evidence changes, not by silently moving scope out of a release. Plan generation does not schedule future autonomous work by GPT or Claude.

### 0.2 Owners and handoffs

| Responsibility | Accountable owner | Executing role | Required evidence |
|---|---|---|---|
| Goals, scope changes, budget, production release | Parent/user | Parent/user | Explicit decision recorded in the ledger |
| Master plan, curriculum, assessment blueprint and teaching standards | GPT in this conversation | GPT | Versioned specification and resolved decision entries |
| Initial question pools, accepted answers, explanations, story and historical source mapping | GPT | GPT authors; Claude may propose labelled draft variants | Structured content pack and item-by-item review record |
| Code, data import, schema validation, persistence, migration and regression tests | Claude | Claude | Commit plus commands/results and implementation checks |
| Independent content challenge | GPT | Claude challenges answers/ambiguity; GPT resolves substantive content issues | Discrepancies recorded and resolved against item IDs |
| Real iPad and learner observations | Parent/user | Jenn/Jess try tasks; parent reports observations | Device/version, observed result and concrete problem examples |
| Release readiness report | Claude | Claude assembles code, content and device evidence | All required gate IDs, status and links |

The parent does not need to author questions or mediate routine answer-key discrepancies. GPT owns the initial content and educational review; Claude owns implementation. Neither role is interchangeable without an explicit decision. There is no automatic transfer between this chat and Claude Code: the content must actually be supplied or checked into the authorized workspace before Claude can consume it. Claude must identify the exact missing pack rather than claim GPT has delivered it or silently substitute unreviewed content.

If content is not yet supplied, Claude proceeds with R1 and engine/schema work using isolated, clearly labelled test fixtures. Such fixtures cannot be shipped as reviewed teaching content. Lack of a pack blocks its content gate, not unrelated authorized engineering. No further plan is needed to author a listed pack: it is execution of this plan, performed when that work is started in a subsequent session.

### 0.3 Decision authority and change control

User instructions control goals and authorization. Read repository instructions; surface conflicts with this plan rather than secretly modifying or ignoring them. Source code defines existing behavior, not desired educational policy. Tests do not override an approved requirement merely because they encode old behavior.

| Change class | Examples | Claude's authority |
|---|---|---|
| Routine implementation | Component extraction, CSS repair, functional updater, test framework selection within current stack | Implement and record; no renewed approval |
| Defect against this plan | Duplicate results, wrong learner attribution, evaluator rejects an explicitly accepted answer | Fix and verify; do not change the rule to hide failure |
| Content correction without policy change | Typo, false historical claim, missing valid answer | Quarantine affected item; propose corrected version for GPT content review; continue other work |
| Material educational/scope change | Remove a track, lower minimum pool, change mastery/skip/hint rules, change story premise | Record proposal, rationale, impact and recommendation; parent decision required |
| External or consequential action | Paid speech, cloud recording opt-in, destructive migration, production publication | Use existing explicit authorization if applicable; otherwise obtain the required decision |

Plan defaults are provisional implementation choices, not claims of prior user agreement. They remain visible and configurable. Do not manufacture approval dates. A change entry contains `changeId, requirementId, proposedChange, reason, affectedCode/content/tests, decisionOwner, decision, decidedAt`. Only a material accepted change revises this same master plan; no planned v3–v7 sequence exists.

### 0.4 One operational status ledger

Claude maintains `docs/IMPLEMENTATION_STATUS.md` as a ledger, not a competing plan. It contains requirement status, release gates, content manifest, defects, decisions and current estimate in one place. No separate weekly narrative is required. Code/data/test files are ordinary implementation artifacts, not planning deliverables.

For every requirement or pack use: `ID | owner | release | state | artifact/commit | verification evidence | blocker/next action`. Allowed states: not started, drafting, in review, changes required, verified, integrated, device-tested, released. Do not infer later states from earlier ones.

A content-manifest row additionally stores exact item counts by role, version/hash, author, reviewer, source-review status and unresolved discrepancy count. Initial authored/reviewed count is **zero for new packs**. This document's illustrative example is not a completed reviewed pack. Existing 600 word entries remain legacy inventory, not 600 new questions or automatically verified content.

### 0.5 Requirements and release traceability

| Requirement | Definition | Implementation sections | Release |
|---|---|---|---|
| GOV-01 | One plan, explicit owners, evidence and change control | 0, 12, 15 | R1–R3 |
| ENG-01 | Build and confirmed existing-app repairs | 2, 11, 13 | R1 |
| DATA-01 | Preserve history and classify evidence correctly | 8–9 | R1 classification; R2 durable engine |
| DATA-02 | Resume, learner identity and device sync | 9, 13 | R2 |
| EDU-01 | Explicit teaching/correction/transfer cycle | 5–6 | R2 pilot; R3 all packs |
| EDU-02 | Repeatable assessment and honest reports | 7–8 | R2 |
| EDU-03 | Seven tracks / 42 skill packs complete | 0.6, 5 | R3 |
| STORY-01 | British-to-Canadian mystery with sourced historical background | 4 | R2 chapter 1; R3 all six |
| SPEECH-01 | Listening and recording/playback with failure handling | 10 | R2 basic; R3 five packs |
| QA-01 | Content, code and real-device gates kept distinct | 12–14 | R1–R3 |

### 0.6 Exact content-production inventory

These are v2 scope quantities selected for implementation planning, not empirically validated optimal doses. They replace v1's unspecified review-variant counts. A pack covers one stable skill ID; broad skills must still declare their subtopics and coverage. Counts are minimum release inventory, not a required number of repetitions for a child.

Each of **42 skill packs** contains: 2 contrasting worked examples + 6 guided/practice items + 10 independent items + 2 transfer tasks + 4 delayed-review variants = **24 content objects**, including **22 learner tasks**. Each pack also has one concise rule explanation, prerequisite mapping and a help ladder attached to each task. Each individual question includes its answer/rubric and feedback; a shared vague explanation does not satisfy this requirement.

| Track | Packs | Exact required skill IDs | Objects / learner tasks |
|---|---:|---|---:|
| Spelling | 5 | SP.patterns, SP.inflections, SP.wordparts, SP.confusables, SP.dictation | 120 / 110 |
| Phonics | 5 | PH.blend-segment, PH.vowels, PH.digraphs-clusters, PH.syllables, PH.multisyllable | 120 / 110 |
| Pronunciation | 5 | PR.discrimination, PR.target-sounds, PR.endings, PR.word-stress, PR.sentence-reading | 120 / 110 |
| Grammar | 11 | GR.subject-object-pronouns, GR.antecedents, GR.agreement, GR.tense, GR.articles-plurals, GR.possessives, GR.reflexives, GR.relative, GR.interrogative, GR.demonstrative, GR.indefinite | 264 / 242 |
| Sentences | 5 | SE.complete, SE.fragments, SE.clauses, SE.runons, SE.combining | 120 / 110 |
| Punctuation | 7 | PU.capitals-endmarks, PU.list-commas, PU.direct-address, PU.introductory, PU.clause-commas, PU.apostrophes, PU.dialogue | 168 / 154 |
| Editing | 4 | ED.locate, ED.repair, ED.explain, ED.transfer | 96 / 88 |
| **Skill-pack subtotal** | **42** | **42 unique primary skill IDs** | **1,008 / 924** |
| Assessment A/B | 2 forms | 34 prompts per form, as section 7 specifies | 68 / 68 |
| **Total new pool** | | Excludes legacy words and story prose | **1,076 / 992** |

Assessment A/B must use different prompts, with matched specifications and zero lesson-pool overlap. Repeated anchor prompts are excluded from these initial forms; a later form can add an explicitly declared anchor design through content review. Ten independent pack items must not be simple noun swaps: vary sentence structure, context, distractor and application while retaining the target skill. Transfers and review variants use separate IDs and wording. Multi-target items count once under a primary pack; do not inflate totals by counting tags as questions. Editing passages are counted as one task object even if their rubric scores four features.

All open-ended speaking/writing tasks count as authored tasks but are not automatically machine-gradable. Their rubric and pending-review behavior must be complete. Do not invent scores to meet pool-completion targets.

### 0.7 Content batches, ownership and exact handoff timing

| Batch | Scope and counts | Owner | Due relative to implementation |
|---|---|---|---|
| C0 Reference/pilot | 68 assessment prompts; 4 packs: SP.patterns, SE.complete, PU.capitals-endmarks, GR.subject-object-pronouns (96 objects); story bible + chapter 1's 2 episodes | GPT | Before R2 content integration/learner release; engine work can begin earlier |
| C1 Sentences/grammar/punctuation | Remaining 4 sentence packs, 10 grammar packs, 6 punctuation packs = 20 packs / 480 objects; chapters 2–4 = 6 episodes | GPT | After pilot feedback is reviewed; before R3 integration gate |
| C2 Word/speech/transfer | Remaining 4 spelling packs, 5 phonics, 5 pronunciation, 4 editing = 18 packs / 432 objects; chapters 5–6 = 4 episodes | GPT | After C0 standard is verified, can be authored alongside C1; before R3 integration gate |

Totals: 4 + 20 + 18 = 42 packs; 164 + 480 + 432 = 1,076 objects; 2 + 6 + 4 = 12 episodes. Batch boundaries are delivery organization, not the child's curriculum order or three new plans. Claude imports these structured files, validates them and tracks them in the same ledger.

The twelve episodes form the narrative spine; they cannot teach 42 skills from scratch in twelve twenty-minute sessions. Each episode can host several resumable lessons, with adaptive skill workshops available outside the story. Never claim that finishing the story establishes mastery of all 42 packs. Pilot chapter 1 centres on spelling/sentences/punctuation; the pilot pronoun pack can be a separate workshop. In the full season, map each pack to at least one episode or named workshop before release.

### 0.8 Content governance and review protocol

Lifecycle: `draft -> schema-valid -> independently challenged -> educational/source-reviewed -> integrated -> learner-tested -> released`. Authoring and checking must be separate passes. Automated schema checks cannot mark educational review complete. GPT's ownership here means review during actual work sessions, not an unseen expert certification.

For every initial assessment item, every answer key, every explanation and every historical claim: inspect the full content, do not sample. Claude's challenge pass attempts reasonable alternative answers, checks whether hints reveal later assessment answers and flags mismatched rubrics. GPT resolves disagreements and records the result per item or explicitly enumerated item range. Every flagged item remains unreleased until resolved. Optional game text uses the same factual and language standards.

Every task record requires `id, version, primarySkill, secondarySkills, role, difficulty, prerequisites, prompt, responseType, acceptedAnswers or rubric, explanation, helpSteps, commonErrors, evidenceEligibility, transferGroup, sourceIds where applicable, authorStatus, reviewStatus`. Use the schema in section 9 for implementation details; this adds required pedagogical metadata.

Reject content if it has an ambiguous forced answer, unsupported factual claim, misleading rule, trivial duplicate, inappropriate reading load, answer leaked by story text, inaccessible interaction, missing accepted variant or no useful corrective feedback. Source-backed claims require the exact source mapping; fictional historical documents require visible labels.

At each release, freeze a manifest of item/story/rubric versions and hashes. A correction creates a new version, flags affected attempts for re-evaluation where possible and preserves raw answers. Do not retroactively rewrite a child's response. If the evaluator changes, recompute derived mastery with a derivation version and explain material changes. Sessions pin content versions; do not replace an answer halfway through a session.

### 0.9 Version-control decision log

| Decision | v2 resolution |
|---|---|
| Seven stages interpreted as seven documents | One master plan; three product releases; technical tasks remain subordinate |
| Question pool ownership left unclear | GPT accountable for original content and review; Claude accountable for software/import/validation; missing content is an explicit dependency |
| Unbounded content promise | 42 packs, 68 separate assessment prompts, 12 story episodes; exact totals and batches above |
| Pilot timing was after bulk curriculum work | R2 family pilot occurs before full expansion; C1/C2 use its findings |
| Claimed delivery versus actual delivery | This handoff delivers the master plan only; no question pack is marked authored |

No additional open decision prevents issuing this plan. Parent account setup, actual pilot participation and production deployment are execution dependencies, not reasons to create more planning documents.

## 1. Read this first: scope and decisions

Expand the existing React/Vite spelling app into an integrated Grade 5 English learning app for Jenn and Jess. Retain spelling and add phonics, pronunciation, pronouns, other grammar, sentence construction, punctuation and independent editing. Use a fictional mystery grounded in researched British and Canadian history: **The Missing Manuscript**, approximately one-third Britain and two-thirds Canada, ending in Alberta.

The parent wants teaching and reliable learning evidence, engaging stories, correction of mistakes and independent self-checking. The children already attend regular school; do not assume beginner English, an accent problem, or a specific phonics deficit. Assess each child separately. Do not convert ancestry into assigned pronunciation weaknesses.

### Confirmed requirements

- Extend this repository; do not start a second app or rewrite the framework.
- Keep both learner profiles and existing word history.
- Keep grammar/pronouns alongside pronunciation and phonics; none replaces another.
- Use British-to-Canadian historical backgrounds, with fictional people/documents labelled.
- Teach modern Canadian English even inside historical episodes.
- Build a repeatable assessment and distinguish independent answers from helped corrections.
- Keep the learning loop: attempt, inspect, understand, repair, apply to a new example, review later.
- Preserve iPad usability and support meaningful continuation across visits.
- Diagnose/fix the current build failure before expanding.

### Provisional defaults, explicitly not previous user agreements

Implement these as settings/constants rather than asking another round of setup questions:

- Target lesson: 20 active minutes, adjustable to 10/15/20. Weekly frequency remains unset; do not invent a required weekly schedule.
- A lesson can span multiple days. Time is guidance, not a deadline or auto-fail rule. No expiry or game gate copied from another app.
- English-first lessons; optional short Chinese help for rules, not automatic bilingual duplication.
- Family calendar dates use `America/Edmonton`; server timestamps establish online event time. Never trust device-local calendar formatting for daily eligibility.
- No paid speech subscription or open-ended AI grading dependency for initial release.
- Retain working badges and optional games. Do not introduce a new XP economy, sibling leaderboard policy, or links to the family reward system in this project.
- Cloud recording storage is off by default. Sharing/publishing permissions remain governed by the user's normal repository workflow.

### Out of scope

Full essay tutoring, unrestricted chatbot, historical accent imitation, speech-disorder diagnosis, social features, history-exam mastery, a new backend framework, or a generic multi-language platform. Do not modify the French/Chinese apps. Their exact rules have not been reviewed here.

## 2. Baseline and first engineering gate

Read current `CLAUDE.md`, any applicable `AGENTS.md`, git status and latest main before editing. Compare new HEAD with the reviewed SHA. Preserve unrelated work and mark each finding as still present / already fixed / changed. Do not mechanically reapply stale fixes.

### Confirmed build blocker

`src/context/WordProvider.jsx` imports `useRef` twice. The second declaration is at line 9 at the baseline. GitHub Actions reports `The symbol "useRef" has already been declared`; build fails and deployment is skipped.

Minimal repair: remove only the duplicate import, preserve both existing uses, install from the lockfile and run `npm run build`. Record exact command/result and commit. A successful build proves compilation, not learning-flow correctness.

Evidence: https://github.com/lxyzh1019-cyber/Spelling-Pronun/actions/runs/33994402594/job/101383481838

### Repair matrix before new content

| ID | Current source and issue | Required change | Acceptance |
|---|---|---|---|
| F01 | WordProvider duplicate import | Remove duplicate | Production build succeeds |
| F02 | SpellingTest Try Again only calls handleStart | One explicit fresh-session initializer clears finished/index/input/feedback/hints/score and chooses the proper word set | Complete test, restart, answer first word; score is fresh |
| F03 | Last-word skip calls handleNext before score update is reflected | Derive completion and perfect badge from final authoritative answers, including the skip | Correct all but last, skip last: never perfect |
| F04 | Home challenge links to ordinary /test; provider checks lifetime correct counts | Explicit daily challenge session with stored five-word snapshot and current challenge ID; define completion as all five attempted, corrections separate, no perfect badge for skipped answers | Previously correct words do not satisfy today's challenge; Start uses exact five |
| F05 | MultiplayerWrapper changes turn label without learner attribution | Bind session and each answer to explicit learner ID; real switch creates/suspends that learner's state | Opponent's answer reaches only opponent's record |
| F06 | Crossword fixed 8x8 truncates long first word | Use bounded dynamic grid that fits selected words or filter unsupported lengths; never truncate; verify every entry fits before render | Long words cannot generate partial or impossible answers |
| F07 | recordResult now creates nextProgress from a stale captured progress object; crossword calls it repeatedly | Use pure functional local updates and an event batch for puzzle answers; persist independent attempt IDs; run aggregate/achievement effects after batch | Five crossword entries produce five results online and offline |
| F08 | Self-rated flashcards, assisted scramble/hangman and dictation share correct counts | Retain game outcomes but label evidence type; self-report and visible-letter games cannot establish independent dictation mastery | Flashcard Got It does not raise spelling assessment mastery |
| F09 | Failed auth resolves null but provider load path exits early | Explicit loading/online/local-only/error states; durable local session save | Auth failure ends loading and permits local work; no promise of cloud sync |
| F10 | Anonymous IDs are device-scoped; no family linking | Add the shared-family identity path in section 9 | Same learner history is visible on two linked devices |
| F11 | Sessions live in component state; profile changes can leave old exercise state | Save session snapshot; bind ownership; suspend on switch; discard stale async callbacks | Switch Jenn to Jess mid-question: no answer or feedback leakage |
| F12 | Daily hints share a cap in some games but not others | Lessons always offer instructional help; assessments flag assistance; retain game hint rules only as game rules | Exhausted game hints never prevent learning help |

Additional checks: crossword Check currently reveals and locks answers; add a repair phase without altering original results. SpeedRound's 200-word option is practice, not a short required lesson. Best Streak currently uses per-word current streaks, not consecutive different words or a historical maximum; relabel or implement a real session streak before retaining that claim. Verify speech helper has a bounded voice-loading fallback and a visible retry if playback cannot start. Review daily_champion badge definition, which was absent at the reviewed baseline despite being requested by completion code.

## 3. Product structure

Home has four primary actions:

1. **Continue my case** — exact saved story/lesson state, or begin next recommended episode.
2. **Practise again** — due reviews and unresolved skills.
3. **Play a word game** — existing games as optional practice.
4. **My progress** — skills and assessment access; parent detail behind a separate view.

Assessment must remain independently accessible later. It must not require replaying story chapters. Profile name is always visible. Parent settings must not interrupt ordinary lesson screens.

Suggested routes (adapt existing router; retain old game URLs): `/case`, `/lesson/:sessionId`, `/review`, `/assessment`, `/assessment/:sessionId`, `/progress`, `/parent`. Store content IDs, not route paths, as progress identity.

## 4. Story bible and historical integrity

### Premise and resolution

In a modern Alberta archive, Jenn/Jess encounter a manuscript assembled over generations. A recent exhibition transcription contains missing passages and inconsistencies. They compare labelled fictional source documents and discover that a young correspondent's contribution was credited to someone else because a letter never reached its destination. The final task restores the account and explains the evidence. The plot reveals a personal story; it does not pretend to overturn documented Canadian history.

Use the active child as investigator and a small recurring fictional cast: an archivist guide, a humorous assistant, and people encountered through documents. Neither sibling is assigned a fixed ability or personality. Historical characters are not secretly all related unless explicitly justified in the story bible.

Use archival reconstruction and present-day investigation; do not silently introduce time travel. A page written in an earlier century cannot mention later events. Establish document date, author, recipient, location and chain of custody before authoring clues.

### Season 1: six chapters, two episodes each

| Chapter | Setting proposal | Case progression | Core language focus |
|---|---|---|---|
| 1 | British printing workshop | A manuscript and its printed copy disagree | Spelling, capitals, complete sentences |
| 2 | British port; departure across Atlantic | A letter's intended recipient is unclear | Pronouns, antecedents, end punctuation |
| 3 | Community in what is now Canada, historically verified locale | Two accounts describe the same incident differently | Agreement, tense, vocabulary and clear reference |
| 4 | Canadian newspaper office | A report changes meaning in transcription | Commas, quotations, fragments/run-ons |
| 5 | Railway journey west | Dates, messages and diary entries must be reconciled | Conjunctions, sequence, word parts and multisyllable vocabulary |
| 6 | Alberta archive | Evidence supports the corrected attribution | Integrated editing, sentence writing and final evidence explanation |

This is a narrative design, not verified historical chronology. Before writing learner-facing historical claims, choose compatible periods and document the timeline. Two chapters in Britain and four in Canada approximate the agreed balance.

### Research gate

Use authoritative sources appropriate to each claim: Library and Archives Canada, Parks Canada, provincial archives/museums, British Library, UK National Archives, and relevant Indigenous nations' own resources. These are research destinations, not citations already verified by this plan. Store exact page URL, title, access date, claim supported and relevant excerpt/paraphrase. Do not use an AI-written summary as historical evidence.

- Each historical episode has at least two suitable sources supporting its main setting and events. Each checkable claim maps to a source; two unrelated links do not satisfy the gate.
- Label invented documents and dialogue `Fictional reconstruction` where first shown. Never fabricate primary-source quotations or archival identifiers.
- End with a 40–80-word `History behind the mystery`: documented facts / invented elements / genuine uncertainty.
- Include Indigenous, French-speaking and other communities where historically relevant, with agency and accurate names. Do not portray settlement as arrival in empty land or empire as an uncomplicated success story.
- Difficult history must be accurate and age-appropriate, not turned into a points challenge or trivial comic obstacle.
- Archive text may contain selected historical spelling labelled as such. All expected modern answers use Canadian English; historical spelling never silently causes a failure.

### Episode density and pacing

Intro: 60–100 words; interludes: at most 30 words; reveal: 40–80 words. Offer narration and a replayable two-sentence recap. Target at least 75% of active lesson time for language work. Provide illustrations only where they explain a clue or setting; no animation during focused answers.

Each episode must have a problem, a language-dependent clue, a decision, a consequence and one new unresolved question. Do not merely paste generic quizzes between story paragraphs. A wrong answer should produce a coherent opportunity to repair, not permanent plot failure.

## 5. Curriculum and prerequisites

Use stable skill IDs. Content can map to several skills, but score only the declared target(s). Assign one main rule and at most one supporting target per lesson. Mix already-taught skills during review and final editing.

| Track | Initial skill IDs and order |
|---|---|
| Spelling | SP.patterns, SP.inflections, SP.wordparts, SP.confusables, SP.dictation |
| Phonics | PH.blend-segment, PH.vowels, PH.digraphs-clusters, PH.syllables, PH.multisyllable |
| Pronunciation | PR.discrimination, PR.target-sounds, PR.endings, PR.word-stress, PR.sentence-reading |
| Grammar | GR.subject-object-pronouns, GR.antecedents, GR.agreement, GR.tense, GR.articles-plurals, GR.possessives, GR.reflexives |
| Sentences | SE.complete, SE.fragments, SE.clauses, SE.runons, SE.combining |
| Punctuation | PU.capitals-endmarks, PU.list-commas, PU.direct-address, PU.introductory, PU.clause-commas, PU.apostrophes, PU.dialogue |
| Editing | ED.locate, ED.repair, ED.explain, ED.transfer |

Prerequisite examples: complete sentences/clauses before comma splices; subject/object roles before I/me; ownership before possessive apostrophes. Remediate basic phonics only when assessment indicates need. Relative/interrogative/demonstrative/indefinite pronouns are required R3 packs under the four explicit IDs in section 0.6; introduce them after the core pronoun packs. Do not claim these are taught by a generic pronoun score.

### Content correctness requirements

- A run-on concerns incorrectly joined independent clauses, not sentence length.
- Teach each comma function separately; never use `put a comma where you pause` as the rule.
- Accept sensible alternatives for repairs: periods, suitable coordinating conjunctions and other constructions within the taught scope.
- Distinguish possessive determiners (my/their) from standalone possessive pronouns (mine/theirs).
- Accept grammatically valid singular they. Do not infer pronouns solely from a person's name or appearance.
- Describe ship/sheep using vowel quality as well as duration; do not teach that length alone is the distinction.
- Treat syllables, letters and phonemes as different units. For example `stretch` has six phonemes in common pronunciations; do not map it to three sounds merely because tiles say str/e/tch.
- Phonics patterns have exceptions. Do not present `i before e` as a universal rule.
- Canadian/other legitimate variants: list accepted spelling/pronunciation variants per item. Announce a specifically assessed Canadian convention; otherwise flag a variant separately rather than falsely treating it as a language error.
- Preserve the 600 legacy entries and IDs; audit hints and grade claims before labelling them verified curriculum content. Grade labels alone are not evidence of Alberta curriculum alignment.

## 6. A complete lesson and correction loop

Provisional 20-minute target: 2 minutes recap/review; 3 teaching/examples; 7 focused practice; 4 repair and new-example transfer; 3 sentence/passage task; 1 self-check/reveal. These are planning allocations, not timers that force advancement.

Typical lesson: two worked examples, six independent questions, one short transfer task. Repair items are adaptive additions. At the target duration, offer pause/resume at a safe boundary. Never mark unfinished work wrong solely because time elapsed.

State sequence: `intro -> teach -> attempt -> feedback -> repair (if needed) -> transfer -> reflection -> complete`. Pausing preserves any state. On resume, show recap but do not replay already answered items for credit.

- Attempt: store first submitted answer immutably before feedback.
- Feedback: identify one relevant feature and explain it in child-friendly language.
- Repair: guided correction is allowed and recorded as assisted; it never overwrites first-attempt correctness.
- Transfer: use a different unseen sentence/word with the same skill. Prefer a new topic so story recall cannot substitute for rule knowledge.
- After two unsuccessful independent attempts on an item, offer a worked solution and guided repair; avoid an infinite retry loop. Later schedule independent review.
- `I don't know yet` and Skip are available. They become unresolved practice items, not silently omitted successes. Listening/microphone technical failures are not skips or wrong answers.
- Reflection requires a concrete choice such as `I joined two complete thoughts with but`, plus optional brief explanation. Do not require a long typed reflection after every word.

Lesson completion: every required task has an answer, guided resolution or explicitly deferred technical outcome; content-related skipped tasks require the guided teaching step before completing the lesson. Story can advance after supported learning; unresolved independent evidence remains visible in review. Do not equate chapter completed with skill mastered.

### Concrete pilot fixture

Setting: fictional printing proof. Target SE.runons, supported by PU.clause-commas.
Prompt: `I packed my bag, I forgot my goggles.`
Teach: locate `I packed my bag` and `I forgot my goggles`; both can stand alone.
Accepted repairs include `I packed my bag. I forgot my goggles.` and `I packed my bag, but I forgot my goggles.` A semicolon repair is also grammatical; acknowledge it even if not yet taught. Avoid suggesting but is the only possible conjunction.
Distractor: `I packed, my bag I forgot my goggles.`
Explanation: show clause boundaries and explain why a comma alone is insufficient here.
Transfer: a different sentence without goggles/bags, followed later by a short paragraph containing an unmarked comma splice.
The fixture is modern-language practice, not a claimed historical quotation.

## 7. Repeatable assessment

Build this as a standalone function before finalizing personalized assignments. Assessment results are not needed to implement the engine or first content packs.

Two resumable parts, each approximately 10–15 minutes; no speed grade:

- Part A: 8 spelling dictation items (4 pattern/inflection, 4 multisyllable/word parts), 4 decoding items (2 unfamiliar real words and 2 explicitly labelled invented words), 4 listening contrasts, 4 recorded speaking prompts (2 words, sentence, short passage).
- Part B: 12 sentence items (4 pronoun/agreement, 2 tense/possessive, 3 boundaries, 3 punctuation), one short editing passage with four specified rubric targets and one two-sentence writing task.

These provide screening coverage, not reliable mastery estimates for every subskill. Show counts and coverage. Where a track has fewer than five independent scored opportunities, label `Needs more evidence`; avoid false precision. Writing and unscored recordings are `Pending review`, not zero.

Create A/B forms matched by skill, difficulty, word length and support, with distinct prompts and no overlap with teaching pools. Each form has 20 Part A prompts and 14 Part B prompts (12 sentences, one editing passage, one writing task), totalling 34. Preserve each assessment's form/content/rubric version, answers, help use and completion timestamp. Prefer an unused form; if reused, disclose previous exposure. Form C or an anchor-item design is a future content change, not a required release dependency. Never claim forms are statistically standardized.

Assessment has no story hints. If help is requested, keep it available but mark the affected response assisted/excluded from independent accuracy. Show teaching after the scored block rather than leaking answers into later equivalent items. Interrupted assessment resumes exactly; abandonment is incomplete, not a completed low score.

Reports: per-track first-try counts, assisted answers, omissions, pending review and skill suggestions; compare like-for-like track/form difficulty. No single combined English percentage. Reassessment is manually available at any time; suggest 4–6 weeks in the UI without creating a reminder or mandatory schedule.

## 8. Mastery, review and answer evaluation

### Mastery rule (configurable product rule, not a validated diagnostic standard)

- `unassessed`: insufficient independent evidence.
- `learning`: taught or attempted; still needs support.
- `developing`: some independent success, inconsistent transfer or review.
- `secure`: at least 9/10 independent first attempts across at least two sessions on different Edmonton dates; at least three unseen items; includes a relevant transfer item and successful delayed review at least seven days after initial independent success.
- New independent mistakes keep history but place skill back in review. Define this as two failures within the last five eligible attempts; do not erase past achievement.

Eligibility excludes self-ratings, answers already revealed, guided repairs, letter-reveal assistance, repeated submissions and technical failures. Pronunciation may become secure only through reviewed evidence from a validated evaluator or explicit human rating; transcript recognition is insufficient.

Review intervals after successful independent review: 1, 3, 7, 14, 30 days. Failure returns to one day after teaching/repair. Same-day repair never advances the schedule. Overdue items remain available without punishment. Serve up to four due questions at lesson start, then one weak skill and suitable new content. Older overdue and recent errors get priority; avoid returning every missed question in a single session.

### Answer evaluators

- Spelling: trim exterior whitespace, preserve original response, normalize Unicode; evaluate case only when targeted. Use explicit accepted variants.
- Choice/tokens: evaluate IDs and valid sequences, not display text.
- Punctuation: preserve punctuation and capitalization in comparisons. Never reuse a normalizer that strips the target marks.
- Sentence repair: enumerate accepted variants plus carefully scoped structural checks. Do not accept any response simply because it contains a period/conjunction.
- Open writing: use a transparent rubric and optional parent review. Provide model comparisons and self-check; do not fake automated certainty. AI grading, if later approved, remains advisory with uncertain status and override.
- Self-report: store separately from scored attempts.

Every item declares its evaluator and ambiguity handling. If a reasonable unlisted answer is submitted, permit `Review this answer` and avoid a compulsory incorrect label until resolved.

## 9. Data, persistence and migration

Retain current word IDs and read legacy collections. New tracking is versioned and additive; old aggregate counts remain `Legacy practice` and do not satisfy new mastery or today's challenge.

Recommended entities (final names may adapt to repo conventions):

| Entity | Required fields |
|---|---|
| Skill | id, track, prerequisites, ruleVersion, curriculum/source references |
| Item | id, version, skills, prompt, type, acceptedAnswers/rubric, evaluator, difficulty, help ladder, explanation, transferGroup, sources |
| Episode | id, version, chapter, intro, clue tasks, prerequisite skills, reveal, historical facts/fiction labels, source IDs |
| Session | id, learnerId, deviceId, mode, content snapshot/version, seed, ordered item IDs, current state, responses, active duration, status, revision |
| Attempt | immutable UUID, sessionId, learnerId, itemId/version, skill IDs, original answer, ordinal, correctness or pending, help/reveal flags, evidenceType, event time, serverReceivedAt, clientTime, offline flag |
| SkillProgress | learnerId, skillId, derived evidence counts, status, lastIndependentResult, reviewDue, reviewStage, derivation version |
| Assessment | id, learnerId, form/rubric versions, coverage, results, pending evidence, started/completed times |
| StoryProgress | learnerId, episode states, clues acquired, recap, completion evidence IDs |

Use stable IDs independent of wording, sorting, section number or display name. Record a submit once by UUID; repeated taps, reconnects and page refresh must not duplicate attempts or rewards. Keep side effects out of React state-updater functions.

Local-first: durable IndexedDB sessions/outbox, explicit saving/saved/offline/sync-error indicators. Never promise saved data based only on in-memory state. Queue attempt events, derive progress after batch, then reconcile server events. Offline entries retain both client time and server receipt; do not use an unverified offline date to award duplicate daily credit.

### Cross-device identity default

Provide one parent-managed Firebase email/password account with child profile selection beneath it, using the existing Firebase project. Do not share anonymous tokens or hardcode a family UID. Parent setup may require enabling the provider; describe the exact external step when reached. If unavailable, retain usable local mode and label cross-device sync unavailable.

On the originating device, link the anonymous account to the parent credential when possible to preserve UID/data. If that account already exists, require an explicit import preview with counts; do not silently merge by child name. Maintain a mapping of legacy IDs to family learner IDs, preserve original entries and make import idempotent. Never loosen Firestore rules to public access. Verify one family cannot access another.

Use UTC server instants plus `America/Edmonton` formatting for calendar rules; DST tests are required. Do not use last-write-wins over entire progress maps. Same session opened on two devices: second device offers view-only or explicit Take Over; stale revision submissions must not overwrite the newer session. Separate simultaneous sessions merge their immutable attempts by ID, without erasing either learner's work.

## 10. Pronunciation implementation boundary

Phase 1 speech functionality: model playback, recording, playback of own recording, explicit self-comparison and optional human review. Start/stop mic only by visible child action. Stop tracks on navigation, profile switch and cancel. Never capture continuously in background.

Prototype on actual iPad Safari and installed home-screen app before choosing formats/API assumptions. Feature-detect recording and MIME support. Handle permission denied, unavailable mic, silence, interruption, recording too short, offline and service timeout with actionable retry or defer. These are not language errors.

Use suitable Canadian English model audio where available. If only another standard English model is available, label it; do not claim en-US synthesis is Canadian. Isolated phoneme audio must be reviewed; ordinary TTS reading letter names is not phonics instruction.

Automatic speech-to-text can assist transcription only; do not score phoneme accuracy from transcript matching. If later considering a pronunciation-assessment service, verify current iPad support, English locale, cost/free limits and child-data handling in official documentation, then test matched correct/incorrect child recordings against human judgments. Report disagreement and uncertainty; do not choose a hard score threshold without calibration. Paid service activation requires parent agreement.

Recordings stay session-local by default. Explicit save permits selected progress samples with a stated retention setting and delete control. Cloud upload requires separate parent opt-in and scoped access. Assessments may show `recording unavailable after session` if recordings were not saved; never imply playback history exists when it does not.

## 11. File-level implementation map

Preserve existing React 18/Vite/CSS Modules and routing. Separate responsibilities as needed without a wholesale state rewrite.

| Existing file/area | Work |
|---|---|
| src/context/WordProvider.jsx | F01/F04/F07, identity/legacy adapter, evidence-aware game recording; avoid adding all new lesson logic here |
| src/firebase.js + firestore.rules | Auth states, parent linking and collection access rules |
| src/pages/SpellingTest.jsx | Session initializer, challenge routing, immutable first answer, skip and correction handling |
| src/pages/Flashcards.jsx | Self-report event type; synchronize displayed cards on category/learner changes |
| src/pages/WordScramble.jsx and Hangman.jsx | Track help and first guesses separately; optional game outcomes only |
| src/pages/Crossword.jsx | Valid generator, per-entry batch, repair screen |
| src/pages/SpeedRound.jsx | Label timed retrieval, review errors after round, saved optional long practice |
| src/components/MultiplayerWrapper.jsx | Explicit learner/session ownership; suspend and restore turns |
| src/pages/Home.jsx + src/App.jsx | New navigation/routes while retaining game entry points |
| src/utils/achievements.js | Idempotent awards; accurate definitions and evidence eligibility |
| public/sw.js | Versioned asset update behavior; preserve saved sessions; coherent old/new content versions |

Proposed new modules: `src/learning/` for session transitions, evaluators, mastery, scheduling and migrations; `src/data/skills.json`, versioned lessons/assessments/story/source records; small lesson/assessment/progress page components; `src/utils/recording.js`; `src/persistence/` for durable sessions and outbox. Consolidate if existing code offers a clean equivalent; do not create empty abstractions.

## 12. Three releases: execution sequence and gates

Work in the order below. These are release sections inside this plan; do not write a replacement plan per release. R1 engineering and C0 content authoring can proceed independently. Record actual start/completion dates and owner in the ledger.

### R1 — Repair the existing app

Scope: revalidate baseline; fix F01–F09 and F11–F12 at the existing-app level, with F10 shared identity delivered in R2. F07 may first use safe functional updates and an atomic puzzle batch; the general immutable event model follows in R2. Capture legacy behavior before migration and label practice evidence. Add build-on-PR checks. Fix explicit broken badges, not a new reward economy.

Required gates:

- R1-G1: production build passes on the exact candidate commit; build failure is resolved.
- R1-G2: test restart, last skip/perfect score, daily challenge, crossword size/batch and learner-attribution regressions pass.
- R1-G3: existing profile/history reads are preserved; no destructive data migration; flashcard self-report is not called independently verified spelling.
- R1-G4: anonymous-auth failure has a truthful usable fallback and does not hang loading.
- R1-G5: candidate report lists verified versus device-untested behavior, remaining R2 identity/session work and publication authorization state.

R1 is ready when G1–G5 pass. Do not hold the critical build repair until the curriculum is written. Do not claim full cross-device continuity in R1.

### R2 — Complete pilot, not a screen prototype

Engineering sequence: implement schema/evaluators and validators; durable attempts/sessions and outbox; shared identity/import flow; lesson states and correction; assessment runner; review scheduler and evidence reports; story renderer; mic/playback fallback; import reviewed C0.

Content dependency: C0 contains exactly the inventory in section 0.7. Claude may build with fixtures while it is authored; no learner-facing pilot release until the reviewed C0 manifest is present. No assessor may infer mastery of uncovered skills from the small baseline screening.

Required pre-pilot gates:

- R2-G1: C0's 164 objects and two episodes are schema-valid, source/answer reviewed, versioned and integrated; no unresolved critical content discrepancies.
- R2-G2: one actual journey runs assessment -> recommended lesson -> first answer -> explanation -> repair -> unseen transfer -> story reveal -> review queue -> progress report.
- R2-G3: independently test correct, wrong, skipped, helped, pending and technical-failure paths. First answers and evidence eligibility remain intact.
- R2-G4: durable resume, duplicate protection, profile switching, batch events and session-takeover tests pass; shared identity is configured and verified on two linked clients. If setup is pending, explicitly label a local-only preview; it is not the full R2 gate.
- R2-G5: A/B assessment comparison, assisted-answer exclusion and incomplete/resume cases pass. Speaking pending-review states work without paid grading.
- R2-G6: real iPad Safari and home-screen playback/input/recording/resume checks recorded; desktop emulation does not close this gate.

After G1–G6, the parent can authorize the family pilot. Aim for a two-week observation window when available, with at least two resumed visits per child and one delayed review after seven days. The window is an observation target, not forced lesson frequency or a deadline. Record actual exposure. Simulated clocks test scheduling code, not a child's retention.

- R2-G7: pilot exit requires each child to have a baseline or explicitly pending components; any unclear explanation/grading disagreement is logged by item; no unresolved progress loss, false-answer gate or stuck navigation; GPT reviews the content observations and Claude addresses software defects. Remaining small issues need severity and disposition. C1/C2 final authoring uses the outcome; their inventory and sources can be prepared earlier. Do not claim a pilot has occurred before children use it.

### R3 — Full curriculum and story

Scope: integrate C1/C2; map all 42 skill packs to episodes/workshops; complete all six chapters, twelve episodes, listening/pronunciation packs, targeted phonics, grammar, punctuation and editing. Retain R2 assessment and improvements. Update CLAUDE.md/README to actual implemented behavior. Full release does not require a paid speech evaluator or every child to master every skill.

Required gates:

- R3-G1: manifest verifies 42 packs / 1,008 objects plus 68 distinct assessment prompts, all required roles and all 12 episodes. Every primary skill has teaching, guided practice, independent questions, transfer and delayed review.
- R3-G2: all released answers/explanations and history claims have review records; no ambiguous forced grading, invented citation or unlabelled fictional source remains.
- R3-G3: full Britain-to-Alberta story path is coherent; progress and recap survive interruption; assignments follow prerequisites rather than forcing beginner content or cramming every skill into one episode.
- R3-G4: section 13 acceptance matrix passes against candidate commit; recheck content/evaluator integration and actual iPad flows affected since R2.
- R3-G5: legacy migration is tested on copied sample data; current sessions pin content versions; two-device reconciliation works; rollback can restore previous code/content without deleting attempt history.
- R3-G6: parent report accurately separates legacy practice, independent skill evidence, self-report, corrected work and pending speaking/writing ratings.
- R3-G7: readiness report contains candidate commit, frozen content manifest, test/device evidence, known limitations and production decision. Release only to the authorized audience.

### Release blocker and rollback rules

Critical: cannot build/use core flow, data loss or cross-learner contamination, privacy breach, wrong mandatory answer, fabricated historical evidence. High: recurring inability to save/resume or finish a required lesson, scoring/mastery corruption, inaccessible required iPad task. Both block the affected release. A defective item may be quarantined, but if that removes required coverage the release gate remains incomplete; no silent scope reduction.

Lower-severity issues may remain only when their consequence and workaround are documented, no required learning path is blocked and the parent accepts the release limitations. A cosmetic issue does not justify lowering a teaching standard.

Keep prior build/content version available. Roll back the affected candidate on verified critical regression; preserve immutable attempts and active-session versions. Back up before schema migration, use a dry-run report, avoid deleting legacy data and report reversibility. A rollback decision uses the user's established operational authorization; do not silently publish a rollback outside it.

## 13. Required acceptance scenarios

Automate pure grading, scheduling, state transitions, batch recording and migration checks. Use browser/integration checks for UI ownership/resume. Real iPad behavior must be tested on the device; desktop emulation is not equivalent.

| Test | Expected result |
|---|---|
| Duplicate useRef removed | npm run build passes |
| All correct except skipped last test word | No perfect badge; skip preserved |
| Try Again after completion | New session, first word, zero score |
| Yesterday's successes match today's five words | Today's challenge remains incomplete until today's session attempts |
| Five crossword answers submitted | Exactly five distinct durable events; all local results remain |
| Word longer than grid | Valid larger/filter-selected puzzle; no truncation |
| Flashcard Got It or hint-revealed game win | Practice record only; no independent mastery credit |
| Wrong, helped repair, correct transfer | Three distinct evidence states; first answer remains wrong |
| Double tap Submit / reconnect retry | One attempt and at most one award |
| Switch profile during speech/request/save | No audio/answer/result leakage to new learner |
| Close tab midway; reopen tomorrow | Same lesson state, original first attempts and story recap |
| Offline, answer five items, reconnect | All five reconcile once; status is truthful |
| Two linked devices, separate learner sessions | Both records preserved and attributed correctly |
| Two devices open same session | Explicit takeover/read-only; stale write cannot rewind |
| Legacy import repeated twice | No duplicates; original history still accessible |
| Edmonton midnight/DST transition | One correct local day key; no duplicate challenge/reward |
| Submit alternative valid sentence repair | Accepted or pending review; not falsely forced into one wording |
| Remove commas during normalization | Test must fail: punctuation remains evaluable |
| Mic denied/silence/unsupported recording | Retry/defer, no wrong mark or story dead end |
| Reassessment with prior exposed form | Exposure disclosed; comparison not represented as all unseen |
| Correct practiced examples, fail unseen transfer | Skill remains developing |
| Finish chapter with guided corrections | Story advances; mastery remains evidence-based |
| History source missing or fictional quote unlabelled | Content validation fails release gate |

## 14. Content and code validation gates

Add a content validator for unique immutable IDs, known skill references, acyclic prerequisites, reachable story episodes, complete answer keys, correct evaluator selection, valid transfer groups, source mappings and assessment/lesson pool separation. It must detect broken audio references and disabled placeholders in released episodes.

Maintain the section 0.4 status ledger with distinct evidence fields: source review / unit tested / browser tested / real iPad tested / family piloted. Do not mark an entire release validated from a build alone. Record authoring decisions and any curriculum claims with supporting official references before calling content curriculum-aligned.

## 15. Claude execution and handoff instructions

1. Inspect current repository instructions and HEAD; report changes since this baseline.
2. Follow the user's approval workflow before implementation; once authorized, work through R1, R2 and R3 without repeatedly asking about reversible implementation details already covered here.
3. Preserve current functionality/history; keep fixes, engine and content changes reviewable.
4. Use this document as scope control. Any proposed major feature, paid service, destructive migration or publication is a separate decision.
5. Maintain only the operational ledger defined in section 0.4. Report release gates and authored/reviewed/integrated pack counts separately. Percentage, if requested, must use completed acceptance items over applicable items with the denominator stated, not lines of code or number of screens; it cannot override a blocking gate.
6. At each handoff state what changed, exact tests run, remaining limitations, required parent setup and next release task. Provide screenshots for meaningful flows, not only a homepage.
7. Do not represent this plan's provisional defaults, historical settings or mastery thresholds as user-validated facts or research-established standards.

### Source-code evidence used for this plan

- Baseline: https://github.com/lxyzh1019-cyber/Spelling-Pronun/tree/58fe21ebb6ad351094d4686a9713e6ccbdba6744
- Merge comparison: https://github.com/lxyzh1019-cyber/Spelling-Pronun/compare/20e4dd1...58fe21e
- Build failure: https://github.com/lxyzh1019-cyber/Spelling-Pronun/actions/runs/33994402594/job/101383481838
- Repository instructions: https://github.com/lxyzh1019-cyber/Spelling-Pronun/blob/58fe21e/CLAUDE.md

This document is a source-backed engineering plan and proposed learning design, not a completed curriculum validation, live iPad audit or implemented application.


