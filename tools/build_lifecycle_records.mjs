// Build the lifecycle records for every batch written after C0, so the parent has something to check
// and sign rather than a blank page.
//
//   node tools/build_lifecycle_records.mjs
//
// WHERE THE LINE SITS, and it is the whole point of this file:
//
//   integration   Claude writes it IN FULL. These are mechanical, checkable claims about the system:
//                 the pack is in the catalog, its ids are stable, it renders, its tests pass. Every
//                 line is evidenced by something the parent can re-run in a minute.
//
//   challenge     Claude writes it AS A SELF-CHALLENGE, labelled as one in its own fields. Real
//                 defects were found this way — a duplicated correct answer, two questions that gave
//                 themselves away, four over-claimed outcome citations — and those findings are worth
//                 recording. But the author checking their own work is weaker evidence than an
//                 independent pass, so `independent: false` and `satisfiesIndependentChallenge:
//                 false` say so in the data rather than in a comment.
//
//   educational   Claude writes the FORM and never the verdict. Every field is filled except the
//                 judgement, which is the parent's alone.
//
// WHAT IS DELIBERATELY NOT HERE: a per-item "pass" for all 360 questions. Claude wrote them; Claude
// asserting each one is fine would be a record of nothing. The self-challenge lists the specific
// defects found and names the automated rules every other item was checked against, which is the
// true and much smaller claim.
import fs from 'node:fs';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { c1StoryEpisodes } from '../src/data/storyEpisodes.js';
import { sessionIdForPack } from '../src/data/lessonCatalog.js';

const BATCHES = [
  { batch: 'C1', packs: c1Packs, what: 'vocabulary and comprehension' },
  { batch: 'F1', packs: foundationPacks, what: 'phonics foundation' },
  { batch: 'P1', packs: punctuationPacks, what: 'punctuation' },
  { batch: 'S1', packs: sentencePacks, what: 'sentences and editing' },
  { batch: 'G1', packs: grammarPacks, what: 'grammar: agreement, tense and pronoun reference' },
];
const allPacks = BATCHES.flatMap((entry) => entry.packs);
const TODAY = '2026-09-19';

// The rules every question was actually checked against. Naming the test file matters: it is how the
// parent can see what the claim rests on without taking anyone's word for it.
const AUTOMATED_CHECKS = [
  { rule: 'Four distinct choices, exactly one of them the key, and the key is among them', test: 'test/punctuationPacks.test.js, test/sentencePacks.test.js, test/c1Packs.test.js' },
  { rule: 'No explanation names an answer by its position or letter', test: 'test/punctuationPacks.test.js, test/sentencePacks.test.js' },
  { rule: 'Every cited Alberta outcome resolves, and none is one the mapping calls not_measurable', test: 'test/outcomeClaims.test.js' },
  { rule: 'Twenty-four objects in the roles a lesson expects; a worked example can never be answered', test: 'test/packBuilder.test.js' },
  { rule: 'Nothing is released, and no item carries a status a parent did not grant', test: 'test/approvalPath.test.js' },
  { rule: 'Explanations sit at or below the reading level of the lesson they belong to', test: 'test/contentLint.test.js' },
];

