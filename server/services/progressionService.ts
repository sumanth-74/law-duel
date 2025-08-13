import { db } from '../db';
import { users, playerSubjectStats } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { RANK_TIERS, LEVEL_TITLES, MASTERY_THRESHOLDS, MASTERY_NUMERALS } from '../../shared/schema';
import type { User, PlayerSubjectStats, MBESubject } from '../../shared/schema';

export class ProgressionService {
  // Calculate XP needed for next level using: XP_to_next = ceil(220 * level^1.35)
  calculateXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.ceil(220 * Math.pow(level, 1.35));
  }

  // Calculate level from total XP
  calculateLevelFromXp(totalXp: number): number {
    let level = 1;
    let cumulativeXp = 0;
    
    while (cumulativeXp <= totalXp) {
      const xpForNextLevel = this.calculateXpForLevel(level + 1);
      if (cumulativeXp + xpForNextLevel > totalXp) break;
      cumulativeXp += xpForNextLevel;
      level++;
    }
    
    return Math.min(level, 30); // Cap at level 30
  }

  // Get level title from level number
  getLevelTitle(level: number): string {
    return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || "Legend of the Bar";
  }

  // Calculate XP progress for current level
  getLevelProgress(totalXp: number): { currentLevel: number; currentLevelXp: number; xpToNext: number; title: string } {
    const currentLevel = this.calculateLevelFromXp(totalXp);
    
    // Calculate XP accumulated for this level
    let cumulativeXp = 0;
    for (let i = 2; i <= currentLevel; i++) {
      cumulativeXp += this.calculateXpForLevel(i);
    }
    
    const currentLevelXp = totalXp - cumulativeXp;
    const xpToNext = this.calculateXpForLevel(currentLevel + 1);
    const title = this.getLevelTitle(currentLevel);
    
    return { currentLevel, currentLevelXp, xpToNext, title };
  }

  // Get rank tier from ELO
  getRankTier(elo: number): { name: string; minElo: number; maxElo: number } {
    return RANK_TIERS.find(tier => elo >= tier.minElo && elo <= tier.maxElo) || RANK_TIERS[0];
  }

  // Calculate ELO progress to next tier
  getRankProgress(elo: number): { currentTier: string; progress: number; maxProgress: number; nextTier: string | null } {
    const currentTierData = this.getRankTier(elo);
    const currentTierIndex = RANK_TIERS.findIndex(tier => tier.name === currentTierData.name);
    const nextTier = currentTierIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentTierIndex + 1] : null;
    
    const progress = elo - currentTierData.minElo;
    const maxProgress = currentTierData.maxElo - currentTierData.minElo + 1;
    
    return {
      currentTier: currentTierData.name,
      progress,
      maxProgress,
      nextTier: nextTier?.name || null
    };
  }

  // Calculate mastery level from points
  getMasteryLevel(points: number): number {
    for (let i = MASTERY_THRESHOLDS.length - 1; i >= 0; i--) {
      if (points >= MASTERY_THRESHOLDS[i]) {
        return i;
      }
    }
    return 0;
  }

  // Get mastery progress
  getMasteryProgress(points: number): { level: number; numeral: string; progress: number; maxProgress: number; nextThreshold: number | null } {
    const level = this.getMasteryLevel(points);
    const numeral = MASTERY_NUMERALS[level] || "";
    
    const currentThreshold = MASTERY_THRESHOLDS[level] || 0;
    const nextThreshold = level < MASTERY_THRESHOLDS.length - 1 ? MASTERY_THRESHOLDS[level + 1] : null;
    
    const progress = points - currentThreshold;
    const maxProgress = nextThreshold ? nextThreshold - currentThreshold : 0;
    
    return { level, numeral, progress, maxProgress, nextThreshold };
  }

  // Calculate XP gains from a question attempt
  calculateQuestionXp(isCorrect: boolean, difficulty: string, streakBonus: number = 0): number {
    if (!isCorrect) return 0;
    
    const baseXp = {
      easy: 20,
      medium: 25,
      hard: 30
    }[difficulty] || 25;
    
    const streakXp = Math.min(streakBonus * 10, 50); // Cap at +50
    
    return baseXp + streakXp;
  }

  // Calculate XP gains from a duel result
  calculateDuelXp(won: boolean, isFirstOfDay: boolean, streakBonus: number = 0): number {
    const baseXp = won ? 100 : 40;
    const dailyBonus = isFirstOfDay ? 100 : 0;
    const streakXp = Math.min(streakBonus * 10, 50);
    
    return baseXp + dailyBonus + streakXp;
  }

  // Calculate mastery points from a question
  calculateMasteryPoints(isCorrect: boolean, difficulty: string): number {
    const difficultyWeight = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.2
    }[difficulty] || 1.0;
    
    const basePoints = isCorrect ? 8 : -3;
    return Math.round(basePoints * difficultyWeight);
  }

  // Update user's XP and level
  async updateUserXp(userId: string, xpGain: number): Promise<{ levelUp: boolean; newLevel: number; newTitle: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    const newTotalXp = user.totalXp + xpGain;
    const oldLevel = this.calculateLevelFromXp(user.totalXp);
    const newLevel = this.calculateLevelFromXp(newTotalXp);
    const newTitle = this.getLevelTitle(newLevel);
    
    const levelUp = newLevel > oldLevel;

    await db
      .update(users)
      .set({
        totalXp: newTotalXp,
        level: newLevel,
        levelTitle: newTitle,
        dailyXpEarned: user.dailyXpEarned + xpGain,
      })
      .where(eq(users.id, userId));

    return { levelUp, newLevel, newTitle };
  }

  // Update user's ELO and placement status
  async updateUserElo(userId: string, eloDelta: number): Promise<{ rankUp: boolean; newTier: string; placementComplete: boolean }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    const newElo = Math.max(0, user.overallElo + eloDelta);
    const newPlacementMatches = Math.min(user.placementMatches + 1, 5);
    const placementComplete = !user.isRanked && newPlacementMatches >= 5;
    
    const oldTier = this.getRankTier(user.overallElo).name;
    const newTier = this.getRankTier(newElo).name;
    const rankUp = newTier !== oldTier && user.isRanked;

    await db
      .update(users)
      .set({
        overallElo: newElo,
        placementMatches: newPlacementMatches,
        isRanked: placementComplete || user.isRanked,
      })
      .where(eq(users.id, userId));

    return { rankUp, newTier, placementComplete };
  }

  // Update subject mastery
  async updateSubjectMastery(userId: string, subject: MBESubject, masteryDelta: number): Promise<{ masteryUp: boolean; newLevel: number; newNumeral: string }> {
    const [subjectStats] = await db
      .select()
      .from(playerSubjectStats)
      .where(and(
        eq(playerSubjectStats.userId, userId),
        eq(playerSubjectStats.subject, subject)
      ));

    if (!subjectStats) throw new Error('Subject stats not found');

    const newPoints = Math.max(0, subjectStats.masteryPoints + masteryDelta);
    const oldLevel = this.getMasteryLevel(subjectStats.masteryPoints);
    const newLevel = this.getMasteryLevel(newPoints);
    const newNumeral = MASTERY_NUMERALS[newLevel] || "";
    
    const masteryUp = newLevel > oldLevel;

    await db
      .update(playerSubjectStats)
      .set({
        masteryPoints: newPoints,
        updatedAt: new Date(),
      })
      .where(and(
        eq(playerSubjectStats.userId, userId),
        eq(playerSubjectStats.subject, subject)
      ));

    return { masteryUp, newLevel, newNumeral };
  }

  // Apply weekly decay to subject mastery
  async applyWeeklyDecay(userId: string): Promise<void> {
    const subjectStats = await db
      .select()
      .from(playerSubjectStats)
      .where(eq(playerSubjectStats.userId, userId));

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const stats of subjectStats) {
      if (stats.lastDecayDate && stats.lastDecayDate < oneWeekAgo) {
        const decayAmount = 10;
        const newPoints = Math.max(0, stats.masteryPoints - decayAmount);
        
        // Floor at lower tier boundary
        const currentLevel = this.getMasteryLevel(stats.masteryPoints);
        const newLevel = this.getMasteryLevel(newPoints);
        const flooredPoints = newLevel < currentLevel ? MASTERY_THRESHOLDS[newLevel] : newPoints;

        await db
          .update(playerSubjectStats)
          .set({
            masteryPoints: flooredPoints,
            lastDecayDate: now,
            updatedAt: now,
          })
          .where(and(
            eq(playerSubjectStats.userId, userId),
            eq(playerSubjectStats.subject, stats.subject)
          ));
      }
    }
  }

  // Check if it's first duel of the day
  async checkFirstDuelOfDay(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;

    const now = new Date();
    const lastReset = user.lastDailyReset || new Date(0);
    const isSameDay = now.toDateString() === lastReset.toDateString();

    if (!isSameDay) {
      // Reset daily progress
      await db
        .update(users)
        .set({
          firstDuelOfDay: true,
          dailyXpEarned: 0,
          lastDailyReset: now,
        })
        .where(eq(users.id, userId));
      
      return true;
    }

    return user.firstDuelOfDay;
  }

  // Mark first duel of day as complete
  async markFirstDuelComplete(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ firstDuelOfDay: false })
      .where(eq(users.id, userId));
  }
}

export const progressionService = new ProgressionService();