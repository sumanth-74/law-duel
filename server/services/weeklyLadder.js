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
    const user = await storage.getUser(userId);
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
 * Get weekly ladder data from database
 */
async function getWeeklyLadder(week) {
  const { storage } = await import('../storage.js');
  
  try {
    const entries = await storage.getWeeklyLadder(week, 50);
    
    // Convert database entries back to the expected format for compatibility
    const ladder = {};
    entries.forEach(entry => {
      ladder[entry.userId] = {
        userId: entry.userId,
        username: entry.username,
        weeklyRating: entry.weeklyRating,
        gamesPlayed: entry.gamesPlayed,
        wins: entry.wins,
        losses: entry.losses,
        lawSchool: entry.lawSchool
      };
    });
    
    return ladder;
  } catch (error) {
    console.error('Error fetching weekly ladder from database:', error);
    return {}; // Return empty ladder on error
  }
}

/**
 * Save weekly ladder data to storage
 */
async function saveWeeklyLadder(week, ladder) {
  const { storage } = await import('../storage.js');
  
  try {
    // Convert ladder object to database entries and upsert them
    const entries = Object.values(ladder).map(entry => ({
      userId: entry.userId,
      username: entry.username,
      weekId: week,
      weeklyRating: entry.weeklyRating || 1000,
      gamesPlayed: entry.gamesPlayed || 0,
      wins: entry.wins || 0,
      losses: entry.losses || 0,
      lawSchool: entry.lawSchool || null
    }));
    
    // Upsert each entry
    for (const entry of entries) {
      await storage.upsertWeeklyLadderEntry(entry);
    }
    
    console.log(`📊 Saved ${entries.length} weekly ladder entries for week ${week} to database`);
  } catch (error) {
    console.error('Error saving weekly ladder to database:', error);
    throw error;
  }
}

/**
 * Clean up old weekly ladder entries (older than 4 weeks)
 */
export async function cleanupOldWeeklyLadders() {
  const { storage } = await import('../storage.js');
  
  try {
    // Calculate cutoff week (4 weeks ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 28);
    const cutoffWeek = getCurrentISOWeek.call({ date: cutoffDate });
    
    // Note: For now, we'll keep all historical data in the database
    // In the future, we could add a cleanup query here if needed
    console.log(`🧹 Weekly ladder cleanup: keeping all entries (cutoff would be ${cutoffWeek})`);
    
    // TODO: Add database cleanup query if needed:
    // await db.delete(weeklyLadderEntries).where(lt(weeklyLadderEntries.weekId, cutoffWeek));
    
  } catch (err) {
    console.error('Error cleaning up weekly ladders:', err);
  }
}