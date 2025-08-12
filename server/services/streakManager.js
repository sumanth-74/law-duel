// Hot Streaks, Loss Shield, and Match Results Manager
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data/streaks.json');

class StreakManager {
  constructor() {
    this.streakData = this.loadStreakData();
  }

  loadStreakData() {
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    } catch (error) {
      return {}; // Empty object for new users
    }
  }

  saveStreakData() {
    try {
      writeFileSync(DATA_FILE, JSON.stringify(this.streakData, null, 2));
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }
  }

  getPlayerStreakData(userId) {
    if (!this.streakData[userId]) {
      this.streakData[userId] = {
        streakWins: 0,
        bestStreak: 0,
        lossShieldActive: false,
        dailyData: {
          date: new Date().toISOString().split('T')[0],
          winsToday: 0,
          questsCompleted: [],
          xpEarned: 0
        }
      };
    }
    return this.streakData[userId];
  }

  // Calculate match results with hot streaks and loss shield
  calculateMatchResults(winnerId, loserId, matchDurationMs = 0) {
    const winnerData = this.getPlayerStreakData(winnerId);
    const loserData = this.getPlayerStreakData(loserId);

    // Base points
    let winnerDelta = 25;
    let loserDelta = -25;
    let streakBonus = 0;
    let lossShield = false;

    // Update winner streak
    winnerData.streakWins += 1;
    winnerData.bestStreak = Math.max(winnerData.bestStreak, winnerData.streakWins);

    // Calculate streak bonus
    if (winnerData.streakWins >= 4) {
      streakBonus = 8;
    } else if (winnerData.streakWins === 3) {
      streakBonus = 5;
    } else if (winnerData.streakWins === 2) {
      streakBonus = 3;
    }

    winnerDelta += streakBonus;

    // Check if loser has loss shield (first loss after 3+ streak)
    if (loserData.streakWins >= 3 && !loserData.lossShieldActive) {
      loserData.lossShieldActive = true;
      loserDelta = -12; // Loss shield halves the loss
      lossShield = true;
    } else if (loserData.lossShieldActive) {
      // Shield was already used, reset it
      loserData.lossShieldActive = false;
    }

    // Reset loser streak
    loserData.streakWins = 0;

    // Update daily data
    const today = new Date().toISOString().split('T')[0];
    if (winnerData.dailyData.date !== today) {
      winnerData.dailyData = {
        date: today,
        winsToday: 1,
        questsCompleted: [],
        xpEarned: 0
      };
    } else {
      winnerData.dailyData.winsToday += 1;
    }

    // Save data
    this.saveStreakData();

    return {
      winner: {
        pointsDelta: winnerDelta,
        streakWins: winnerData.streakWins,
        streakBonus: streakBonus,
        bestStreak: winnerData.bestStreak
      },
      loser: {
        pointsDelta: loserDelta,
        lossShield: lossShield,
        streakWins: 0,
        lossShieldActive: loserData.lossShieldActive
      }
    };
  }

  // Update quest progress
  updateQuestProgress(userId, questType, value = 1, extra = {}) {
    const playerData = this.getPlayerStreakData(userId);
    const today = new Date().toISOString().split('T')[0];
    
    if (playerData.dailyData.date !== today) {
      // Reset daily data for new day
      playerData.dailyData = {
        date: today,
        winsToday: 0,
        questsCompleted: [],
        xpEarned: 0
      };
    }

    // Quest progress logic would go here
    // For now, just track basic stats
    this.saveStreakData();
  }

  // Get Atticus memory hook based on recent performance
  getMemoryHook(userId) {
    const playerData = this.getPlayerStreakData(userId);
    const hooks = [
      "403 nukes pretty but prejudicial proof.",
      "Hearsay has 23 exceptions—know them cold.",
      "Contract + reliance = promissory estoppel.",
      "Strict liability: no intent, just causation.",
      "Miranda: custody + interrogation = warnings.",
      "Due process: notice + opportunity to be heard.",
      "Commerce clause: substantial effect test."
    ];
    
    // Return random hook for now, could be based on recent subjects played
    return hooks[Math.floor(Math.random() * hooks.length)];
  }

  // Get tier information
  getTierInfo(points = 0) {
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
}

export default new StreakManager();