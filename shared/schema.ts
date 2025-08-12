import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  password: text("password").notNull(),
  email: text("email").unique(),
  lawSchool: text("law_school"),
  avatarData: jsonb("avatar_data").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  points: integer("points").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  totalLosses: integer("total_losses").notNull().default(0),
  streakWins: integer("streak_wins").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lossShieldActive: boolean("loss_shield_active").notNull().default(false),
  dailyData: jsonb("daily_data").$type<{
    date: string;
    winsToday: number;
    questsCompleted: string[];
    xpEarned: number;
  }>(),
  
  // Player Stats
  overallElo: integer("overall_elo").notNull().default(1200),
  totalQuestionsAnswered: integer("total_questions_answered").notNull().default(0),
  totalCorrectAnswers: integer("total_correct_answers").notNull().default(0),
  currentOverallStreak: integer("current_overall_streak").notNull().default(0),
  recentAttempts: jsonb("recent_attempts").$type<Array<{
    timestamp: string;
    correct: boolean;
    subject: string;
  }>>().default([]),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomCode: text("room_code").notNull(),
  subject: text("subject").notNull(),
  player1Id: text("player1_id").notNull(),
  player2Id: text("player2_id"),
  winnerId: text("winner_id"),
  player1Score: integer("player1_score").notNull().default(0),
  player2Score: integer("player2_score").notNull().default(0),
  status: text("status").notNull().default("waiting"), // waiting, active, finished
  currentRound: integer("current_round").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  stem: text("stem").notNull(),
  choices: jsonb("choices").notNull(), // array of 4 choices
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  difficulty: text("difficulty").notNull().default("medium"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Player stats per subject
export const playerSubjectStats = pgTable("player_subject_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(), // Civil Procedure, Constitutional Law, etc.
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  isProvisional: boolean("is_provisional").notNull().default(true), // true until 20+ attempts
  subjectRating: integer("subject_rating").notNull().default(1200), // ELO-like per subject
  recentAttempts: jsonb("recent_attempts").$type<Array<{
    timestamp: string;
    correct: boolean;
  }>>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Individual question attempts (for detailed tracking)
export const questionAttempts = pgTable("question_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  matchId: varchar("match_id"), // null for practice
  subject: text("subject").notNull(),
  selectedAnswer: integer("selected_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // milliseconds
  difficulty: text("difficulty").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  lawSchool: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  finishedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type PlayerSubjectStats = typeof playerSubjectStats.$inferSelect;
export type QuestionAttempt = typeof questionAttempts.$inferSelect;

// MBE Subjects
export const MBE_SUBJECTS = [
  "Civil Procedure",
  "Constitutional Law", 
  "Contracts",
  "Criminal Law/Procedure",
  "Evidence",
  "Real Property",
  "Torts"
] as const;

export type MBESubject = typeof MBE_SUBJECTS[number];

// Avatar system types
export const avatarDataSchema = z.object({
  archetypeId: z.string().optional(),
  customLabel: z.string().optional(),
  base: z.string(),
  palette: z.string(),
  props: z.array(z.string()),
});

export type AvatarData = z.infer<typeof avatarDataSchema>;

// Socket event types
export interface SocketEvents {
  'presence:hello': (data: { username: string; profile: User }) => void;
  'queue:join': (data: { subject: string }) => void;
  'queue:leave': () => void;
  'duel:start': (data: DuelStartData) => void;
  'duel:answer': (data: { qid: string; idx: number; ms: number }) => void;
  'duel:hint': (data: { matchId: string }) => void;
  'duel:question': (data: QuestionData) => void;
  'duel:result': (data: DuelResultData) => void;
  'duel:finished': (data: DuelFinishedData) => void;
}

export interface DuelStartData {
  roomCode: string;
  subject: string;
  bestOf: number;
  ranked: boolean;
  stake: number;
  opponent?: {
    username: string;
    displayName: string;
    level: number;
    points: number;
    avatarData: AvatarData;
  };
}

export interface QuestionData {
  qid: string;
  round: number;
  stem: string;
  choices: string[];
  timeLimit: number;
  deadlineTs: number;
}

export interface DuelResultData {
  qid: string;
  correctIndex: number;
  explanation: string;
  results: {
    playerId: string;
    selectedIndex: number;
    timeMs: number;
    correct: boolean;
  }[];
  scores: {
    player1: number;
    player2: number;
  };
}

export interface DuelFinishedData {
  winnerId: string;
  finalScores: {
    player1: number;
    player2: number;
  };
  pointChanges: {
    player1: number;
    player2: number;
  };
  xpGained: {
    player1: number;
    player2: number;
  };
}
