#!/usr/bin/env tsx

import { db } from '../server/db';
import { weeklyLadderEntries } from '../shared/schema';
import fs from 'fs/promises';
import path from 'path';

/**
 * Migration script to:
 * 1. Create the weekly_ladder_entries table
 * 2. Migrate data from JSON files to database
 * 3. Verify the migration
 */

async function migrateWeeklyLadder() {
  console.log('🚀 Starting weekly ladder migration...');

  try {
    // 1. Create the table (this will be handled by Drizzle migrations)
    console.log('✅ Table creation handled by Drizzle migrations');

    // 2. Migrate existing JSON data
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    const weeklyLadderFiles = files.filter(file => file.startsWith('weekly_ladder_') && file.endsWith('.json'));

    console.log(`📁 Found ${weeklyLadderFiles.length} weekly ladder files to migrate`);

    for (const file of weeklyLadderFiles) {
      const filePath = path.join(dataDir, file);
      const weekId = file.replace('weekly_ladder_', '').replace('.json', '');
      
      console.log(`📊 Migrating ${file} (week: ${weekId})...`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Convert JSON structure to database entries
        const entries = Object.values(data).map((entry: any) => ({
          userId: entry.userId,
          username: entry.username,
          weekId: weekId,
          weeklyRating: entry.weeklyRating || 1000,
          gamesPlayed: entry.gamesPlayed || 0,
          wins: entry.wins || 0,
          losses: entry.losses || 0,
          lawSchool: entry.lawSchool || null,
        }));

        if (entries.length > 0) {
          // Insert entries into database
          await db.insert(weeklyLadderEntries).values(entries).onConflictDoNothing();
          console.log(`  ✅ Migrated ${entries.length} entries for week ${weekId}`);
        } else {
          console.log(`  ⚠️ No entries found in ${file}`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating ${file}:`, error);
      }
    }

    // 3. Verify migration
    console.log('\n🔍 Verifying migration...');
    const totalEntries = await db.select().from(weeklyLadderEntries);
    console.log(`✅ Total entries in database: ${totalEntries.length}`);

    // Show sample of migrated data
    if (totalEntries.length > 0) {
      console.log('\n📋 Sample migrated entries:');
      totalEntries.slice(0, 3).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.username} (${entry.weekId}): ${entry.weeklyRating} rating`);
      });
    }

    console.log('\n✅ Weekly ladder migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateWeeklyLadder()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateWeeklyLadder };
