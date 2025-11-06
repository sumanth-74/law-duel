CREATE TABLE "subtopic_attempt_audit" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"duel_id" varchar,
	"question_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtopic_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"subtopic_key" text NOT NULL,
	"subtopic_name" text NOT NULL,
	"questions_attempted" integer DEFAULT 0 NOT NULL,
	"questions_correct" integer DEFAULT 0 NOT NULL,
	"proficiency_score" real DEFAULT 0 NOT NULL,
	"last_practiced" timestamp,
	"streak_correct" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" DROP CONSTRAINT "leaderboard_entries_user_id_key";--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ALTER COLUMN "xp_awarded" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ALTER COLUMN "mastery_delta" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ALTER COLUMN "streak_before" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ALTER COLUMN "streak_after" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subject_stats" ALTER COLUMN "mastery_points" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "placement_matches" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_ranked" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "total_xp" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "level_title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_xp_earned" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_duel_of_day" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_streak" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "best_daily_streak" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "mode" text DEFAULT 'realtime' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "best_of" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "is_bot_match" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "turns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "difficulty" integer DEFAULT 1 NOT NULL;