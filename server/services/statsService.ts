import { db } from '../db';
import { users, playerSubjectStats, questionAttempts } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
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
      subjectRating: 1200,
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
  ): Promise<void> {
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

    // Update subject stats
    await this.updateSubjectStats(userId, subject, isCorrect);
    
    // Update overall user stats
    await this.updateOverallStats(userId, subject, isCorrect);
  }

  // Update subject-specific stats
  private async updateSubjectStats(userId: string, subject: MBESubject, isCorrect: boolean): Promise<void> {
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

    // Simple ELO-like rating update
    const expected = 0.5; // Can be adjusted based on difficulty
    const K = 12;
    const actual = isCorrect ? 1 : 0;
    const newRating = Math.round(currentStats.subjectRating + K * (actual - expected));

    await db
      .update(playerSubjectStats)
      .set({
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        isProvisional,
        subjectRating: newRating,
        recentAttempts,
        updatedAt: new Date(),
      })
      .where(and(
        eq(playerSubjectStats.userId, userId),
        eq(playerSubjectStats.subject, subject)
      ));
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

    return {
      user,
      subjectStats: subjectStats.sort((a, b) => a.subject.localeCompare(b.subject)),
      overallAccuracy: Math.round(overallAccuracy * 10) / 10, // Round to 1 decimal
      rankTier
    };
  }

  private calculateRankTier(elo: number): string {
    if (elo >= 2000) return 'Archon';
    if (elo >= 1800) return 'Supreme';
    if (elo >= 1600) return 'Champion';
    if (elo >= 1400) return 'Expert';
    if (elo >= 1200) return 'Skilled';
    if (elo >= 1000) return 'Apprentice';
    return 'Novice';
  }

  // Get leaderboard data
  async getLeaderboard(limit: number = 50): Promise<Array<{
    user: Omit<User, 'password' | 'email'>;
    rank: number;
    overallAccuracy: number;
    rankTier: string;
  }>> {
    const users = await db
      .select()
      .from(users)
      .orderBy(sql`${users.overallElo} DESC`)
      .limit(limit);

    return users.map((user, index) => {
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
        user: users,
        stats: playerSubjectStats
      })
      .from(playerSubjectStats)
      .innerJoin(users, eq(users.id, playerSubjectStats.userId))
      .where(eq(playerSubjectStats.subject, subject))
      .orderBy(sql`${playerSubjectStats.subjectRating} DESC`)
      .limit(limit);

    return results.map((result, index) => {
      const { password, email, ...publicUser } = result.user;
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