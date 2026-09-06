const TRACK_NAMES = {
  SP: 'spelling', PH: 'decoding', PR: 'pronunciation', GR: 'grammar',
  SE: 'sentences', PU: 'punctuation', ED: 'editing',
};

export function trackForSkill(skillId = '') {
  return TRACK_NAMES[skillId.split('.')[0]] || 'other';
}

export function buildAssessmentReport({ form, version = 1, results = [], completedAt = null }) {
  const tracks = {};
  for (const result of results) {
    const track = trackForSkill(result.skillId);
    const bucket = tracks[track] ||= { opportunities: 0, independentScored: 0, firstTryCorrect: 0, assisted: 0, omissions: 0, pendingReview: 0 };
    bucket.opportunities += 1;
    if (result.omitted) bucket.omissions += 1;
    else if (result.status === 'pending') bucket.pendingReview += 1;
    else if (result.helped) bucket.assisted += 1;
    else {
      bucket.independentScored += 1;
      if (result.correct) bucket.firstTryCorrect += 1;
    }
  }
  for (const bucket of Object.values(tracks)) bucket.coverage = bucket.independentScored < 5 ? 'needs_more_evidence' : 'screening_evidence';
  const ranked = Object.entries(tracks)
    .filter(([, bucket]) => bucket.independentScored > 0 || bucket.assisted > 0 || bucket.omissions > 0)
    .sort((a, b) => {
      const priority = (bucket) => (bucket.omissions * 3) + (bucket.assisted * 2) + (bucket.independentScored ? 1 - (bucket.firstTryCorrect / bucket.independentScored) : 1);
      return priority(b[1]) - priority(a[1]);
    });
  return {
    form,
    version,
    status: completedAt ? 'complete' : 'incomplete',
    completedAt,
    tracks,
    suggestedTrack: ranked[0]?.[0] || null,
    totals: {
      answered: results.filter((result) => !result.omitted).length,
      assisted: results.filter((result) => result.helped).length,
      omissions: results.filter((result) => result.omitted).length,
      pendingReview: results.filter((result) => result.status === 'pending').length,
    },
  };
}

export function compareAssessmentReports(previous, current) {
  if (!previous?.completedAt || !current?.completedAt) return { comparable: false, reason: 'incomplete_assessment' };
  if (previous.form !== current.form || previous.version !== current.version) return { comparable: false, reason: 'not_like_for_like' };
  const tracks = {};
  for (const name of new Set([...Object.keys(previous.tracks), ...Object.keys(current.tracks)])) {
    const before = previous.tracks[name] || { firstTryCorrect: 0, independentScored: 0 };
    const after = current.tracks[name] || { firstTryCorrect: 0, independentScored: 0 };
    tracks[name] = {
      before: `${before.firstTryCorrect}/${before.independentScored}`,
      after: `${after.firstTryCorrect}/${after.independentScored}`,
      comparable: before.independentScored === after.independentScored,
    };
  }
  return { comparable: true, disclosure: 'This form was previously exposed; results are not all unseen.', tracks };
}
