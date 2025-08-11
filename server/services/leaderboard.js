import fs from 'fs/promises';
import path from 'path';

const LEADERBOARD_FILE = path.join(process.cwd(), 'data', 'leaderboard.json');
const BACKUP_FILE = path.join(process.cwd(), 'data', 'leaderboard.bak');

let writeCount = 0;

export async function initializeLeaderboard() {
  try {
    // Ensure data directory exists
    await fs.mkdir(path.dirname(LEADERBOARD_FILE), { recursive: true });
    
    // Try to load existing leaderboard
    try {
      await fs.access(LEADERBOARD_FILE);
      console.log('Leaderboard file found');
    } catch {
      // Create initial empty leaderboard
      await writeLeaderboard([]);
      console.log('Created new leaderboard file');
    }
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
  }
}

export async function updatePlayerStats(playerId, updates) {
  try {
    const leaderboard = await readLeaderboard();
    
    let player = leaderboard.find(p => p.id === playerId);
    if (!player) {
      // Add new player to leaderboard
      player = {
        id: playerId,
        username: updates.username || 'Anonymous',
        displayName: updates.displayName || 'Anonymous',
        level: updates.level || 1,
        points: updates.points || 0,
        totalWins: updates.totalWins || 0,
        totalLosses: updates.totalLosses || 0,
        lastActive: new Date().toISOString()
      };
      leaderboard.push(player);
    } else {
      // Update existing player
      Object.assign(player, updates, { 
        lastActive: new Date().toISOString() 
      });
    }

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);
    
    // Keep only top 100 to prevent file bloat
    const trimmed = leaderboard.slice(0, 100);
    
    await writeLeaderboard(trimmed);
    
    return player;
  } catch (error) {
    console.error('Failed to update player stats:', error);
    return null;
  }
}

export async function getLeaderboard(limit = 20) {
  try {
    const leaderboard = await readLeaderboard();
    return leaderboard
      .filter(player => !player.id.startsWith('sb_')) // Exclude stealth bots
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

async function readLeaderboard() {
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read leaderboard:', error);
    return [];
  }
}

async function writeLeaderboard(data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    
    // Atomic write: write to temp file first
    const tempFile = `${LEADERBOARD_FILE}.tmp`;
    await fs.writeFile(tempFile, jsonData, 'utf8');
    
    // Create backup every 20 writes
    writeCount++;
    if (writeCount % 20 === 0) {
      try {
        await fs.copyFile(LEADERBOARD_FILE, BACKUP_FILE);
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError.message);
      }
    }
    
    // Atomic rename
    await fs.rename(tempFile, LEADERBOARD_FILE);
    
  } catch (error) {
    console.error('Failed to write leaderboard:', error);
    throw error;
  }
}