// The defects actually found by checking this content, with what was done about each. These are the
// substance of the self-challenge: specific, dated, and each one a thing that was wrong.
const SELF_CHALLENGE_FINDINGS = [
  {
    id: 'self.p1s1.01',
    scope: 'd1.ph.blend.03',
    found: 'The correct answer appeared twice among the four choices, as "sand" and "sand — s-a-n-d", so the question could not be got wrong.',
    action: 'Rewritten with four distinct choices before the content was committed.',
    foundBy: 'writing the test that requires four distinct choices',
  },
  {
    id: 'self.p1s1.02',
    scope: 'd1.sp.inflections.01, d1.pu.apostrophes.02',
    found: 'Two questions framed their choices inconsistently — one carried a sentence on two options and not the other two, which gave the answer away; the other read as a sentence about shortening rather than as a word.',
    action: 'Both reframed before the content was committed.',
    foundBy: 'reading the generated choices back',
  },
  {
    id: 'self.p1s1.03',
    scope: 'p1.pack.* and s1.pack.*',
    found: 'Fifteen rows cited four Alberta outcomes the mapping marks not_measurable — "Experiment with capitalization and punctuation to achieve a desired effect" and "Revise drafts to improve the fluency, coherence, sequence, and logical support of ideas". Both describe composition, which no four-option question can evidence.',
    action: 'Re-pointed at the outcomes the questions actually measure, and a test now forbids any pack from citing a not_measurable outcome.',
    foundBy: 'a read of the citations against the mapping',
  },
  {
    id: 'self.p1s1.04',
    scope: 'curriculum.alberta.elal.json',
    found: 'draftedIn and skillIds were hand-written cross-references and were stale within a day: 9 outcomes reported as drafted when 16 had content, and 15 pack-to-mapping disagreements about which skill measures what.',
    action: 'Both derived from the packs, as a union so no hand-made judgement is overwritten.',
    foundBy: 'a cross-reference of every pack citation against the mapping',
  },
];

// What a self-challenge cannot do, said once and referenced by every record that needs it.
const SELF_CHALLENGE_LIMIT = 'Claude wrote this content and Claude ran these checks, so this is the author checking their own work. It is weaker evidence than an independent pass by design: the checks can only find what their rules describe, and a rule the author did not think to write is a defect the author will not find. It does not satisfy the independent_challenge stage of the lifecycle, and no item reaches reviewed or integrated on the strength of it.';

function integrationRecord({ batch, packs, what }) {
  return {
    id: `${batch.toLowerCase()}.integration.lesson-packs.v1`,
    type: 'lesson_packs',
    stage: 'content_integration',
    // Drafted by Claude and complete as a claim, because every line of it is mechanical and
    // re-checkable. The parent countersigns rather than reconstructs.
    status: 'drafted_awaiting_parent_countersignature',
    draftedBy: 'claude',
    draftedAt: TODAY,
    countersignedBy: null,
    batch,
    describes: what,
    packIds: packs.map((pack) => pack.id),
    expectedObjectCount: packs.reduce((sum, pack) => sum + pack.items.length, 0),
    routeArtifacts: packs.map((pack) => `/lesson/${sessionIdForPack(pack)}`),
    checks: ['catalog_resolution', 'route_derivation', 'approval_gate', 'id_stability', 'release_exclusion'],
    evidence: [
      'Every pack resolves through the lesson catalog and derives its own route id from its pack id.',
      'Every pack runs through applyCorrections and applyPilotApproval, so a correction can withhold an item and a parent approval can release one. Held by test/approvalPath.test.js.',
      'No item is reachable by a learner while it is draft: lessonBySessionId returns null for all of them. Held by test/lessonVisibility.test.js.',
      'Item ids are derived from the pack id and the row index and are stable across the builder consolidation. Held by the snapshot in test/packBuilder.test.js.',
      'Nothing in this batch is released, and nothing carries a status the parent did not grant.',
    ],
    whatThisDoesNotSay: 'Integration is about wiring, not about whether the questions are any good. It says a child COULD reach this content once approved, and nothing about whether they should.',
  };
}

