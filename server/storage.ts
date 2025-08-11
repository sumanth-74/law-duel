import { type User, type InsertUser, type Match, type InsertMatch, type Question, type InsertQuestion } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private matches: Map<string, Match>;
  private questions: Map<string, Question>;

  constructor() {
    this.users = new Map();
    this.matches = new Map();
    this.questions = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTopPlayers(limit: number): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  // Match methods
  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const match: Match = {
      ...insertMatch,
      id,
      createdAt: new Date(),
      finishedAt: null,
    };
    this.matches.set(id, match);
    return match;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async getMatchByRoomCode(roomCode: string): Promise<Match | undefined> {
    return Array.from(this.matches.values()).find(
      (match) => match.roomCode === roomCode,
    );
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, ...updates };
    if (updates.status === 'finished' && !updatedMatch.finishedAt) {
      updatedMatch.finishedAt = new Date();
    }
    this.matches.set(id, updatedMatch);
    return updatedMatch;
  }

  async getUserMatches(userId: string, limit: number): Promise<Match[]> {
    return Array.from(this.matches.values())
      .filter((match) => match.player1Id === userId || match.player2Id === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      ...insertQuestion,
      id,
      usageCount: 0,
      createdAt: new Date(),
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestionsBySubject(subject: string, limit: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((q) => q.subject === subject)
      .slice(0, limit);
  }

  async getRandomQuestion(subject: string, excludeIds: string[] = []): Promise<Question | undefined> {
    const questions = Array.from(this.questions.values())
      .filter((q) => q.subject === subject && !excludeIds.includes(q.id));
    
    if (questions.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  async incrementQuestionUsage(id: string): Promise<void> {
    const question = this.questions.get(id);
    if (question) {
      question.usageCount++;
      this.questions.set(id, question);
    }
  }
}

export const storage = new MemStorage();
