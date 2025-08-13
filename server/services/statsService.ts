import { db } from '../db';
import { users, playerSubjectStats, questionAttempts } from '../../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { progressionService } from './progressionService';
import type { User, PlayerSubjectStats, QuestionAttempt, MBESubject } from '@shared/schema';

export class StatsService {
  // Initialize stats for a new user
  async initializeUserStats(userId: string): Promise<void> {
    const subjects = [
      "Civil Procedure",
      "Constitutional Law", 
      "Contracts",
      "Criminal Law/Procedure",
      "Evidence",
      "Real Property",
      "Torts"
    ];

    // Create initial subject stats for all subjects
    const initialStats = subjects.map(subject => ({
      userId,
      subject,
      questionsAnswered: 0,
      correctAnswers: 0,
      currentStreak: 0,
      isProvisional: true,
      masteryPoints: 0,
      masteryLevel: 0,
      recentAttempts: []
    }));

    await db.insert(playerSubjectStats).values(initialStats).onConflictDoNothing();
  }

  // Record a question attempt and update all relevant stats
  async recordQuestionAttempt(
    userId: string,
    questionId: string,
    subject: MBESubject,
    selectedAnswer: number,
    correctAnswer: number,
    isCorrect: boolean,
    timeSpent: number,
    difficulty: string,
    matchId?: string
  ): Promise<{
    xpGained: number;
    masteryGained: number;
    levelUp: boolean;
    masteryUp: boolean;
    newLevel?: number;
    newTitle?: string;
    newMasteryLevel?: number;
    newMasteryNumeral?: string;
  }> {
    // Record the individual attempt
    await db.insert(questionAttempts).values({
      userId,
      questionId,
      matchId,
      subject,
      selectedAnswer,
      isCorrect,
      timeSpent,
      difficulty,
    });

    // Update subject stats and mastery
    const masteryResult = await this.updateSubjectStats(userId, subject, isCorrect, difficulty);
    
    // Update overall user stats
    await this.updateOverallStats(userId, subject, isCorrect);
    
    // Calculate and apply XP gain
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const streakBonus = user?.currentOverallStreak || 0;
    const xpGained = progressionService.calculateQuestionXp(isCorrect, difficulty, streakBonus);
    
    let levelResult = { levelUp: false, newLevel: 0, newTitle: "" };
    if (xpGained > 0) {
      levelResult = await progressionService.updateUserXp(userId, xpGained);
    }
    
    return {
      xpGained,
      masteryGained: masteryResult.masteryGained,
      levelUp: levelResult.levelUp,
      masteryUp: masteryResult.masteryUp,
      newLevel: levelResult.newLevel,
      newTitle: levelResult.newTitle,
      newMasteryLevel: masteryResult.newLevel,
      newMasteryNumeral: masteryResult.newNumeral
    };
  }

  // Update subject-specific stats
  private async updateSubjectStats(userId: string, subject: MBESubject, isCorrect: boolean, difficulty: string = 'medium'): Promise<{
    masteryGained: number;
    masteryUp: boolean;
    newLevel: number;
    newNumeral: string;
  }> {
    // Get current subject stats
    const [currentStats] = await db
      .select()
      .from(playerSubjectStats)
      .where(and(
        eq(playerSubjectStats.userId, userId),
        eq(playerSubjectStats.subject, subject)
      ));

    if (!currentStats) {
      // Initialize if not exists
      await this.initializeUserStats(userId);
      return this.updateSubjectStats(userId, subject, isCorrect);
    }

    // Update recent attempts (keep last 20)
    const recentAttempts = [...(currentStats.recentAttempts || [])];
    recentAttempts.push({
      timestamp: new Date().toISOString(),
      correct: isCorrect
    });
    if (recentAttempts.length > 20) {
      recentAttempts.shift();
    }

    // Update stats
    const newQuestionsAnswered = currentStats.questionsAnswered + 1;
    const newCorrectAnswers = currentStats.correctAnswers + (isCorrect ? 1 : 0);
    const newStreak = isCorrect ? currentStats.currentStreak + 1 : 0;
    const isProvisional = newQuestionsAnswered < 20;

    // Calculate mastery point gain/loss
    const masteryGained = progressionService.calculateMasteryPoints(isCorrect, difficulty);
    const newMasteryPoints = Math.max(0, currentStats.masteryPoints + masteryGained);
    const oldMasteryLevel = progressionService.getMasteryLevel(currentStats.masteryPoints);
    const newMasteryLevel = progressionService.getMasteryLevel(newMasteryPoints);
    const masteryUp = newMasteryLevel > oldMasteryLevel;
    const newNumeral = progressionService.getMasteryProgress(newMasteryPoints).numeral;

    await db
      .update(playerSubjectStats)
      .set({
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        isProvisional,
        masteryPoints: newMasteryPoints,
        masteryLevel: newMasteryLevel,
        recentAttempts,
        updatedAt: new Date(),
      })
      .where(and(
        eq(playerSubjectStats.userId, userId),
        eq(playerSubjectStats.subject, subject)
      ));
      
    return {
      masteryGained,
      masteryUp,
      newLevel: newMasteryLevel,
      newNumeral
    };
  }

  // Update overall user stats
  private async updateOverallStats(userId: string, subject: MBESubject, isCorrect: boolean): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;

    // Update recent attempts (keep last 20)
    const recentAttempts = [...(user.recentAttempts || [])];
    recentAttempts.push({
      timestamp: new Date().toISOString(),
      correct: isCorrect,
      subject
    });
    if (recentAttempts.length > 20) {
      recentAttempts.shift();
    }

