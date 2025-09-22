import { 
  users, matches, questions, playerSubjectStats, soloChallenges, atticusDuels, gameProgress, leaderboardEntries, questionCache,
  type User, type InsertUser, type Match, type InsertMatch, type Question, type InsertQuestion,
  type SoloChallenge, type InsertSoloChallenge, type AtticusDuel, type InsertAtticusDuel,
  type GameProgress, type InsertGameProgress, type LeaderboardEntry, type InsertLeaderboardEntry,
  type QuestionCacheEntry, type InsertQuestionCacheEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, notInArray } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export interface IStorage {
  // User authentication methods
  authenticateUser(username: string, password: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserStats(id: string, won: boolean, xpGained: number, pointsChange: number): Promise<User | undefined>;
  getTopPlayers(limit: number): Promise<User[]>;
  recordDailyActivity(userId: string): Promise<{ streakUpdated: boolean; newStreak: number }>;  // Track daily activity from any game mode

  // Match methods
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchByRoomCode(roomCode: string): Promise<Match | undefined>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined>;
  getUserMatches(userId: string, limit: number): Promise<Match[]>;
  
  // Async match methods
  getAsyncMatches(userId?: string): Promise<Match[]>;
  getActiveAsyncMatch(userId: string, opponentId: string): Promise<Match | undefined>;

  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsBySubject(subject: string, limit: number): Promise<Question[]>;
  getRandomQuestion(subject: string, excludeIds?: string[]): Promise<Question | undefined>;
  incrementQuestionUsage(id: string): Promise<void>;

  // Solo Challenge methods
  createSoloChallenge(challenge: InsertSoloChallenge): Promise<SoloChallenge>;
  getSoloChallenge(id: string): Promise<SoloChallenge | undefined>;
  updateSoloChallenge(id: string, updates: Partial<SoloChallenge>): Promise<SoloChallenge | undefined>;
  getUserSoloChallenges(userId: string): Promise<SoloChallenge[]>;
  deleteSoloChallenge(id: string): Promise<void>;

  // Atticus Duel methods
  createAtticusDuel(duel: InsertAtticusDuel): Promise<AtticusDuel>;
  getAtticusDuel(id: string): Promise<AtticusDuel | undefined>;
  updateAtticusDuel(id: string, updates: Partial<AtticusDuel>): Promise<AtticusDuel | undefined>;
  getUserAtticusDuels(userId: string): Promise<AtticusDuel[]>;
  getUserActiveAtticusDuel(userId: string): Promise<AtticusDuel | undefined>;
  getUserLastAtticusDuel(userId: string): Promise<AtticusDuel | undefined>;

  // Leaderboard methods
  upsertLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
  getLeaderboardEntry(userId: string): Promise<LeaderboardEntry | undefined>;
  updateLeaderboardEntry(userId: string, updates: Partial<LeaderboardEntry>): Promise<LeaderboardEntry | undefined>;

  // Question Cache methods
  cacheQuestion(cache: InsertQuestionCacheEntry): Promise<QuestionCacheEntry>;
  getCachedQuestions(subject: string, difficulty: number): Promise<QuestionCacheEntry[]>;
  clearExpiredCache(): Promise<void>;

  // Game Progress methods
  saveGameProgress(progress: InsertGameProgress): Promise<GameProgress>;
  getGameProgress(userId: string, subject: string): Promise<GameProgress | undefined>;
  updateGameProgress(id: string, updates: Partial<GameProgress>): Promise<GameProgress | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User authentication methods
  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      console.log(`Auth attempt for username: ${username}`);
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (!user) {
        console.log(`User not found: ${username}`);
        return null;
      }
      console.log(`User found: ${user.username}, checking password...`);
      
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`Password comparison result: ${isValid}`);
      if (!isValid) return null;
      
      // Update last login
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
      
      return user;
    } catch (error) {
      console.error("Authentication error:", error);
      return null;
    }
  }

  async createUser(insertUser: InsertUser & { password: string }): Promise<User> {
    const { password, ...userData } = insertUser;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        dailyData: userData.dailyData ? userData.dailyData as any : null,
      } as any)
      .returning();
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    // Remove fields that shouldn't be updated directly
    const { password, id: userId, createdAt, ...safeUpdates } = updates as any;
    
    const [user] = await db
      .update(users)
      .set({
        ...safeUpdates,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async updateUserStats(id: string, won: boolean, xpGained: number, pointsChange: number, streakData?: any): Promise<User | undefined> {
    const updateData: any = {
      xp: sql`${users.xp} + ${xpGained}`,
      points: sql`GREATEST(0, ${users.points} + ${pointsChange})`,
      totalWins: won ? sql`${users.totalWins} + 1` : users.totalWins,
      totalLosses: won ? users.totalLosses : sql`${users.totalLosses} + 1`,
      level: sql`GREATEST(1, FLOOR(1 + (${users.points} + ${pointsChange}) / 100))`,
    };

    // Update streak data if provided
    if (streakData) {
      updateData.streakWins = streakData.streakWins || 0;
      updateData.bestStreak = streakData.bestStreak || 0;
      updateData.lossShieldActive = streakData.lossShieldActive || false;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async getTopPlayers(limit: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.points))
      .limit(limit);
  }

  // Track daily activity from any game mode (solo, vs friends, daily casefile)
  async recordDailyActivity(userId: string): Promise<{ streakUpdated: boolean; newStreak: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return { streakUpdated: false, newStreak: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = user.lastDailyDate;
    
    // If already played today, don't update streak
    if (lastActivityDate === today) {
      return { streakUpdated: false, newStreak: user.dailyStreak };
    }

    let newStreak = 1;
    
    // Calculate new streak
    if (lastActivityDate) {
      const lastDate = new Date(lastActivityDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak = user.dailyStreak + 1;
      } else {
        // Streak broken - reset to 1
        newStreak = 1;
      }
    }

    // Update user's daily streak and last activity date
    const bestStreak = Math.max(user.bestDailyStreak, newStreak);
    await db
      .update(users)
      .set({
        dailyStreak: newStreak,
        bestDailyStreak: bestStreak,
        lastDailyDate: today,
      })
      .where(eq(users.id, userId));

    console.log(`📅 Daily activity recorded for ${user.username}: streak ${user.dailyStreak} → ${newStreak}`);
    
    return { streakUpdated: true, newStreak };
  }

  // Match methods
  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const [match] = await db
      .insert(matches)
      .values(insertMatch)
      .returning();
    
    return match;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchByRoomCode(roomCode: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.roomCode, roomCode));
    return match;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const updateData = { ...updates };
    if (updates.status === 'finished' && !updateData.finishedAt) {
      updateData.finishedAt = new Date();
    }
    
    console.log(`🔄 updateMatch: id=${id}, updates=`, updateData);
    
    const [match] = await db
      .update(matches)
      .set(updateData)
      .where(eq(matches.id, id))
      .returning();
    
    console.log(`✅ updateMatch result: id=${match?.id}, status=${match?.status}, winnerId=${match?.winnerId}`);
    
    return match;
  }

  async getUserMatches(userId: string, limit: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(sql`${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId}`)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
  }

  // Async match methods
  async getAsyncMatches(userId?: string): Promise<Match[]> {
    if (userId) {
      const asyncMatches = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.mode, 'async'),
            sql`${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId}`
          )
        )
        .orderBy(desc(matches.createdAt));
      
      return asyncMatches;
    } else {
      const asyncMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.mode, 'async'))
        .orderBy(desc(matches.createdAt));
      
      return asyncMatches;
    }
  }

  async getActiveAsyncMatch(userId: string, opponentId: string): Promise<Match | undefined> {
    // First, let's check what matches exist between these players
    const allMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.mode, 'async'),
          sql`(${matches.player1Id} = ${userId} AND ${matches.player2Id} = ${opponentId}) OR (${matches.player1Id} = ${opponentId} AND ${matches.player2Id} = ${userId})`
        )
      );
    
    console.log(`🔍 All matches between ${userId} and ${opponentId}:`, allMatches.map(m => ({ id: m.id, status: m.status, mode: m.mode, statusType: typeof m.status })));
    
    // Check if any of these matches have status 'active' but are actually finished
    const activeMatches = allMatches.filter(m => m.status === 'active');
    console.log(`🔍 Matches with status='active':`, activeMatches.map(m => ({ id: m.id, status: m.status, finishedAt: m.finishedAt })));
    
    // Let's also check what the database actually returns for the specific match ID that's causing issues
    if (allMatches.length > 0) {
      const problemMatchId = '57efadc5-67c3-4a7f-be03-1484b7445634';
      const problemMatch = allMatches.find(m => m.id === problemMatchId);
      if (problemMatch) {
        console.log(`🔍 Problem match details:`, {
          id: problemMatch.id,
          status: problemMatch.status,
          statusType: typeof problemMatch.status,
          finishedAt: problemMatch.finishedAt,
          winnerId: problemMatch.winnerId
        });
      }
    }
    
    // Now get only active matches
    console.log(`🔍 Querying for active matches with status='active'`);
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.mode, 'async'),
          eq(matches.status, 'active'),
          sql`(${matches.player1Id} = ${userId} AND ${matches.player2Id} = ${opponentId}) OR (${matches.player1Id} = ${opponentId} AND ${matches.player2Id} = ${userId})`
        )
      );
    
    console.log(`🔍 Active match query result: found=${!!match}, status=${match?.status}, id=${match?.id}`);
    
    console.log(`🔍 getActiveAsyncMatch: userId=${userId}, opponentId=${opponentId}, found=${!!match}, status=${match?.status}, id=${match?.id}`);
    
    // Double-check: if we found a match but it's not active, return undefined
    if (match && match.status !== 'active') {
      console.log(`⚠️ Found match but status is not 'active' (${match.status}), returning undefined`);
      return undefined;
    }
    
    return match;
  }

  // Get subject stats for mastery tracking
  async getSubjectStats(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(playerSubjectStats)
      .where(eq(playerSubjectStats.userId, userId));
  }

  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(insertQuestion)
      .returning();
    
    return question;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async getQuestionsBySubject(subject: string, limit: number): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.subject, subject))
      .limit(limit);
  }

  async getRandomQuestion(subject: string, excludeIds: string[] = []): Promise<Question | undefined> {
    let query = db
      .select()
      .from(questions)
      .where(eq(questions.subject, subject))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    
    if (excludeIds.length > 0) {
      query = db
        .select()
        .from(questions)
        .where(and(
          eq(questions.subject, subject),
          notInArray(questions.id, excludeIds)
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }
    
    const [question] = await query;
    return question;
  }

  async incrementQuestionUsage(id: string): Promise<void> {
    await db
      .update(questions)
      .set({ usageCount: sql`${questions.usageCount} + 1` })
      .where(eq(questions.id, id));
  }

  // Solo Challenge methods
  async createSoloChallenge(challenge: InsertSoloChallenge): Promise<SoloChallenge> {
    const [created] = await db.insert(soloChallenges).values(challenge).returning();
    return created;
  }

  async getSoloChallenge(id: string): Promise<SoloChallenge | undefined> {
    const [challenge] = await db.select().from(soloChallenges).where(eq(soloChallenges.id, id));
    return challenge;
  }

  async updateSoloChallenge(id: string, updates: Partial<SoloChallenge>): Promise<SoloChallenge | undefined> {
    const [updated] = await db
      .update(soloChallenges)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(soloChallenges.id, id))
      .returning();
    return updated;
  }

  async getUserSoloChallenges(userId: string): Promise<SoloChallenge[]> {
    return await db
      .select()
      .from(soloChallenges)
      .where(eq(soloChallenges.userId, userId))
      .orderBy(desc(soloChallenges.startedAt));
  }

  async deleteSoloChallenge(id: string): Promise<void> {
    await db.delete(soloChallenges).where(eq(soloChallenges.id, id));
  }

  // Atticus Duel methods
  async createAtticusDuel(duel: InsertAtticusDuel): Promise<AtticusDuel> {
    const [created] = await db.insert(atticusDuels).values(duel).returning();
    return created;
  }

  async getAtticusDuel(id: string): Promise<AtticusDuel | undefined> {
    const [duel] = await db.select().from(atticusDuels).where(eq(atticusDuels.id, id));
    return duel;
  }

  async updateAtticusDuel(id: string, updates: Partial<AtticusDuel>): Promise<AtticusDuel | undefined> {
    const [updated] = await db
      .update(atticusDuels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(atticusDuels.id, id))
      .returning();
    return updated;
  }

  async getUserAtticusDuels(userId: string): Promise<AtticusDuel[]> {
    return await db
      .select()
      .from(atticusDuels)
      .where(eq(atticusDuels.userId, userId))
      .orderBy(desc(atticusDuels.startedAt));
  }

  async getUserActiveAtticusDuel(userId: string): Promise<AtticusDuel | undefined> {
    const [activeDuel] = await db
      .select()
      .from(atticusDuels)
      .where(and(eq(atticusDuels.userId, userId), eq(atticusDuels.status, 'active')));
    return activeDuel;
  }

  async getUserLastAtticusDuel(userId: string): Promise<AtticusDuel | undefined> {
    const [lastDuel] = await db
      .select()
      .from(atticusDuels)
      .where(eq(atticusDuels.userId, userId))
      .orderBy(desc(atticusDuels.startedAt))
      .limit(1);
    return lastDuel;
  }

  // Leaderboard methods
  async upsertLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    // First try to find existing entry
    const existing = await this.getLeaderboardEntry(entry.userId);
    
    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(leaderboardEntries)
        .set({
          username: entry.username,
          displayName: entry.displayName,
          points: entry.points,
          level: entry.level,
          avatarData: entry.avatarData,
          lastActivity: entry.lastActivity || new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaderboardEntries.userId, entry.userId))
        .returning();
      return updated;
    } else {
      // Insert new entry
      const [inserted] = await db
        .insert(leaderboardEntries)
        .values(entry)
        .returning();
      return inserted;
    }
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    return await db
      .select()
      .from(leaderboardEntries)
      .orderBy(desc(leaderboardEntries.points))
      .limit(limit);
  }

  async getLeaderboardEntry(userId: string): Promise<LeaderboardEntry | undefined> {
    const [entry] = await db.select().from(leaderboardEntries).where(eq(leaderboardEntries.userId, userId));
    return entry;
  }

  async updateLeaderboardEntry(userId: string, updates: Partial<LeaderboardEntry>): Promise<LeaderboardEntry | undefined> {
    const [updated] = await db
      .update(leaderboardEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leaderboardEntries.userId, userId))
      .returning();
    return updated;
  }

  // Question Cache methods
  async cacheQuestion(cache: InsertQuestionCacheEntry): Promise<QuestionCacheEntry> {
    const [created] = await db.insert(questionCache).values(cache).returning();
    return created;
  }

  async getCachedQuestions(subject: string, difficulty: number): Promise<QuestionCacheEntry[]> {
    return await db
      .select()
      .from(questionCache)
      .where(
        and(
          eq(questionCache.subject, subject),
          eq(questionCache.difficulty, difficulty),
          sql`${questionCache.expiresAt} > NOW()`
        )
      );
  }

  async clearExpiredCache(): Promise<void> {
    await db.delete(questionCache).where(sql`${questionCache.expiresAt} <= NOW()`);
  }

  // Game Progress methods
  async saveGameProgress(progress: InsertGameProgress): Promise<GameProgress> {
    const [created] = await db.insert(gameProgress).values(progress).returning();
    return created;
  }

  async getGameProgress(userId: string, subject: string): Promise<GameProgress | undefined> {
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(and(eq(gameProgress.userId, userId), eq(gameProgress.subject, subject)));
    return progress;
  }

  async updateGameProgress(id: string, updates: Partial<GameProgress>): Promise<GameProgress | undefined> {
    const [updated] = await db
      .update(gameProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gameProgress.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();