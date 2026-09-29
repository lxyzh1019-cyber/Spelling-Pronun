// Which batch packs a learner can open, and on which evidence track.
//
//   node tools/verify_pilot_reach.mjs
//
// Prints one line per pack written after C0, then checks the real pilot approvals against the real
// content. Exits non-zero if anything released, if an approved pack is not reachable, or if the
// approvals do not validate.
import { lessonBySessionId, sessionIdForPack } from '../src/data/lessonCatalog.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';
import { foundation2Packs } from '../src/data/packs.foundation2.draft.js';
import { punctuationPacks } from '../src/data/packs.punctuation.draft.js';
import { sentencePacks } from '../src/data/packs.sentences.draft.js';
import { grammarPacks } from '../src/data/packs.grammar.draft.js';
import { c0AssessmentForms } from '../src/data/assessment.c0.draft.js';
import { allStoryEpisodes } from '../src/data/storyEpisodes.js';
import { validatePilotApprovals, attemptIsInTrack, EVIDENCE_TRACKS } from '../src/learning/pilotApproval.js';
import approvalData from '../src/data/pilotApproval.batches.json' with { type: 'json' };
import c0ApprovalData from '../src/data/pilotApproval.c0.json' with { type: 'json' };

const batchPacks = [...c1Packs, ...foundationPacks, ...punctuationPacks, ...sentencePacks, ...grammarPacks, ...foundation2Packs];
const approved = new Set(approvalData.approvals.map((approval) => approval.scopeId));
let problems = 0;

for (const pack of batchPacks) {
  const lesson = lessonBySessionId(sessionIdForPack(pack));
  const statuses = [...new Set(pack.items.map((item) => item.releaseStatus))].join(',');
  // The track an attempt on this content would be recorded on.
  const sample = { contentStatus: pack.items.find((item) => item.role === 'independent').releaseStatus };
  const track = attemptIsInTrack(sample, EVIDENCE_TRACKS.RELEASED) ? 'RELEASED' : attemptIsInTrack(sample, EVIDENCE_TRACKS.PILOT) ? 'pilot' : 'none';
  console.log(`${pack.id.padEnd(34)} v${pack.version}  ${lesson ? 'REACHABLE' : 'withheld '}  track=${track.padEnd(5)} release=${statuses}  review=${[...new Set(pack.items.map((item) => item.reviewStatus))].join(',')}`);
  if (pack.items.some((item) => item.releaseStatus === 'released')) { problems += 1; console.log('  !! released'); }
  if (approved.has(pack.id) !== Boolean(lesson)) { problems += 1; console.log('  !! reachability does not match the approval list'); }
  if (lesson && track !== 'pilot') { problems += 1; console.log('  !! reachable but not on the pilot track'); }
}

const { errors } = validatePilotApprovals({
  approvals: [...c0ApprovalData.approvals, ...approvalData.approvals],
  packs: [...c0PilotPacks, ...batchPacks],
  assessmentForms: c0AssessmentForms,
  episodes: allStoryEpisodes,
});
console.log(`validatePilotApprovals on real data: ${errors.length ? `${errors.length} errors` : 'valid'}`);
for (const error of errors) console.log(`  ${error}`);
console.log(`batch approvals: ${approvalData.approvals.length}; reachable batch packs: ${batchPacks.filter((pack) => lessonBySessionId(sessionIdForPack(pack))).length}`);
if (errors.length || problems) process.exit(1);
