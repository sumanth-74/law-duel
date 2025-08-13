import { users, matches, questions, playerSubjectStats, type User, type InsertUser, type Match, type InsertMatch, type Question, type InsertQuestion } from "@shared/schema";
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

  // Match methods
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchByRoomCode(roomCode: string): Promise<Match | undefined>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined>;
  getUserMatches(userId: string, limit: number): Promise<Match[]>;

  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsBySubject(subject: string, limit: number): Promise<Question[]>;
  getRandomQuestion(subject: string, excludeIds?: string[]): Promise<Question | undefined>;
  incrementQuestionUsage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User authentication methods
  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (!user) return null;
      
      const isValid = await bcrypt.compare(password, user.password);
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
      })
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
    
    const [match] = await db
      .update(matches)
      .set(updateData)
      .where(eq(matches.id, id))
      .returning();
    
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
}

export const storage = new DatabaseStorage();