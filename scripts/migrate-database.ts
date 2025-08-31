import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function createTables() {
  console.log("🔄 Creating missing database tables...");

  try {
    // Create solo_challenges table
    await sql`
      CREATE TABLE IF NOT EXISTS solo_challenges (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        subject TEXT,
        question_type TEXT,
        lives_remaining INTEGER NOT NULL DEFAULT 3,
        round INTEGER NOT NULL DEFAULT 1,
        score INTEGER NOT NULL DEFAULT 0,
        difficulty INTEGER NOT NULL DEFAULT 1,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        lost_all_lives_at TIMESTAMP,
        current_question_id VARCHAR,
        is_daily_complete BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created solo_challenges table");

    // Create atticus_duels table
    await sql`
      CREATE TABLE IF NOT EXISTS atticus_duels (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        challenge_id VARCHAR,
        result VARCHAR,
        player_score INTEGER NOT NULL DEFAULT 0,
        atticus_score INTEGER NOT NULL DEFAULT 0,
        round INTEGER NOT NULL DEFAULT 1,
        status VARCHAR NOT NULL DEFAULT 'active',
        questions JSONB NOT NULL DEFAULT '[]',
        current_question JSONB,
        revived BOOLEAN NOT NULL DEFAULT false,
        auto_restored_at TIMESTAMP,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created atticus_duels table");

    // Create game_progress table
    await sql`
      CREATE TABLE IF NOT EXISTS game_progress (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        subject TEXT NOT NULL,
        progress_data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created game_progress table");

    // Create leaderboard_entries table
    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        avatar_data JSONB NOT NULL,
        last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
        is_bot BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created leaderboard_entries table");

    // Create question_cache table
    await sql`
      CREATE TABLE IF NOT EXISTS question_cache (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        difficulty INTEGER NOT NULL,
        question_data JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created question_cache table");

    console.log("🎉 All tables created successfully!");

  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting database migration...");
  
  try {
    await createTables();
    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
