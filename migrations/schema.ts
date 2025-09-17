import { pgTable, varchar, text, integer, timestamp, jsonb, boolean, index, json, real, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const matches = pgTable("matches", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	roomCode: text("room_code").notNull(),
	subject: text().notNull(),
	player1Id: text("player1_id").notNull(),
	player2Id: text("player2_id"),
	winnerId: text("winner_id"),
	player1Score: integer("player1_score").default(0).notNull(),
	player2Score: integer("player2_score").default(0).notNull(),
	status: text().default('waiting').notNull(),
	currentRound: integer("current_round").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
});

export const questions = pgTable("questions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	subject: text().notNull(),
	stem: text().notNull(),
	choices: jsonb().notNull(),
	correctIndex: integer("correct_index").notNull(),
	explanation: text(),
	difficulty: text().default('medium').notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const questionAttempts = pgTable("question_attempts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	questionId: varchar("question_id").notNull(),
	matchId: varchar("match_id"),
	subject: text().notNull(),
	selectedAnswer: integer("selected_answer").notNull(),
	isCorrect: boolean("is_correct").notNull(),
	timeSpent: integer("time_spent"),
	difficulty: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
});

export const dailyQuestions = pgTable("daily_questions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	dateUtc: text("date_utc").notNull(),
	subject: text().notNull(),
	topic: text(),
	difficulty: text().default('hard').notNull(),
	stem: text().notNull(),
	choices: jsonb().notNull(),
	correctIndex: integer("correct_index").notNull(),
	explanationLong: text("explanation_long").notNull(),
	ruleRefs: jsonb("rule_refs").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const userDailyAttempts = pgTable("user_daily_attempts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	questionId: varchar("question_id").notNull(),
	answeredAt: timestamp("answered_at", { mode: 'string' }).defaultNow(),
	isCorrect: boolean("is_correct").notNull(),
	choiceIndex: integer("choice_index").notNull(),
	xpAwarded: integer("xp_awarded").default(0),
	masteryDelta: integer("mastery_delta").default(0),
	streakBefore: integer("streak_before").default(0),
	streakAfter: integer("streak_after").default(0),
});

export const soloChallenges = pgTable("solo_challenges", {
	id: varchar().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	subject: text(),
	questionType: text("question_type"),
	livesRemaining: integer("lives_remaining").default(3).notNull(),
	round: integer().default(1).notNull(),
	score: integer().default(0).notNull(),
	difficulty: integer().default(1).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	lostAllLivesAt: timestamp("lost_all_lives_at", { mode: 'string' }),
	currentQuestionId: varchar("current_question_id"),
	isDailyComplete: boolean("is_daily_complete").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const playerSubjectStats = pgTable("player_subject_stats", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	subject: text().notNull(),
	questionsAnswered: integer("questions_answered").default(0).notNull(),
	correctAnswers: integer("correct_answers").default(0).notNull(),
	currentStreak: integer("current_streak").default(0).notNull(),
	isProvisional: boolean("is_provisional").default(true).notNull(),
	recentAttempts: jsonb("recent_attempts").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	masteryPoints: integer("mastery_points").default(0),
	lastDecayDate: timestamp("last_decay_date", { mode: 'string' }).defaultNow(),
	currentDifficultyLevel: integer("current_difficulty_level").default(1).notNull(),
	highestDifficultyReached: integer("highest_difficulty_reached").default(1).notNull(),
	correctByDifficulty: jsonb("correct_by_difficulty").default({}),
	attemptsByDifficulty: jsonb("attempts_by_difficulty").default({}),
	hoursPlayed: real("hours_played").default(0).notNull(),
	avgTimePerQuestion: real("avg_time_per_question").default(0).notNull(),
	lastMilestone: integer("last_milestone").default(0).notNull(),
});

export const gameProgress = pgTable("game_progress", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	subject: text().notNull(),
	progressData: jsonb("progress_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	displayName: text("display_name").notNull(),
	password: text().notNull(),
	email: text(),
	avatarData: jsonb("avatar_data").notNull(),
	level: integer().default(1).notNull(),
	xp: integer().default(0).notNull(),
	points: integer().default(0).notNull(),
	totalWins: integer("total_wins").default(0).notNull(),
	totalLosses: integer("total_losses").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	lawSchool: text("law_school"),
	streakWins: integer("streak_wins").default(0).notNull(),
	bestStreak: integer("best_streak").default(0).notNull(),
	lossShieldActive: boolean("loss_shield_active").default(false).notNull(),
	dailyData: jsonb("daily_data"),
	overallElo: integer("overall_elo").default(1200).notNull(),
	totalQuestionsAnswered: integer("total_questions_answered").default(0).notNull(),
	totalCorrectAnswers: integer("total_correct_answers").default(0).notNull(),
	currentOverallStreak: integer("current_overall_streak").default(0).notNull(),
	recentAttempts: jsonb("recent_attempts").default([]),
	placementMatches: integer("placement_matches").default(0),
	isRanked: boolean("is_ranked").default(false),
	totalXp: integer("total_xp").default(0),
	levelTitle: text("level_title").default('Novice Scribe'),
	dailyXpEarned: integer("daily_xp_earned").default(0),
	lastDailyReset: timestamp("last_daily_reset", { mode: 'string' }).defaultNow(),
	firstDuelOfDay: boolean("first_duel_of_day").default(true),
	timezone: text().default('UTC'),
	dailyStreak: integer("daily_streak").default(0),
	bestDailyStreak: integer("best_daily_streak").default(0),
	lastDailyDate: text("last_daily_date"),
	hasAchievedVictory: boolean("has_achieved_victory").default(false).notNull(),
	victoryDate: timestamp("victory_date", { mode: 'string' }),
	totalHoursPlayed: real("total_hours_played").default(0).notNull(),
	subjectsMastered: integer("subjects_mastered").default(0).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const atticusDuels = pgTable("atticus_duels", {
	id: varchar().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	challengeId: varchar("challenge_id"),
	result: varchar(),
	playerScore: integer("player_score").default(0).notNull(),
	atticusScore: integer("atticus_score").default(0).notNull(),
	round: integer().default(1).notNull(),
	status: varchar().default('active').notNull(),
	questions: jsonb().default([]).notNull(),
	currentQuestion: jsonb("current_question"),
	revived: boolean().default(false).notNull(),
	autoRestoredAt: timestamp("auto_restored_at", { mode: 'string' }),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	username: text().notNull(),
	displayName: text("display_name").notNull(),
	points: integer().default(0).notNull(),
	level: integer().default(1).notNull(),
	avatarData: jsonb("avatar_data").notNull(),
	lastActivity: timestamp("last_activity", { mode: 'string' }).defaultNow().notNull(),
	isBot: boolean("is_bot").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("leaderboard_entries_user_id_key").on(table.userId),
]);

export const questionCache = pgTable("question_cache", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	subject: text().notNull(),
	difficulty: integer().notNull(),
	questionData: jsonb("question_data").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
