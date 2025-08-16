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
      
      // Check if we need to seed with bots for a more active appearance
      const leaderboard = await readLeaderboard();
      // Only seed if we have fewer than 12 players (all our bots have points)
      if (leaderboard.length < 12) {
        await seedLeaderboardWithBots();
      }
    } catch {
      // Create initial leaderboard with bot players
      await seedLeaderboardWithBots();
      console.log('Created new leaderboard file with initial bot players');
    }
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
  }
}

// Seed leaderboard with realistic bot players to make platform look active
async function seedLeaderboardWithBots() {
  const botPlayers = [
    {
      id: 'bot_lawbeast_99',
      username: 'LawBeast99',
      displayName: 'LawBeast99',
      lawSchool: 'Harvard Law',
      level: 15,
      points: 2850,
      totalWins: 47,
      totalLosses: 8,
      avatarData: {
        base: 'humanoid',
        palette: '#dc143c',
        props: ['gavel'],
        archetypeId: 'due-diligence-dragon'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_legal_eagle_420',
      username: 'LegalEagle420',
      displayName: 'LegalEagle420',
      lawSchool: 'Yale Law',
      level: 12,
      points: 2400,
      totalWins: 38,
      totalLosses: 12,
      avatarData: {
        base: 'beast',
        palette: '#4169e1',
        props: ['scales'],
        archetypeId: 'miranda-hawk'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_tort_master_x',
      username: 'TortMasterX',
      displayName: 'TortMasterX',
      lawSchool: 'Golden Gate Law',
      level: 18,
      points: 3200,
      totalWins: 56,
      totalLosses: 9,
      avatarData: {
        base: 'arcane',
        palette: '#8b008b',
        props: ['codex'],
        archetypeId: 'strict-scrutiny-sphinx'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_justice_ninja',
      username: 'JusticeNinja',
      displayName: 'JusticeNinja',
      lawSchool: 'Columbia Law',
      level: 14,
      points: 2650,
      totalWins: 42,
      totalLosses: 11,
      avatarData: {
        base: 'undead',
        palette: '#2e8b57',
        props: ['briefcase'],
        archetypeId: 'suppression-wraith'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_contracts_wizard',
      username: 'ContractsWizard',
      displayName: 'ContractsWizard',
      lawSchool: 'NYU Law',
      level: 16,
      points: 2950,
      totalWins: 49,
      totalLosses: 7,
      avatarData: {
        base: 'celestial',
        palette: '#ff69b4',
        props: ['law_diploma'],
        archetypeId: 'fiduciary-seraph'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_objection_hero',
      username: 'ObjectionHero',
      displayName: 'ObjectionHero',
      lawSchool: 'UChicago Law',
      level: 11,
      points: 2100,
      totalWins: 32,
      totalLosses: 15,
      avatarData: {
        base: 'construct',
        palette: '#ff8c00',
        props: ['gavel'],
        archetypeId: 'covenant-golem'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_gavel_crusher',
      username: 'GavelCrusher',
      displayName: 'GavelCrusher',
      lawSchool: 'UPenn Law',
      level: 17,
      points: 3100,
      totalWins: 52,
      totalLosses: 6,
      avatarData: {
        base: 'elemental',
        palette: '#dc143c',
        props: ['scales'],
        archetypeId: 'subpoena-phoenix'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_verdict_viper',
      username: 'VerdictViper',
      displayName: 'VerdictViper',
      lawSchool: 'Georgetown Law',
      level: 13,
      points: 2300,
      totalWins: 35,
      totalLosses: 13,
      avatarData: {
        base: 'alien',
        palette: '#32cd32',
        props: ['legal_pad'],
        archetypeId: 'viewpoint-viper'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_brief_sniper',
      username: 'BriefSniper',
      displayName: 'BriefSniper',
      lawSchool: 'Duke Law',
      level: 19,
      points: 3450,
      totalWins: 62,
      totalLosses: 8,
      avatarData: {
        base: 'humanoid',
        palette: '#9370db',
        props: ['briefcase'],
        archetypeId: 'whistleblower-wyvern'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_mbe_destroyer',
      username: 'MBEDestroyer',
      displayName: 'MBEDestroyer',
      lawSchool: 'Thomas Jefferson Law',
      level: 21,
      points: 3850,
      totalWins: 71,
      totalLosses: 5,
      avatarData: {
        base: 'construct',
        palette: '#ff4500',
        props: ['gavel', 'scales'],
        archetypeId: 'takeover-titan'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_statute_slayer',
      username: 'StatuteSlayer',
      displayName: 'StatuteSlayer',
      lawSchool: 'Berkeley Law',
      level: 10,
      points: 1850,
      totalWins: 28,
      totalLosses: 18,
      avatarData: {
        base: 'undead',
        palette: '#ff1493',
        props: ['codex'],
        archetypeId: 'brady-banshee'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'bot_precedent_pro',
      username: 'PrecedentPro',
      displayName: 'PrecedentPro',
      lawSchool: 'Cooley Law School',
      level: 20,
      points: 3700,
      totalWins: 67,
      totalLosses: 6,
      avatarData: {
        base: 'arcane',
        palette: '#1e90ff',
        props: ['law_diploma', 'briefcase'],
        archetypeId: 'equal-protection-paladin'
      },
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Sort by points descending
  botPlayers.sort((a, b) => b.points - a.points);
  await writeLeaderboard(botPlayers);
}

// Periodically update bot activity to make them appear more active
export async function updateBotActivity() {
  try {
    const leaderboard = await readLeaderboard();
    let updated = false;
    
    for (const player of leaderboard) {
      if (player.id.startsWith('bot_')) {
        // Randomly update bot stats occasionally (10% chance)
        if (Math.random() < 0.1) {
          // Small random point increases
          const pointIncrease = Math.floor(Math.random() * 50) + 10;
          player.points += pointIncrease;
          
          // Sometimes add a win
          if (Math.random() < 0.7) {
            player.totalWins += 1;
          } else {
            player.totalLosses += 1;
          }
          
          // Update level based on new points
          player.level = Math.floor(player.points / 200) + 1;
          player.lastActive = new Date().toISOString();
          updated = true;
        }
      }
    }
    
    if (updated) {
      // Sort by points descending
      leaderboard.sort((a, b) => b.points - a.points);
      await writeLeaderboard(leaderboard);
    }
  } catch (error) {
    console.error('Failed to update bot activity:', error);
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
      .filter(player => !player.id.startsWith('sb_') && player.points > 0) // Exclude stealth bots and zero-point players
      .slice(0, Math.min(limit, 12)); // Cap at 12 to avoid showing zero-point players
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
