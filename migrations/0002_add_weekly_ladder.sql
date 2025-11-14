-- Migration: Add weekly ladder entries table
-- This replaces the weekly_ladder_*.json files with proper database storage

CREATE TABLE IF NOT EXISTS "weekly_ladder_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"username" text NOT NULL,
	"week_id" text NOT NULL,
	"weekly_rating" integer DEFAULT 1000 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"law_school" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique constraint: one entry per user per week
ALTER TABLE "weekly_ladder_entries" ADD CONSTRAINT "weekly_ladder_entries_user_id_week_id_unique" UNIQUE("user_id","week_id");

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "weekly_ladder_week_idx" ON "weekly_ladder_entries" ("week_id");
CREATE INDEX IF NOT EXISTS "weekly_ladder_rating_idx" ON "weekly_ladder_entries" ("week_id","weekly_rating");
