// Daily Quest System for Law Duel
export const DAILY_QUEST_POOL = [
  {
    id: 'win_evidence_duels',
    title: 'Evidence Expert',
    description: 'Win 2 Evidence duels',
    target: 2,
    type: 'subject_wins',
    subject: 'Evidence',
    xpReward: 15
  },
  {
    id: 'win_contracts_duels', 
    title: 'Contract Crusher',
    description: 'Win 2 Contracts duels',
    target: 2,
    type: 'subject_wins',
    subject: 'Contracts',
    xpReward: 15
  },
  {
    id: 'answer_questions',
    title: 'Question Master',
    description: 'Answer 20 questions',
    target: 20,
    type: 'questions_answered',
    xpReward: 10
  },
  {
    id: 'win_fast_duel',
    title: 'Speed Demon',
    description: 'Win a duel in under 50 seconds',
    target: 1,
    type: 'fast_win',
    maxTime: 50,
    xpReward: 20
  },
  {
    id: 'win_streak',
    title: 'Hot Streak',
    description: 'Win 3 duels in a row',
    target: 3,
    type: 'win_streak',
    xpReward: 25
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Score 10/10 in a duel',
    target: 10,
    type: 'perfect_score',
    xpReward: 30
  },
  {
    id: 'constitutional_law',
    title: 'Constitutional Scholar',
    description: 'Win 2 Constitutional Law duels',
    target: 2,
    type: 'subject_wins',
    subject: 'Constitutional Law',
    xpReward: 15
  },
  {
    id: 'torts_master',
    title: 'Tort Titan',
    description: 'Win 2 Torts duels',
    target: 2,
    type: 'subject_wins', 
    subject: 'Torts',
    xpReward: 15
  }
];

// Function to generate 3 random daily quests
export function generateDailyQuests() {
  const shuffled = [...DAILY_QUEST_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(quest => ({
    ...quest,
    progress: 0,
    completed: false
  }));
}

// Get tier info based on points
export function getTierInfo(points = 0) {
  const tiers = [
    { name: 'Novice', min: 0, max: 99, color: '#64748b' },
    { name: 'Clerk', min: 100, max: 249, color: '#3b82f6' },
    { name: 'Barrister', min: 250, max: 499, color: '#8b5cf6' },
    { name: 'Counselor', min: 500, max: 999, color: '#10b981' },
    { name: 'Advocate', min: 1000, max: 1999, color: '#f59e0b' },
    { name: 'Magus', min: 2000, max: 3999, color: '#ef4444' },
    { name: 'Archon', min: 4000, max: Infinity, color: '#d4af37' }
  ];
  
  const currentTier = tiers.find(tier => points >= tier.min && points <= tier.max);
  const nextTier = tiers.find(tier => tier.min > points);
  
  return {
    current: currentTier,
    next: nextTier,
    pointsToNext: nextTier ? nextTier.min - points : 0
  };
}