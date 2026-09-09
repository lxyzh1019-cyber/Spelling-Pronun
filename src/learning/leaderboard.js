// Leaderboard ranking, separated from the Firestore subscription that feeds it.

export function accuracyPercent(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export function medalFor(index) {
  return ['🥇', '🥈', '🥉'][index] || '·';
}

// Folds per-word progress rows into a per-profile total. A row without a profile is ignored rather
// than counted against everyone.
export function aggregateProgressByProfile(rows = []) {
  const totals = {};
  for (const row of rows) {
    const profileId = row?.profileId;
    if (!profileId) continue;
    if (!totals[profileId]) totals[profileId] = { correct: 0, totalAttempts: 0 };
    totals[profileId].correct += row.correct || 0;
    totals[profileId].totalAttempts += row.attempts || 0;
  }
  return totals;
}

// Every known profile appears, including one with no practice yet, so a learner never vanishes
// from the board by not playing.
export function rankLeaderboard(rows = [], profiles = []) {
  const totals = aggregateProgressByProfile(rows);
  return profiles
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      correct: totals[profile.id]?.correct || 0,
      totalAttempts: totals[profile.id]?.totalAttempts || 0,
    }))
    .sort((a, b) => b.correct - a.correct);
}
