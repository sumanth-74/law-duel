// Real-time leaderboard system that syncs across all connected players
import { WebSocket } from 'ws';
import { storage } from './storage';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  points: number;
  level: number;
  totalWins: number;
  totalLosses: number;
  rank: number;
}

export interface ChallengeRequest {
  challengerId: string;
  challengerName: string;
  targetUsername: string;
  subject: string;
  timestamp: Date;
  expiresAt: Date;
}

export class RealTimeLeaderboard {
  private connectedClients: Set<WebSocket> = new Set();
  private pendingChallenges: Map<string, ChallengeRequest> = new Map();
  private userSockets: Map<string, WebSocket> = new Map(); // userId -> WebSocket
  private lastUpdate: Date = new Date();
  private leaderboardCache: LeaderboardEntry[] = [];

  // Register a client connection
  addClient(ws: WebSocket, userId?: string) {
    this.connectedClients.add(ws);
    
    if (userId) {
      this.userSockets.set(userId, ws);
    }
    
    // Send current leaderboard immediately
    this.sendLeaderboardToClient(ws);
    
    ws.on('close', () => {
      this.connectedClients.delete(ws);
      if (userId) {
        this.userSockets.delete(userId);
      }
    });
  }

  // Update leaderboard and broadcast to all clients
  async updateAndBroadcast() {
    try {
      const players = await storage.getTopPlayers(20);
      
      this.leaderboardCache = players.map((player, index) => ({
        id: player.id,
        username: player.username,
        displayName: player.displayName || player.username,
        points: player.points,
        level: player.level,
        totalWins: player.totalWins,
        totalLosses: player.totalLosses,
        rank: index + 1
      }));
      
      this.broadcastLeaderboard();
      this.lastUpdate = new Date();
      
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
    }
  }

  // Broadcast leaderboard to all connected clients
  private broadcastLeaderboard() {
    const message = JSON.stringify({
      type: 'leaderboard:update',
      payload: {
        leaderboard: this.leaderboardCache,
        lastUpdate: this.lastUpdate.toISOString()
      }
    });
    
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send leaderboard to specific client
  private sendLeaderboardToClient(client: WebSocket) {
    if (client.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'leaderboard:update',
        payload: {
          leaderboard: this.leaderboardCache,
          lastUpdate: this.lastUpdate.toISOString()
        }
      });
      client.send(message);
    }
  }

  // Send friend challenge
  async sendFriendChallenge(challengerId: string, challengerName: string, targetUsername: string, subject: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find target user
      const targetUser = await storage.getUserByUsername(targetUsername);
      if (!targetUser) {
        return { success: false, message: "User not found" };
      }

      // Check if target is online
      const targetSocket = this.userSockets.get(targetUser.id);
      if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
        return { success: false, message: "User is not online" };
      }

      // Create challenge request
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const challenge: ChallengeRequest = {
        challengerId,
        challengerName,
        targetUsername,
        subject,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 60000) // 1 minute expiry
      };

      this.pendingChallenges.set(challengeId, challenge);

      // Send challenge notification to target user
      targetSocket.send(JSON.stringify({
        type: 'challenge:received',
        payload: {
          challengeId,
          challengerName,
          subject,
          expiresAt: challenge.expiresAt.toISOString()
        }
      }));

      // Auto-expire challenge after 1 minute
      setTimeout(() => {
        if (this.pendingChallenges.has(challengeId)) {
          this.pendingChallenges.delete(challengeId);
          
          // Notify challenger about expiry
          const challengerSocket = this.userSockets.get(challengerId);
          if (challengerSocket?.readyState === WebSocket.OPEN) {
            challengerSocket.send(JSON.stringify({
              type: 'challenge:expired',
              payload: { challengeId, targetUsername }
            }));
          }
        }
      }, 60000);

      return { success: true, message: "Challenge sent successfully" };

    } catch (error) {
      console.error('Failed to send friend challenge:', error);
      return { success: false, message: "Failed to send challenge" };
    }
  }

  // Handle challenge response
  async handleChallengeResponse(challengeId: string, accepted: boolean, responderId: string): Promise<{ success: boolean; message: string }> {
    const challenge = this.pendingChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, message: "Challenge not found or expired" };
    }

    // Remove challenge from pending list
    this.pendingChallenges.delete(challengeId);

    const challengerSocket = this.userSockets.get(challenge.challengerId);
    const responderSocket = this.userSockets.get(responderId);

    if (accepted) {
      // Both players accepted - start the duel
      const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Notify both players about match start
      const matchData = {
        type: 'duel:friend_match_start',
        payload: {
          duelId,
          subject: challenge.subject,
          opponent: {
            challengerId: challenge.challengerId,
            challengerName: challenge.challengerName,
            responderId,
          }
        }
      };

      if (challengerSocket?.readyState === WebSocket.OPEN) {
        challengerSocket.send(JSON.stringify(matchData));
      }
      
      if (responderSocket?.readyState === WebSocket.OPEN) {
        responderSocket.send(JSON.stringify(matchData));
      }

      return { success: true, message: "Match starting!" };
    } else {
      // Challenge declined
      if (challengerSocket?.readyState === WebSocket.OPEN) {
        challengerSocket.send(JSON.stringify({
          type: 'challenge:declined',
          payload: { challengeId, targetUsername: challenge.targetUsername }
        }));
      }

      return { success: true, message: "Challenge declined" };
    }
  }

  // Get current leaderboard (cached)
  getLeaderboard(): LeaderboardEntry[] {
    return this.leaderboardCache;
  }

  // Get connection stats
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      registeredUsers: this.userSockets.size,
      pendingChallenges: this.pendingChallenges.size,
      lastUpdate: this.lastUpdate
    };
  }

  // Clean up expired challenges
  cleanupExpiredChallenges() {
    const now = new Date();
    const expired: string[] = [];
    
    for (const [challengeId, challenge] of this.pendingChallenges.entries()) {
      if (now > challenge.expiresAt) {
        expired.push(challengeId);
      }
    }
    
    expired.forEach(challengeId => {
      this.pendingChallenges.delete(challengeId);
    });
  }
}

export const realTimeLeaderboard = new RealTimeLeaderboard();

// Clean up expired challenges every 30 seconds
setInterval(() => {
  realTimeLeaderboard.cleanupExpiredChallenges();
}, 30000);