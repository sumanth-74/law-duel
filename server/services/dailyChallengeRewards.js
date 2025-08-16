// Daily Challenge and Rewards System
import { storage } from '../storage.js';

class DailyChallengeRewards {
  constructor() {
    this.userChallengeProgress = new Map();
    this.dailyChallenges = this.generateDailyChallenges();
    this.weeklyChallenges = this.generateWeeklyChallenges();
    this.streakMilestones = this.generateStreakMilestones();
    
    // Reset challenges daily at midnight
    this.scheduleReset();
  }

  generateDailyChallenges() {
    const today = new Date().toDateString();
    return [
      {
        id: 'daily-streak',
        name: 'Daily Dedication',
        description: 'Play at least one match today',
        xp: 100,
        points: 30,
        icon: '📅',
        type: 'daily',
        requirement: 1,
        resetDaily: true
      },
      {
        id: 'accuracy-master',
        name: 'Accuracy Master',
        description: 'Achieve 80% accuracy in 3 matches',
        xp: 150,
        points: 50,
        icon: '🎯',
        type: 'accuracy',
        requirement: 3,
        resetDaily: true
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Answer 5 questions in under 10 seconds',
        xp: 200,
        points: 75,
        icon: '⚡',
        type: 'speed',
        requirement: 5,
        resetDaily: true
      },
      {
        id: 'perfect-round',
        name: 'Perfect Round',
        description: 'Get 5/5 correct in a single match',
        xp: 250,
        points: 100,
        icon: '💯',
        type: 'perfect',
        requirement: 1,
        resetDaily: true
      },
      {
        id: 'subject-explorer',
        name: 'Subject Explorer',
        description: 'Play matches in 3 different subjects',
        xp: 150,
        points: 50,
        icon: '📚',
        type: 'variety',
        requirement: 3,
        resetDaily: true
      }
    ];
  }

  generateWeeklyChallenges() {
    return [
      {
        id: 'weekly-warrior',
        name: 'Weekly Warrior',
        description: 'Complete 20 matches this week',
        xp: 500,
        points: 200,
        icon: '📋',
        requirement: 20,
        progress: 0
      },
      {
        id: 'consistency-king',
        name: 'Consistency King',
        description: 'Maintain 70% accuracy over 15 matches',
        xp: 400,
        points: 150,
        icon: '🔄',
        requirement: 15,
        progress: 0
      },
      {
        id: 'social-butterfly',
        name: 'Social Butterfly',
        description: 'Play 5 friend challenges',
        xp: 300,
        points: 100,
        icon: '👥',
        requirement: 5,
        progress: 0
      }
    ];
  }

  generateStreakMilestones() {
    return [
      { days: 3, xp: 150, points: 50, badge: '🔥 Spark', title: 'Dedicated Student' },
      { days: 7, xp: 300, points: 100, badge: '⭐ Rising Star', title: 'Week Warrior' },
      { days: 14, xp: 500, points: 200, badge: '💫 Shooting Star', title: 'Fortnight Fighter' },
      { days: 30, xp: 1000, points: 500, badge: '🏆 Champion', title: 'Monthly Master' },
      { days: 50, xp: 1500, points: 750, badge: '👑 Royal Scholar', title: 'Consistent Champion' },
      { days: 100, xp: 3000, points: 1500, badge: '💎 Diamond Mind', title: 'Century Scholar' }
    ];
  }

  getUserDailyChallenges(userId) {
    const userProgress = this.getUserProgress(userId);
    
    return this.dailyChallenges.map(challenge => {
      const progress = userProgress.dailyProgress[challenge.id] || 0;
      const completed = progress >= challenge.requirement;
      const claimed = userProgress.claimedToday.has(challenge.id);
      
      return {
        ...challenge,
        progress,
        completed,
        claimed
      };
    });
  }

  getUserProgress(userId) {
    if (!this.userChallengeProgress.has(userId)) {
      this.userChallengeProgress.set(userId, {
        dailyProgress: {},
        weeklyProgress: {},
        totalXpEarned: 0,
        totalPointsEarned: 0,
        badges: [],
        claimedToday: new Set(),
        lastResetDate: new Date().toDateString()
      });
    }
    
    const progress = this.userChallengeProgress.get(userId);
    
    // Reset daily progress if it's a new day
    const today = new Date().toDateString();
    if (progress.lastResetDate !== today) {
      progress.dailyProgress = {};
      progress.claimedToday = new Set();
      progress.lastResetDate = today;
    }
    
    return progress;
  }

