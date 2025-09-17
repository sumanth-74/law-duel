-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "matches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"subject" text NOT NULL,
	"player1_id" text NOT NULL,
	"player2_id" text,
	"winner_id" text,
	"player1_score" integer DEFAULT 0 NOT NULL,
	"player2_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"stem" text NOT NULL,
	"choices" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"match_id" varchar,
	"subject" text NOT NULL,
	"selected_answer" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent" integer,
	"difficulty" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_utc" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text,
	"difficulty" text DEFAULT 'hard' NOT NULL,
	"stem" text NOT NULL,
	"choices" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation_long" text NOT NULL,
	"rule_refs" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_daily_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"answered_at" timestamp DEFAULT now(),
	"is_correct" boolean NOT NULL,
	"choice_index" integer NOT NULL,
	"xp_awarded" integer DEFAULT 0,
	"mastery_delta" integer DEFAULT 0,
	"streak_before" integer DEFAULT 0,
	"streak_after" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "solo_challenges" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text,
	"question_type" text,
	"lives_remaining" integer DEFAULT 3 NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"lost_all_lives_at" timestamp,
	"current_question_id" varchar,
	"is_daily_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_subject_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"questions_answered" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"recent_attempts" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"mastery_points" integer DEFAULT 0,
	"last_decay_date" timestamp DEFAULT now(),
	"current_difficulty_level" integer DEFAULT 1 NOT NULL,
	"highest_difficulty_reached" integer DEFAULT 1 NOT NULL,
	"correct_by_difficulty" jsonb DEFAULT '{}'::jsonb,
	"attempts_by_difficulty" jsonb DEFAULT '{}'::jsonb,
	"hours_played" real DEFAULT 0 NOT NULL,
	"avg_time_per_question" real DEFAULT 0 NOT NULL,
	"last_milestone" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"progress_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"avatar_data" jsonb NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"total_losses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"law_school" text,
	"streak_wins" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"loss_shield_active" boolean DEFAULT false NOT NULL,
	"daily_data" jsonb,
	"overall_elo" integer DEFAULT 1200 NOT NULL,
	"total_questions_answered" integer DEFAULT 0 NOT NULL,
	"total_correct_answers" integer DEFAULT 0 NOT NULL,
	"current_overall_streak" integer DEFAULT 0 NOT NULL,
	"recent_attempts" jsonb DEFAULT '[]'::jsonb,
	"placement_matches" integer DEFAULT 0,
	"is_ranked" boolean DEFAULT false,
	"total_xp" integer DEFAULT 0,
	"level_title" text DEFAULT 'Novice Scribe',
	"daily_xp_earned" integer DEFAULT 0,
	"last_daily_reset" timestamp DEFAULT now(),
	"first_duel_of_day" boolean DEFAULT true,
	"timezone" text DEFAULT 'UTC',
	"daily_streak" integer DEFAULT 0,
	"best_daily_streak" integer DEFAULT 0,
	"last_daily_date" text,
	"has_achieved_victory" boolean DEFAULT false NOT NULL,
	"victory_date" timestamp,
	"total_hours_played" real DEFAULT 0 NOT NULL,
	"subjects_mastered" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "atticus_duels" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" varchar,
	"result" varchar,
	"player_score" integer DEFAULT 0 NOT NULL,
	"atticus_score" integer DEFAULT 0 NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_question" jsonb,
	"revived" boolean DEFAULT false NOT NULL,
	"auto_restored_at" timestamp,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"avatar_data" jsonb NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "question_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"difficulty" integer NOT NULL,
	"question_data" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "user_sessions" USING btree ("expire" timestamp_ops);
*/