    // Update overall stats
    const newTotalAnswered = user.totalQuestionsAnswered + 1;
    const newTotalCorrect = user.totalCorrectAnswers + (isCorrect ? 1 : 0);
    const newOverallStreak = isCorrect ? user.currentOverallStreak + 1 : 0;

    // Simple overall ELO update
    const expected = 0.5;
    const K = 16;
    const actual = isCorrect ? 1 : 0;
    const newElo = Math.round(user.overallElo + K * (actual - expected));

    await db
      .update(users)
      .set({
        totalQuestionsAnswered: newTotalAnswered,
        totalCorrectAnswers: newTotalCorrect,
        currentOverallStreak: newOverallStreak,
        overallElo: newElo,
        recentAttempts,
      })
      .where(eq(users.id, userId));
  }

  // Get comprehensive stats for a user
  async getUserStats(userId: string): Promise<{
    user: User;
    subjectStats: PlayerSubjectStats[];
    overallAccuracy: number;
    rankTier: string;
    levelProgress: any;
    rankProgress: any;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    const subjectStats = await db
      .select()
      .from(playerSubjectStats)
      .where(eq(playerSubjectStats.userId, userId));

    // Ensure all subjects exist
    if (subjectStats.length < 7) {
      await this.initializeUserStats(userId);
      // Refetch after initialization
      const updatedSubjectStats = await db
        .select()
        .from(playerSubjectStats)
        .where(eq(playerSubjectStats.userId, userId));
      return this.calculateStatsResponse(user, updatedSubjectStats);
    }

    return this.calculateStatsResponse(user, subjectStats);
  }

  // Get public stats (for viewing other players)
  async getPublicStats(userId: string): Promise<{
    user: Omit<User, 'password' | 'email'>;
    subjectStats: PlayerSubjectStats[];
    overallAccuracy: number;
    rankTier: string;
  }> {
    const stats = await this.getUserStats(userId);
    
    // Remove private fields
    const { password, email, ...publicUser } = stats.user;
    
    return {
      user: publicUser,
      subjectStats: stats.subjectStats,
      overallAccuracy: stats.overallAccuracy,
      rankTier: stats.rankTier
    };
  }

  private calculateStatsResponse(user: User, subjectStats: PlayerSubjectStats[]) {
    const overallAccuracy = user.totalQuestionsAnswered > 0 
      ? (user.totalCorrectAnswers / user.totalQuestionsAnswered) * 100 
      : 0;

    const rankTier = this.calculateRankTier(user.overallElo);
    const levelProgress = progressionService.getLevelProgress(user.totalXp);
    const rankProgress = progressionService.getRankProgress(user.overallElo);

    return {
      user,
      subjectStats: subjectStats.sort((a, b) => a.subject.localeCompare(b.subject)),
      overallAccuracy: Math.round(overallAccuracy * 10) / 10, // Round to 1 decimal
      rankTier,
      levelProgress,
      rankProgress
    };
  }

  private calculateRankTier(elo: number): string {
    return progressionService.getRankTier(elo).name;
  }

  // Get leaderboard data
  async getLeaderboard(limit: number = 50): Promise<Array<{
    user: Omit<User, 'password' | 'email'>;
    rank: number;
    overallAccuracy: number;
    rankTier: string;
  }>> {
    const usersList = await db
      .select()
      .from(users)
      .orderBy(desc(users.overallElo))
      .limit(limit * 2); // Get extra users to account for filtering

    // Filter out users with zero points (default ELO is 1200) or who haven't played
    const activeUsers = usersList.filter(user => 
      user.points > 0 || user.totalQuestionsAnswered > 0
    );

    return activeUsers.slice(0, limit).map((user, index) => {
      const { password, email, ...publicUser } = user;
      const overallAccuracy = user.totalQuestionsAnswered > 0 
        ? (user.totalCorrectAnswers / user.totalQuestionsAnswered) * 100 
        : 0;

      return {
        user: publicUser,
        rank: index + 1,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        rankTier: this.calculateRankTier(user.overallElo)
      };
    });
  }

  // Get subject leaderboard
  async getSubjectLeaderboard(subject: MBESubject, limit: number = 50): Promise<Array<{
    user: Omit<User, 'password' | 'email'>;
    subjectStats: PlayerSubjectStats;
    rank: number;
    accuracy: number;
  }>> {
    const results = await db
      .select({
        userData: users,
        stats: playerSubjectStats
      })
      .from(playerSubjectStats)
      .innerJoin(users, eq(users.id, playerSubjectStats.userId))
      .where(eq(playerSubjectStats.subject, subject))
      .orderBy(desc(playerSubjectStats.masteryPoints))
      .limit(limit * 2); // Get extra to account for filtering

    // Filter out users with zero activity in this subject
    const activeResults = results.filter(result => 
      result.stats.questionsAnswered > 0 || result.userData.points > 0
    );

    return activeResults.slice(0, limit).map((result, index) => {
      const { password, email, ...publicUser } = result.userData;
      const accuracy = result.stats.questionsAnswered > 0
        ? (result.stats.correctAnswers / result.stats.questionsAnswered) * 100
        : 0;

      return {
        user: publicUser,
        subjectStats: result.stats,
        rank: index + 1,
        accuracy: Math.round(accuracy * 10) / 10
      };
    });
  }
}

export const statsService = new StatsService();