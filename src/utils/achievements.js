// Achievement definitions
export const ACHIEVEMENTS = {
  first_correct: {
    id: 'first_correct',
    name: '✨ First Step',
    description: 'Spell your first word correctly',
    icon: '✨',
    condition: (stats) => stats.totalCorrect >= 1,
  },
  ten_correct: {
    id: 'ten_correct',
    name: '🎯 Sharpshooter',
    description: 'Get 10 words correct',
    icon: '🎯',
    condition: (stats) => stats.totalCorrect >= 10,
  },
  fifty_correct: {
    id: 'fifty_correct',
    name: '🏆 Master Speller',
    description: 'Get 50 words correct',
    icon: '🏆',
    condition: (stats) => stats.totalCorrect >= 50,
  },
  hundred_correct: {
    id: 'hundred_correct',
    name: '👑 Spelling Champion',
    description: 'Get 100 words correct',
    icon: '👑',
    condition: (stats) => stats.totalCorrect >= 100,
  },
  five_streak: {
    id: 'five_streak',
    name: '🔥 On Fire',
    description: 'Get a 5-word streak',
    icon: '🔥',
    condition: (stats) => stats.bestStreak >= 5,
  },
  ten_streak: {
    id: 'ten_streak',
    name: '⚡ Unstoppable',
    description: 'Get a 10-word streak',
    icon: '⚡',
    condition: (stats) => stats.bestStreak >= 10,
  },
  perfect_round: {
    id: 'perfect_round',
    name: '💯 Flawless',
    description: 'Complete a game with 100% accuracy',
    icon: '💯',
    condition: () => false, // Set manually in game logic
  },
  speed_demon: {
    id: 'speed_demon',
    name: '⚡ Speed Demon',
    description: 'Score 8+ in Speed Round',
    icon: '⚡',
    condition: () => false, // Set manually in game logic
  },
  comeback_king: {
    id: 'comeback_king',
    name: '🦁 Comeback King',
    description: 'Recover from 5+ wrong to end perfect',
    icon: '🦁',
    condition: () => false, // Set manually in game logic
  },
  hint_master: {
    id: 'hint_master',
    name: '💡 Hint Master',
    description: 'Use all daily hints',
    icon: '💡',
    condition: () => false, // Set manually in game logic
  },
};

export function checkAchievements(stats, existingAchievements = []) {
  const existingIds = new Set(existingAchievements.map((a) => a.id));
  const newAchievements = [];

  Object.values(ACHIEVEMENTS).forEach((achievement) => {
    if (!existingIds.has(achievement.id) && achievement.condition(stats)) {
      newAchievements.push({
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        unlockedAt: new Date(),
      });
    }
  });

  return newAchievements;
}

export function getAchievementById(id) {
  return Object.values(ACHIEVEMENTS).find((a) => a.id === id);
}