  updateChallengeProgress(userId, type, value = 1) {
    const userProgress = this.getUserProgress(userId);
    
    // Update daily challenges
    this.dailyChallenges.forEach(challenge => {
      if (challenge.type === type && !userProgress.claimedToday.has(challenge.id)) {
        if (!userProgress.dailyProgress[challenge.id]) {
          userProgress.dailyProgress[challenge.id] = 0;
        }
        userProgress.dailyProgress[challenge.id] = Math.min(
          userProgress.dailyProgress[challenge.id] + value,
          challenge.requirement
        );
      }
    });
    
    // Update weekly challenges
    this.weeklyChallenges.forEach(challenge => {
      if (challenge.id.includes(type)) {
        if (!userProgress.weeklyProgress[challenge.id]) {
          userProgress.weeklyProgress[challenge.id] = 0;
        }
        userProgress.weeklyProgress[challenge.id] += value;
      }
    });
  }

  claimChallengeReward(userId, challengeId) {
    const userProgress = this.getUserProgress(userId);
    const challenge = this.dailyChallenges.find(c => c.id === challengeId);
    
    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }
    
    const progress = userProgress.dailyProgress[challengeId] || 0;
    if (progress < challenge.requirement) {
      return { success: false, error: 'Challenge not completed' };
    }
    
    if (userProgress.claimedToday.has(challengeId)) {
      return { success: false, error: 'Already claimed today' };
    }
    
    // Award rewards
    userProgress.claimedToday.add(challengeId);
    userProgress.totalXpEarned += challenge.xp;
    userProgress.totalPointsEarned += challenge.points;
    
    // Check for streak milestones
    const streakBonus = this.calculateStreakBonus(userId);
    
    return {
      success: true,
      rewards: {
        xp: challenge.xp + streakBonus.xp,
        points: challenge.points + streakBonus.points,
        badge: streakBonus.badge
      }
    };
  }

  calculateStreakBonus(userId) {
    // For now, return basic bonus
    // In production, would track actual streak days
    return {
      xp: 0,
      points: 0,
      badge: null
    };
  }

  getUserRewardSummary(userId) {
    const userProgress = this.getUserProgress(userId);
    const dailyChallenges = this.getUserDailyChallenges(userId);
    
    // Calculate next milestone
    const currentStreak = this.getUserStreak(userId);
    const nextMilestone = this.streakMilestones.find(m => m.days > currentStreak);
    
    return {
      totalXpEarned: userProgress.totalXpEarned,
      totalPointsEarned: userProgress.totalPointsEarned,
      badges: userProgress.badges,
      dailyProgress: `${dailyChallenges.filter(c => c.completed).length}/${dailyChallenges.length}`,
      nextMilestone,
      dailyChallenges
    };
  }

  getUserStreak(userId) {
    // For now, return a sample streak
    // In production, would track actual consecutive days
    return 2;
  }

  getWeeklyChallengeProgress(userId) {
    const userProgress = this.getUserProgress(userId);
    
    return this.weeklyChallenges.map(challenge => {
      const progress = userProgress.weeklyProgress[challenge.id] || 0;
      const completed = progress >= challenge.requirement;
      
      return {
        ...challenge,
        progress,
        completed
      };
    });
  }

  scheduleReset() {
    // Calculate time until midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
      this.resetDailyChallenges();
      this.scheduleReset(); // Schedule next reset
    }, msUntilMidnight);
  }

  resetDailyChallenges() {
    // Reset all users' daily progress
    for (const [userId, progress] of this.userChallengeProgress) {
      progress.dailyProgress = {};
      progress.claimedToday = new Set();
      progress.lastResetDate = new Date().toDateString();
    }
    
    console.log('✨ Daily challenges reset at midnight');
  }

  // Track match results for challenge progress
  trackMatchResult(userId, matchData) {
    if (!matchData) return;
    
    // Track daily match played
    this.updateChallengeProgress(userId, 'daily', 1);
    
    // Track accuracy
    if (matchData.accuracy >= 0.8) {
      this.updateChallengeProgress(userId, 'accuracy', 1);
    }
    
    // Track perfect rounds
    if (matchData.correctAnswers === 5) {
      this.updateChallengeProgress(userId, 'perfect', 1);
    }
    
    // Track speed (questions answered under 10 seconds)
    const fastAnswers = matchData.answers?.filter(a => a.timeToAnswer < 10).length || 0;
    if (fastAnswers > 0) {
      this.updateChallengeProgress(userId, 'speed', fastAnswers);
    }
    
    // Track subject variety
    if (matchData.subject) {
      this.updateChallengeProgress(userId, 'variety', 1);
    }
    
    // Track weekly progress
    this.updateChallengeProgress(userId, 'weekly', 1);
  }
}

// Export singleton instance
const dailyChallengeRewards = new DailyChallengeRewards();
export default dailyChallengeRewards;