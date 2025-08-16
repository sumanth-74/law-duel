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
  
  // Ranking System (ELO)
  overallElo: integer("overall_elo").notNull().default(1200),
  placementMatches: integer("placement_matches").notNull().default(0), // 0-5
  isRanked: boolean("is_ranked").notNull().default(false), // true after 5 placements
  
  // Leveling System (XP)
  totalXp: integer("total_xp").notNull().default(0),
  levelTitle: text("level_title").notNull().default("Novice Scribe"),
  
  // Daily/Weekly Progress
  dailyXpEarned: integer("daily_xp_earned").notNull().default(0),
  lastDailyReset: timestamp("last_daily_reset").defaultNow(),
  firstDuelOfDay: boolean("first_duel_of_day").notNull().default(true),
  
  // Daily Casefile System
  timezone: text("timezone").default("UTC"),
  dailyStreak: integer("daily_streak").notNull().default(0),
  bestDailyStreak: integer("best_daily_streak").notNull().default(0),
  lastDailyDate: text("last_daily_date"), // YYYY-MM-DD format
  
  // Overall Stats
  totalQuestionsAnswered: integer("total_questions_answered").notNull().default(0),
  totalCorrectAnswers: integer("total_correct_answers").notNull().default(0),
  currentOverallStreak: integer("current_overall_streak").notNull().default(0),
  recentAttempts: jsonb("recent_attempts").$type<Array<{
    timestamp: string;
    correct: boolean;
    subject: string;
  }>>().default([]),
  
  // Victory tracking - true when all subjects reach Supreme (15,000+ correct each)
  hasAchievedVictory: boolean("has_achieved_victory").notNull().default(false),
  victoryDate: timestamp("victory_date"),
  totalHoursPlayed: real("total_hours_played").notNull().default(0),
  subjectsMastered: integer("subjects_mastered").notNull().default(0), // Count of subjects at Supreme level
  
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

