import { storage } from '../storage.js';

export async function initializeLeaderboard() {
  try {
    console.log('Leaderboard service initialized with database storage');
    
    // Check if we need to seed with bots for a more active appearance
    const leaderboard = await storage.getLeaderboard(50);
    // Only seed if we have fewer than 12 players (all our bots have points)
    if (leaderboard.length < 12) {
      await seedLeaderboardWithBots();
    }
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
  }
}

// Seed leaderboard with realistic bot players to make platform look active
async function seedLeaderboardWithBots() {
  const botPlayers = [
    {
      id: 'bot_alexandra_lex',
      username: 'alexandra_lex',
      displayName: 'Alexandra Richards',
      level: 12,
      points: 3247,
      isBot: true,
      avatarData: { backgroundColor: '#4F46E5', style: 'professional', accessory: 'glasses' }
    },
    {
      id: 'bot_marcus_wright',
      username: 'marcus_wright', 
      displayName: 'Marcus Wright',
      level: 10,
      points: 2891,
      isBot: true,
      avatarData: { backgroundColor: '#059669', style: 'business', accessory: 'tie' }
    },
    {
      id: 'bot_diana_torres',
      username: 'diana_torres',
      displayName: 'Diana Torres',
      level: 11,
      points: 2743,
      isBot: true,
      avatarData: { backgroundColor: '#DC2626', style: 'academic', accessory: 'book' }
    },
    {
      id: 'bot_james_miller',
      username: 'james_miller',
      displayName: 'James Miller',
      level: 9,
      points: 2456,
      isBot: true,
      avatarData: { backgroundColor: '#7C3AED', style: 'casual', accessory: 'cap' }
    },
    {
      id: 'bot_sarah_chen',
      username: 'sarah_chen',
      displayName: 'Sarah Chen',
      level: 8,
      points: 2187,
      isBot: true,
      avatarData: { backgroundColor: '#EA580C', style: 'modern', accessory: 'earbuds' }
    },
    {
      id: 'bot_robert_kim',
      username: 'robert_kim',
      displayName: 'Robert Kim',
      level: 7,
      points: 1923,
      isBot: true,
      avatarData: { backgroundColor: '#0891B2', style: 'trendy', accessory: 'sunglasses' }
    },
    {
      id: 'bot_emily_davis',
      username: 'emily_davis',
      displayName: 'Emily Davis',
      level: 6,
      points: 1654,
      isBot: true,
      avatarData: { backgroundColor: '#BE185D', style: 'elegant', accessory: 'necklace' }
    },
    {
      id: 'bot_michael_brown',
      username: 'michael_brown',
      displayName: 'Michael Brown',
      level: 5,
      points: 1398,
      isBot: true,
      avatarData: { backgroundColor: '#16A34A', style: 'athletic', accessory: 'headband' }
    },
    {
      id: 'bot_jessica_wilson',
      username: 'jessica_wilson',
      displayName: 'Jessica Wilson',
      level: 4,
      points: 1152,
      isBot: true,
      avatarData: { backgroundColor: '#9333EA', style: 'creative', accessory: 'beret' }
    },
    {
      id: 'bot_david_johnson',
      username: 'david_johnson',
      displayName: 'David Johnson',
      level: 3,
      points: 987,
      isBot: true,
      avatarData: { backgroundColor: '#C2410C', style: 'vintage', accessory: 'mustache' }
    },
    {
      id: 'bot_lisa_garcia',
      username: 'lisa_garcia',
      displayName: 'Lisa Garcia',
      level: 4,
      points: 834,
      isBot: true,
      avatarData: { backgroundColor: '#DB2777', style: 'chic', accessory: 'scarf' }
    },
    {
      id: 'bot_kevin_martinez',
      username: 'kevin_martinez',
      displayName: 'Kevin Martinez',
      level: 2,
      points: 692,
      isBot: true,
      avatarData: { backgroundColor: '#2563EB', style: 'sporty', accessory: 'cap' }
    }
  ];

  console.log('Seeding leaderboard with bot players...');
  
  for (const bot of botPlayers) {
    try {
      await storage.upsertLeaderboardEntry({
        userId: bot.id,
        username: bot.username,
        displayName: bot.displayName,
        points: bot.points,
        level: bot.level,
        avatarData: bot.avatarData,
        isBot: bot.isBot,
        lastActivity: new Date()
      });
    } catch (error) {
      console.error(`Failed to create bot ${bot.username}:`, error);
    }
  }

  console.log(`Created ${botPlayers.length} bot players in leaderboard`);
}

// Simulate gradual bot activity - called periodically 
export async function updateBotActivity() {
  try {
    const bots = await storage.getLeaderboard(50);
    const activeBots = bots.filter(entry => entry.isBot);
    
    if (activeBots.length === 0) return;

    // Randomly select 1-3 bots to update
    const numBotsToUpdate = Math.floor(Math.random() * 3) + 1;
    const selectedBots = activeBots
      .sort(() => 0.5 - Math.random())
      .slice(0, numBotsToUpdate);

    for (const bot of selectedBots) {
      // Small random point increase (1-15 points)
      const pointsGain = Math.floor(Math.random() * 15) + 1;
      
      // Occasional level up if points are high enough
      const newPoints = bot.points + pointsGain;
      let newLevel = bot.level;
      if (newPoints > bot.level * 300 && Math.random() < 0.1) { // 10% chance to level up
        newLevel = Math.min(bot.level + 1, 20); // Cap at level 20
      }

      await storage.updateLeaderboardEntry(bot.userId, {
        points: newPoints,
        level: newLevel,
        lastActivity: new Date()
      });
    }

    console.log(`Updated ${selectedBots.length} bots with gradual point increases`);
  } catch (error) {
    console.error('Failed to update bot activity:', error);
  }
}

export async function updatePlayerStats(playerId, updates) {
  try {
    let existingEntry = await storage.getLeaderboardEntry(playerId);
    
    if (!existingEntry) {
      // Add new player to leaderboard
      const newEntry = {
        userId: playerId,
        username: updates.username || 'Anonymous',
        displayName: updates.displayName || 'Anonymous',
        level: updates.level || 1,
        points: updates.points || 0,
        avatarData: updates.avatarData || { backgroundColor: '#6B7280', style: 'casual' },
        isBot: false,
        lastActivity: new Date()
      };
      
      existingEntry = await storage.upsertLeaderboardEntry(newEntry);
    } else {
      // Update existing player
      existingEntry = await storage.updateLeaderboardEntry(playerId, {
        username: updates.username || existingEntry.username,
        displayName: updates.displayName || existingEntry.displayName,
        level: updates.level || existingEntry.level,
        points: updates.points || existingEntry.points,
        avatarData: updates.avatarData || existingEntry.avatarData,
        lastActivity: new Date()
      });
    }
    
    return existingEntry;
  } catch (error) {
    console.error('Failed to update player stats:', error);
    return null;
  }
}

export async function getLeaderboard(limit = 20) {
  try {
    const leaderboard = await storage.getLeaderboard(Math.min(limit, 50));
    return leaderboard
      .filter(entry => !entry.userId.startsWith('sb_') && entry.points > 0) // Exclude stealth bots and zero-point players
      .slice(0, Math.min(limit, 12)); // Cap at 12 to avoid showing zero-point players
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}