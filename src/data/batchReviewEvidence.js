// Everything `applyReviewEvidence` reads for the batches after C0, gathered from the records in one
// place so that every pack file gets the same evidence by going through `finaliseDraftPacks`.
//
//   agentReviews             reviews.independent.batches.json — the two separate-agent passes
//   parentVerdicts           reviews.educational.batches.json — the parent's verdict, per pack
//   parentCountersignatures  integration.batches.json         — the parent's countersignature, per pack
import agentReviewData from './reviews.independent.batches.json' with { type: 'json' };
import educationalData from './reviews.educational.batches.json' with { type: 'json' };
import integrationData from './integration.batches.json' with { type: 'json' };

export const batchReviewEvidence = {
  agentReviews: agentReviewData.reviews,
  parentVerdicts: educationalData.reviews
    .flatMap((form) => form.packs)
    .filter((entry) => entry.verdict)
    .map((entry) => ({ ...entry, packVersion: entry.decidedAtPackVersion })),
  parentCountersignatures: integrationData.records.flatMap((record) => record.countersignatures || []),
};