// Player stats per subject - Deep Mastery Tracking
export const playerSubjectStats = pgTable("player_subject_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(), // Civil Procedure, Constitutional Law, etc.
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  isProvisional: boolean("is_provisional").notNull().default(true), // true until 20+ attempts
  
  // Deep Mastery System - tracks progression to 15,000+ correct answers
  masteryPoints: integer("mastery_points").notNull().default(0), // Total correct weighted by difficulty
  currentDifficultyLevel: integer("current_difficulty_level").notNull().default(1), // 1-10
  highestDifficultyReached: integer("highest_difficulty_reached").notNull().default(1),
  
  // Detailed tracking per difficulty level
  correctByDifficulty: jsonb("correct_by_difficulty").$type<Record<string, number>>().default({}),
  attemptsByDifficulty: jsonb("attempts_by_difficulty").$type<Record<string, number>>().default({}),
  
  // Progression metrics
  hoursPlayed: real("hours_played").notNull().default(0),
  averageTimePerQuestion: real("avg_time_per_question").notNull().default(0),
  lastMilestone: integer("last_milestone").notNull().default(0), // Last mastery threshold reached
  
  lastDecayDate: timestamp("last_decay_date").defaultNow(),
  recentAttempts: jsonb("recent_attempts").$type<Array<{
    timestamp: string;
    correct: boolean;
    difficulty: number;
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
}).partial({
  email: true,
  lawSchool: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  displayName: z.string().min(1, "Display name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  email: z.string().optional(),
  lawSchool: z.string().optional(),
  avatarData: z.any(), // JSON data for avatar
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

// Ranking System Constants - 10 tiers mixing real legal titles with arcane fantasy flavor
export const RANK_TIERS = [
  { name: "Novice Scribe", minElo: 0, maxElo: 1099, color: "bronze" },       // Bronze tier - copying rules into margins
  { name: "Apprentice Clerk", minElo: 1100, maxElo: 1199, color: "bronze" }, // Bronze tier - basic assistant
  { name: "Pupil Advocate", minElo: 1200, maxElo: 1299, color: "silver" },   // Silver tier - starting to argue
  { name: "Journeyman Counsel", minElo: 1300, maxElo: 1399, color: "silver" },// Silver tier - mid-level grind
  { name: "Adept Barrister", minElo: 1400, maxElo: 1499, color: "gold" },    // Gold tier - confident litigator
  { name: "Master Pleader", minElo: 1500, maxElo: 1599, color: "gold" },     // Gold tier - sharp with rhetoric
  { name: "Counselor of the Realm", minElo: 1600, maxElo: 1699, color: "purple" }, // Purple tier - trusted presence
  { name: "Magister of Law", minElo: 1700, maxElo: 1799, color: "purple" },  // Purple tier - magical authority
  { name: "Archon Jurist", minElo: 1800, maxElo: 1899, color: "obsidian" },  // Obsidian tier - keeper of truths
  { name: "Supreme Arbiter", minElo: 1900, maxElo: 9999, color: "obsidian" } // Obsidian tier - final word
] as const;

// Rank tier colors for visual progression
export const RANK_COLORS = {
  bronze: { bg: "bg-orange-900/30", border: "border-orange-700/50", text: "text-orange-300", glow: "shadow-orange-500/20" },
  silver: { bg: "bg-gray-800/30", border: "border-gray-600/50", text: "text-gray-300", glow: "shadow-gray-400/20" },
  gold: { bg: "bg-yellow-900/30", border: "border-yellow-600/50", text: "text-yellow-300", glow: "shadow-yellow-500/20" },
  purple: { bg: "bg-purple-900/30", border: "border-purple-600/50", text: "text-purple-300", glow: "shadow-purple-500/20" },
  obsidian: { bg: "bg-slate-950/50", border: "border-slate-600/50", text: "text-slate-100", glow: "shadow-slate-400/30" }
} as const;

// Level Titles (1-30+)
export const LEVEL_TITLES = [
  "Novice Scribe", "Lawling", "Case Brief Cadet", "1L Initiate", "Apprentice Litigator",
  "Motion Drafter", "Rule 12(b)(6) Raider", "Discovery Adept", "Deposition Tactician", "Junior Advocate",
  "Hearsay Hunter", "Objection Specialist", "Summary-Judgment Seeker", "Voir Dire Virtuoso", "Trial Architect",
  "Precedent Bender", "Appellate Alchemist", "Counsel of Shadows", "Courtroom Conjurer", "Senior Advocate",
  "Partner Apparent", "Rainmaker", "Master of the Record", "Trialmaster", "Supreme Advocate",
  "Archon of Evidence", "Chancellor of Claims", "Warden of Writs", "Keeper of Precedent", "Legend of the Bar"
] as const;

// Deep Mastery System - Each subject requires thousands of correct answers at increasing difficulty
export const MASTERY_LEVELS = {
  NOVICE: { min: 0, max: 99, title: "Novice", requiredCorrect: 0 },
  APPRENTICE: { min: 100, max: 249, title: "Apprentice", requiredCorrect: 100 },
  PRACTITIONER: { min: 250, max: 499, title: "Practitioner", requiredCorrect: 250 },
  JOURNEYMAN: { min: 500, max: 999, title: "Journeyman", requiredCorrect: 500 },
  EXPERT: { min: 1000, max: 1999, title: "Expert", requiredCorrect: 1000 },
  MASTER: { min: 2000, max: 3499, title: "Master", requiredCorrect: 2000 },
  GRANDMASTER: { min: 3500, max: 5999, title: "Grandmaster", requiredCorrect: 3500 },
  SAGE: { min: 6000, max: 9999, title: "Sage", requiredCorrect: 6000 },
  LEGEND: { min: 10000, max: 14999, title: "Legend", requiredCorrect: 10000 },
  SUPREME: { min: 15000, max: Infinity, title: "Supreme Advocate", requiredCorrect: 15000 }
} as const;

// Difficulty progression - questions get harder as you advance
export const DIFFICULTY_LEVELS = {
  INTRO: { level: 1, multiplier: 1.0, minCorrect: 0 },
  BASIC: { level: 2, multiplier: 1.2, minCorrect: 50 },
  INTERMEDIATE: { level: 3, multiplier: 1.5, minCorrect: 150 },
  ADVANCED: { level: 4, multiplier: 2.0, minCorrect: 400 },
  EXPERT: { level: 5, multiplier: 2.5, minCorrect: 800 },
  MASTER: { level: 6, multiplier: 3.0, minCorrect: 1500 },
  LEGENDARY: { level: 7, multiplier: 4.0, minCorrect: 3000 },
  MYTHIC: { level: 8, multiplier: 5.0, minCorrect: 5000 },
  TRANSCENDENT: { level: 9, multiplier: 7.0, minCorrect: 8000 },
  DIVINE: { level: 10, multiplier: 10.0, minCorrect: 12000 }
} as const;

// Mastery thresholds for progression calculations
export const MASTERY_THRESHOLDS = [
  0,     // Level 0: Novice
  100,   // Level 1: Apprentice
  250,   // Level 2: Practitioner
  500,   // Level 3: Journeyman
  1000,  // Level 4: Expert
  2000,  // Level 5: Master
  3500,  // Level 6: Grandmaster
  6000,  // Level 7: Sage
  10000, // Level 8: Legend
  15000  // Level 9: Supreme
] as const;

// Roman numerals for mastery levels
export const MASTERY_NUMERALS = [
  "0",   // Novice
  "I",   // Apprentice
  "II",  // Practitioner
  "III", // Journeyman
  "IV",  // Expert
  "V",   // Master
  "VI",  // Grandmaster
  "VII", // Sage
  "VIII",// Legend
  "IX"   // Supreme
] as const;

// Victory condition - must achieve Supreme in all 7 MBE subjects
export const VICTORY_REQUIREMENTS = {
  subjectsRequired: 7, // All MBE subjects
  masteryLevelRequired: 15000, // Supreme level per subject
  totalQuestionsRequired: 105000, // 15k × 7 subjects minimum
  estimatedHours: 1000 // Roughly 1000 hours to complete
} as const;

// Daily Questions Table
export const dailyQuestions = pgTable("daily_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dateUtc: text("date_utc").notNull(), // YYYY-MM-DD format
  subject: text("subject").notNull(),
  topic: text("topic"),
  difficulty: text("difficulty").notNull().default("hard"),
  stem: text("stem").notNull(),
  choices: jsonb("choices").$type<string[]>().notNull(), // Array of 4 choices
  correctIndex: integer("correct_index").notNull(), // 0-3
  explanationLong: text("explanation_long").notNull(),
  ruleRefs: jsonb("rule_refs").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Daily Attempts Table
export const userDailyAttempts = pgTable("user_daily_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  answeredAt: timestamp("answered_at").defaultNow(),
  isCorrect: boolean("is_correct").notNull(),
  choiceIndex: integer("choice_index").notNull(), // User's choice 0-3
  xpAwarded: integer("xp_awarded").notNull().default(0),
  masteryDelta: integer("mastery_delta").notNull().default(0),
  streakBefore: integer("streak_before").notNull().default(0),
  streakAfter: integer("streak_after").notNull().default(0),
});

export type DailyQuestion = typeof dailyQuestions.$inferSelect;
export type InsertDailyQuestion = typeof dailyQuestions.$inferInsert;
export type UserDailyAttempt = typeof userDailyAttempts.$inferSelect;
export type InsertUserDailyAttempt = typeof userDailyAttempts.$inferInsert;

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
