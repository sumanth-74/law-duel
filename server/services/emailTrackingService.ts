import { db } from '../db';
import { users } from '@shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export class EmailTrackingService {
  // Get all users with emails for analytics
  async getAllUsersWithEmails(limit: number = 1000) {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        lawSchool: users.lawSchool,
        level: users.level,
        points: users.points,
        totalWins: users.totalWins,
        totalLosses: users.totalLosses,
        totalQuestionsAnswered: users.totalQuestionsAnswered,
        totalCorrectAnswers: users.totalCorrectAnswers,
        dailyStreak: users.dailyStreak,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`)
      .orderBy(desc(users.createdAt))
      .limit(limit);
    
    return result;
  }

  // Get email analytics summary
  async getEmailAnalytics() {
    const [totalUsersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    const [usersWithEmailResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
    
    const [activeUsersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL AND ${users.email} != ''`,
          gte(users.lastLoginAt, sql`NOW() - INTERVAL '7 days'`)
        )
      );
    
    const [topPerformersResult] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        avgPoints: sql<number>`AVG(${users.points})`,
        avgLevel: sql<number>`AVG(${users.level})`,
      })
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL AND ${users.email} != ''`,
          gte(users.points, 500)
        )
      );
    
    // Get law school distribution
    const lawSchoolDistribution = await db
      .select({
        lawSchool: users.lawSchool,
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != '' AND ${users.lawSchool} IS NOT NULL`)
      .groupBy(users.lawSchool)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);
    
    // Get engagement metrics
    const engagementMetrics = await db
      .select({
        avgQuestionsAnswered: sql<number>`AVG(${users.totalQuestionsAnswered})`,
        avgCorrectRate: sql<number>`AVG(CASE WHEN ${users.totalQuestionsAnswered} > 0 THEN CAST(${users.totalCorrectAnswers} AS FLOAT) / ${users.totalQuestionsAnswered} * 100 ELSE 0 END)`,
        avgDailyStreak: sql<number>`AVG(${users.dailyStreak})`,
        maxDailyStreak: sql<number>`MAX(${users.bestDailyStreak})`,
      })
      .from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
    
    return {
      totalUsers: totalUsersResult?.count || 0,
      usersWithEmail: usersWithEmailResult?.count || 0,
      emailCaptureRate: totalUsersResult?.count 
        ? ((usersWithEmailResult?.count || 0) / totalUsersResult.count * 100).toFixed(1) + '%'
        : '0%',
      activeUsersWithEmail: activeUsersResult?.count || 0,
      topPerformers: {
        count: topPerformersResult?.count || 0,
        avgPoints: Math.round(topPerformersResult?.avgPoints || 0),
        avgLevel: Math.round(topPerformersResult?.avgLevel || 0),
      },
      lawSchoolDistribution,
      engagement: {
        avgQuestionsAnswered: Math.round(engagementMetrics[0]?.avgQuestionsAnswered || 0),
        avgCorrectRate: (engagementMetrics[0]?.avgCorrectRate || 0).toFixed(1) + '%',
        avgDailyStreak: Math.round(engagementMetrics[0]?.avgDailyStreak || 0),
        maxDailyStreak: engagementMetrics[0]?.maxDailyStreak || 0,
      }
    };
  }

  // Get recent signups with emails
  async getRecentSignups(days: number = 7) {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        lawSchool: users.lawSchool,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          sql`${users.email} IS NOT NULL AND ${users.email} != ''`,
          gte(users.createdAt, sql`NOW() - INTERVAL '${days} days'`)
        )
      )
      .orderBy(desc(users.createdAt));
    
    return result;
  }

  // Export email list for campaigns
  async exportEmailList(filters?: {
    minLevel?: number;
    minPoints?: number;
    lawSchool?: string;
    activeInLastDays?: number;
  }) {
    let query = db
      .select({
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        lawSchool: users.lawSchool,
        level: users.level,
        points: users.points,
        dailyStreak: users.dailyStreak,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
    
    // Apply filters
    const conditions = [sql`${users.email} IS NOT NULL AND ${users.email} != ''`];
    
    if (filters?.minLevel) {
      conditions.push(gte(users.level, filters.minLevel));
    }
    
    if (filters?.minPoints) {
      conditions.push(gte(users.points, filters.minPoints));
    }
    
    if (filters?.lawSchool) {
      conditions.push(eq(users.lawSchool, filters.lawSchool));
    }
    
    if (filters?.activeInLastDays) {
      conditions.push(gte(users.lastLoginAt, sql`NOW() - INTERVAL '${filters.activeInLastDays} days'`));
    }
    
    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }
    
    const result = await query.orderBy(desc(users.points));
    
    return result;
  }

  // Track email opened (for future email campaigns)
  async trackEmailOpened(userId: string) {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(), // Update last activity
      })
      .where(eq(users.id, userId));
  }

  // Update email preferences (for future implementation)
  async updateEmailPreferences(userId: string, preferences: {
    marketing?: boolean;
    weeklyProgress?: boolean;
    achievements?: boolean;
    friendChallenges?: boolean;
  }) {
    // This can be expanded when we add email preference columns to the users table
    console.log(`Email preferences updated for user ${userId}:`, preferences);
    // For now, just log the preferences
    return preferences;
  }
}

export const emailTrackingService = new EmailTrackingService();