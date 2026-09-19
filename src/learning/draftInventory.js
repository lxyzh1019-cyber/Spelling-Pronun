// What is written and waiting for the parent to read.
//
// The repository has a lifecycle that stops unreviewed content reaching a child, and it works. What
// it did not have was a way for the parent to SEE what is waiting, which quietly turns "waiting for
// review" into "waiting forever" — the work exists, nobody can find it, and the only way to read it
// is to open source files.
//
// This assembles that list from the data itself rather than from a hand-written inventory, so a pack
// or a correction cannot be added without appearing here.

// A correction the parent has not answered. `changes_required` is the open state; a proposer may
// never resolve their own record, so these can only move when the parent says so.
export function openCorrectionsFor(corrections = []) {
  return corrections
    .filter((correction) => correction.reviewStatus === 'changes_required')
    .map((correction) => ({
      id: correction.id,
      reason: correction.reason,
      change: correction.change,
      itemCount: (correction.itemIds || []).length + (correction.episodeIds || []).length,
      draftedIn: correction.draftedIn,
      requiresOnInstall: correction.requiresOnInstall,
      severity: correction.severity || 'defect',
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Content authored but not yet challenged, reviewed, integrated or approved. Anything not at
// `released` or `pilot_approved` is invisible to a learner, which is the point — and also the reason
// it needs surfacing here.
export function draftPacksFor(packGroups = []) {
  return packGroups
    .flatMap((group) => group.packs.map((pack) => ({
      id: pack.id,
      batch: pack.batch || group.batch,
      title: pack.title,
      skillId: pack.skillId,
      rule: pack.rule,
      itemCount: pack.items.length,
      questionCount: pack.items.filter((item) => item.evaluator === 'choice').length,
      status: pack.status,
      // One of these is always the honest answer to "what is this for". A C1 pack names the Alberta
      // outcomes it measures; a foundation pack names the grades Alberta actually puts it at, and
      // deliberately claims no outcome at all.
      curriculumOutcomeIds: pack.curriculumOutcomeIds || [],
      albertaPlacement: pack.albertaPlacement || null,
    })))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// The one-line truth about the state of the whole queue. Counts, never a percentage, and it says
// plainly that none of this is in front of a child.
export function summariseDraftInventory({ corrections = [], packs = [] } = {}) {
  const correctionItems = corrections.reduce((sum, correction) => sum + correction.itemCount, 0);
  const packItems = packs.reduce((sum, pack) => sum + pack.itemCount, 0);
  return {
    correctionCount: corrections.length,
    correctionItems,
    packCount: packs.length,
    packItems,
    // Nothing here is live, and that is the first thing a reader needs to know.
    inFrontOfAChild: 0,
    summary: corrections.length || packs.length
      ? `${corrections.length} proposed changes covering ${correctionItems} questions, and ${packs.length} new lessons holding ${packItems} questions. None of it is in front of a child: new content cannot reach a learner until you have read it and approved it.`
      : 'Nothing is waiting for you.',
  };
}
