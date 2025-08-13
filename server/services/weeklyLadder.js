import { storage } from '../storage.js';

/**
 * Weekly Ladder Service - Per North Star requirements
 * Tracks player ratings on a weekly basis (Monday-Sunday)
 */

/**
 * Get the current ISO week string (YYYY-WW)
 */
function getCurrentISOWeek() {
  const date = new Date();
  const year = date.getFullYear();
  
  // Get Monday of current week
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  
  // Calculate week number
  const janFirst = new Date(year, 0, 1);
  const daysOffset = (janFirst.getDay() === 0 ? 6 : janFirst.getDay() - 1);
  const firstMonday = new Date(year, 0, 1 + (7 - daysOffset));
  
  let weekNum = 1;
  if (monday >= firstMonday) {
    weekNum = Math.ceil((monday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }
  
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Update player's weekly ladder stats after a match
 * @param {string} userId - Player's user ID
 * @param {number} ratingChange - Change in Elo rating
 * @param {boolean} won - Whether the player won
 */
export async function updateWeeklyLadder(userId, ratingChange, won) {
  const week = getCurrentISOWeek();
  const ladder = await getWeeklyLadder(week);
  
  if (!ladder[userId]) {
    const user = await storage.getUserById(userId);
    ladder[userId] = {
      userId,
      username: user?.displayName || user?.username || 'Unknown',
      lawSchool: user?.lawSchool || '',
      weeklyRating: user?.points || 1200, // Start at current rating
      weeklyWins: 0,
      weeklyLosses: 0,
      weeklyMatches: 0,
      weeklyRatingChange: 0
    };
  }
  
  // Update stats
  ladder[userId].weeklyRating += ratingChange;
  ladder[userId].weeklyRatingChange += ratingChange;
  ladder[userId].weeklyMatches++;
  
  if (won) {
    ladder[userId].weeklyWins++;
  } else {
    ladder[userId].weeklyLosses++;
  }
  
  await saveWeeklyLadder(week, ladder);
  
  console.log(`📊 Weekly Ladder updated for ${ladder[userId].username}: Rating ${ladder[userId].weeklyRating} (${ratingChange >= 0 ? '+' : ''}${ratingChange})`);
}

/**
 * Get top 50 players for the current week
 * @returns {Array} Top 50 players sorted by rating
 */
export async function getWeeklyTop50() {
  const week = getCurrentISOWeek();
  const ladder = await getWeeklyLadder(week);
  
  // Convert to array and sort by rating
  const players = Object.values(ladder)
    .sort((a, b) => b.weeklyRating - a.weeklyRating)
    .slice(0, 50)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  
  return players;
}

/**
 * Get weekly ladder data from storage
 */
async function getWeeklyLadder(week) {
  // In development, use file storage
  if (process.env.NODE_ENV === 'development') {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    const ladderFile = path.join(dataDir, `weekly_ladder_${week}.json`);
    
    try {
      const data = await fs.readFile(ladderFile, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return {}; // Return empty ladder if file doesn't exist
    }
  }
  
  // In production, would use database
  return {};
}

/**
 * Save weekly ladder data to storage
 */
async function saveWeeklyLadder(week, ladder) {
  // In development, use file storage
  if (process.env.NODE_ENV === 'development') {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    const ladderFile = path.join(dataDir, `weekly_ladder_${week}.json`);
    
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save ladder data
    await fs.writeFile(ladderFile, JSON.stringify(ladder, null, 2));
  }
  
  // In production, would use database
}

/**
 * Clean up old weekly ladder files (older than 4 weeks)
 */
export async function cleanupOldWeeklyLadders() {
  if (process.env.NODE_ENV === 'development') {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    
    try {
      const files = await fs.readdir(dataDir);
      const ladderFiles = files.filter(f => f.startsWith('weekly_ladder_'));
      
      // Calculate cutoff week (4 weeks ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 28);
      const cutoffWeek = getCurrentISOWeek.call({ date: cutoffDate });
      
      for (const file of ladderFiles) {
        const week = file.replace('weekly_ladder_', '').replace('.json', '');
        if (week < cutoffWeek) {
          await fs.unlink(path.join(dataDir, file));
          console.log(`🧹 Cleaned up old weekly ladder: ${week}`);
        }
      }
    } catch (err) {
      console.error('Error cleaning up weekly ladders:', err);
    }
  }
}