function challengeRecord({ batch, packs }) {
  return {
    id: `${batch.toLowerCase()}.challenge.self.v1`,
    stage: 'author_self_challenge',
    // Not `independent_challenge`. The name of the stage is the honest part.
    status: 'complete_as_self_challenge',
    independent: false,
    satisfiesIndependentChallenge: false,
    limitation: SELF_CHALLENGE_LIMIT,
    reviewerRole: 'claude_self_challenge',
    checkedBy: 'claude',
    checkedAt: TODAY,
    batch,
    packIds: packs.map((pack) => pack.id),
    itemCount: packs.reduce((sum, pack) => sum + pack.items.length, 0),
    automatedChecks: AUTOMATED_CHECKS,
    findings: SELF_CHALLENGE_FINDINGS.filter((finding) => finding.scope.includes(batch.toLowerCase()) || finding.scope.includes('d1.') || finding.scope.includes('curriculum')),
    perItemResults: null,
    whyNoPerItemResults: 'Deliberately absent. Claude wrote all of these questions, so Claude marking each one "pass" would record nothing a reader could rely on. The findings above are the defects actually found; every other item was checked only against the automated rules listed, and that is the whole of the claim.',
  };
}

function educationalReviewForm({ batch, packs, what }) {
  return {
    id: `${batch.toLowerCase()}.educational.v1`,
    stage: 'educational_source_review',
    // The one field Claude may never fill.
    status: 'awaiting_parent',
    reviewedBy: null,
    reviewedAt: null,
    verdict: null,
    formPreparedBy: 'claude',
    formPreparedAt: TODAY,
    batch,
    describes: what,
    instructions: 'Read each pack below, then set verdict to "approved" or "changes_required" and record who decided and when. An approved verdict is what lets reviewStatus move to reviewed; nothing else does, and Claude may not set it.',
    packs: packs.map((pack) => ({
      packId: pack.id,
      skillId: pack.skillId,
      title: pack.title,
      rule: pack.rule,
      questionCount: pack.items.length,
      curriculumOutcomeIds: pack.curriculumOutcomeIds || [],
      albertaPlacement: pack.albertaPlacement?.albertaGrades || null,
      // The judgement, per pack, left empty.
      verdict: null,
      note: null,
    })),
    dimensions: ['curriculum_alignment', 'rule_accuracy', 'answer_accuracy', 'feedback_quality', 'age_accessibility'],
  };
}

const integration = {
  version: 1,
  protocol: 'MASTER_PLAN.md lifecycle',
  note: 'Integration records for every batch after C0. Drafted by Claude because every claim in them is mechanical and re-checkable; the parent countersigns.',
  records: BATCHES.map(integrationRecord),
};

const challenge = {
  version: 1,
  protocol: 'MASTER_PLAN.md section 0.8',
  note: 'SELF-challenge records. Claude wrote this content and Claude ran these checks. This is not the independent challenge the lifecycle requires, and the records say so in their own fields.',
  limitation: SELF_CHALLENGE_LIMIT,
  reviews: BATCHES.map(challengeRecord),
};

const educational = {
  version: 1,
  protocol: 'MASTER_PLAN.md section 0.8',
  note: 'Educational review FORMS, prepared for the parent with every field filled except the judgement. Claude never sets a verdict, reviewedBy or reviewedAt here.',
  episodesAwaitingReview: c1StoryEpisodes.map((episode) => ({
    episodeId: episode.id,
    chapter: episode.chapter,
    sequence: episode.sequence,
    title: episode.title,
    verdict: null,
    note: null,
  })),
  reviews: BATCHES.map(educationalReviewForm),
};

fs.writeFileSync('src/data/integration.batches.json', JSON.stringify(integration, null, 2) + '\n');
fs.writeFileSync('src/data/reviews.batches.json', JSON.stringify(challenge, null, 2) + '\n');
fs.writeFileSync('src/data/reviews.educational.batches.json', JSON.stringify(educational, null, 2) + '\n');

console.log(`integration records: ${integration.records.length}`);
console.log(`self-challenge records: ${challenge.reviews.length}, findings: ${SELF_CHALLENGE_FINDINGS.length}`);
console.log(`review forms awaiting the parent: ${educational.reviews.length} packs + ${educational.episodesAwaitingReview.length} episodes`);
console.log(`packs covered: ${allPacks.length}, questions: ${allPacks.reduce((sum, pack) => sum + pack.items.length, 0)}`);
