import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { questionBank } from '../questionBank.js';
import { storage } from '../storage.js';

const ASYNC_MATCHES_FILE = path.join(process.cwd(), 'data/async_matches.json');
const ASYNC_QUEUE_FILE = path.join(process.cwd(), 'data/async_queue.json');

class AsyncDuels {
  constructor() {
    this.matches = this.loadMatches();
    this.queues = this.loadQueues();
    this.notifications = new Map(); // userId -> count
    
    // Start background tasks
    this.startDeadlineChecker();
    this.startBotAnswerProcessor();
  }

  loadMatches() {
    try {
      return JSON.parse(readFileSync(ASYNC_MATCHES_FILE, 'utf8'));
    } catch (error) {
      return {};
    }
  }

  saveMatches() {
    try {
      // Atomic write with backup
      const tempFile = ASYNC_MATCHES_FILE + '.tmp';
      writeFileSync(tempFile, JSON.stringify(this.matches, null, 2));
      writeFileSync(ASYNC_MATCHES_FILE, JSON.stringify(this.matches, null, 2));
      
      // Keep backup every 20 writes
      if (Object.keys(this.matches).length % 20 === 0) {
        writeFileSync(ASYNC_MATCHES_FILE + '.bak', JSON.stringify(this.matches, null, 2));
      }
    } catch (error) {
      console.error('Failed to save async matches:', error);
    }
  }

  loadQueues() {
    try {
      return JSON.parse(readFileSync(ASYNC_QUEUE_FILE, 'utf8'));
    } catch (error) {
      return {}; // subject -> [userId]
    }
  }

  saveQueues() {
    try {
      writeFileSync(ASYNC_QUEUE_FILE, JSON.stringify(this.queues, null, 2));
    } catch (error) {
      console.error('Failed to save async queues:', error);
    }
  }

  generateMatchId() {
    return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create new async match
  async createMatch(userId, subject, opponentUsername = null) {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const matchId = this.generateMatchId();
    
    let opponent = null;
    let isBotMatch = false;

    if (opponentUsername) {
      // Direct challenge by username
      opponent = await storage.getUserByUsername(opponentUsername.replace('@', ''));
      if (!opponent) throw new Error('Opponent not found');
    } else {
      // Quick Match - check queue first
      const queueKey = `${subject}_Bar`; // Assume Bar for now
      if (!this.queues[queueKey]) this.queues[queueKey] = [];

      if (this.queues[queueKey].length > 0) {
        // Match with queued player
        const opponentId = this.queues[queueKey].shift();
        opponent = await storage.getUser(opponentId);
        this.saveQueues();
      } else {
        // Add to queue, wait 8s for match
        this.queues[queueKey].push(userId);
        this.saveQueues();

        // Wait 8s for another player
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        if (this.queues[queueKey].length > 1) {
          // Found a match
          this.queues[queueKey] = this.queues[queueKey].filter(id => id !== userId);
          const opponentId = this.queues[queueKey].shift();
          opponent = await storage.getUser(opponentId);
          this.saveQueues();
        } else {
          // No match - create stealth bot
          this.queues[queueKey] = this.queues[queueKey].filter(id => id !== userId);
          this.saveQueues();
          
          opponent = this.createStealthBot();
          isBotMatch = true;
        }
      }
    }

    if (!opponent) {
      opponent = this.createStealthBot();
      isBotMatch = true;
    }

    const match = {
      id: matchId,
      mode: 'async',
      subject,
      audience: 'Bar',
      bestOf: 7,
      players: [
        { id: userId, username: user.username },
        { id: opponent.id, username: opponent.username }
      ],
      scores: { [userId]: 0, [opponent.id]: 0 },
      round: 1,
      turns: [],
      status: 'active',
      winnerId: null,
      isBotMatch,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.matches[matchId] = match;
    
    // Start first turn
    await this.startTurn(matchId);
    
    this.saveMatches();
    
    // Notify both players
    this.enqueueNotification(userId, `New async match vs @${opponent.username}`);
    if (!isBotMatch) {
      this.enqueueNotification(opponent.id, `New async match vs @${user.username}`);
    }

    return { matchId, match };
  }

  createStealthBot() {
    const humanNames = [
      'LegalEagle47', 'JuristJoe', 'BarExamAce', 'LawScholar99', 'AttorneyAtLaw',
      'CounselorCat', 'LegalBeagle', 'JudgeJudy42', 'BarPasser', 'LawStudent2024',
      'ConLawExpert', 'TortsGuru', 'EvidenceNinja', 'ContractKing', 'CivilProcAce'
    ];

    return {
      id: `bot_${Date.now()}`,
      username: humanNames[Math.floor(Math.random() * humanNames.length)],
      displayName: humanNames[Math.floor(Math.random() * humanNames.length)],
      isBot: true,
      level: Math.floor(Math.random() * 5) + 2,
      points: Math.floor(Math.random() * 1000) + 200
    };
  }

  async startTurn(matchId) {
    const match = this.matches[matchId];
    if (!match || match.status !== 'active') return;

    try {
      // Generate question for this round
      const question = questionBank.getCachedQuestion(match.subject);
      
      if (!question) {
        console.error('Failed to generate question for match:', matchId);
        return;
      }

      const turn = {
        qid: question.id,
        stem: question.stem,
        choices: question.choices,
        deadlineTs: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        answers: {},
        revealed: false,
        correctIndex: question.correctIndex,
        explanation: question.explanation
      };

      match.turns.push(turn);
      match.updatedAt = Date.now();

      // Schedule bot answer if this is a bot match
      if (match.isBotMatch) {
        this.scheduleBotAnswer(matchId, match.round);
      }

      this.saveMatches();

      // Notify players it's their turn
      match.players.forEach(player => {
        if (!player.id.startsWith('bot_')) {
          this.enqueueNotification(player.id, `Your turn vs @${this.getOpponent(match, player.id).username} · Round ${match.round}`);
        }
      });

    } catch (error) {
      console.error('Failed to start turn:', error);
    }
  }

  scheduleBotAnswer(matchId, round) {
    // Random delay between 8-45 minutes + jitter
    const delayMs = (8 + Math.random() * 37) * 60 * 1000 + Math.random() * 5000;
    
    setTimeout(async () => {
      const match = this.matches[matchId];
      if (!match || match.round !== round || match.status !== 'active') return;

      const currentTurn = match.turns[match.turns.length - 1];
      if (!currentTurn || currentTurn.revealed) return;

      const botPlayer = match.players.find(p => p.id.startsWith('bot_'));
      if (!botPlayer) return;

      // Bot accuracy based on match difficulty (70% base with variance)
      const accuracy = 0.65 + Math.random() * 0.2; // 65-85%
      const isCorrect = Math.random() < accuracy;
      const answerIndex = isCorrect ? currentTurn.correctIndex : Math.floor(Math.random() * 4);
      const responseTime = Math.random() * 15000 + 5000; // 5-20 seconds

      await this.submitAnswer(matchId, botPlayer.id, answerIndex, responseTime);
    }, delayMs);
  }

  async submitAnswer(matchId, userId, answerIndex, responseTimeMs) {
    const match = this.matches[matchId];
    if (!match || match.status !== 'active') {
      throw new Error('Match not found or not active');
    }

    // Verify user is in this match
    const isPlayerInMatch = match.players.some(p => p.id === userId);
    if (!isPlayerInMatch) {
      throw new Error('User not in this match');
    }

    const currentTurn = match.turns[match.turns.length - 1];
    if (!currentTurn) {
      throw new Error('No active turn');
    }

    // Check if already answered
    if (currentTurn.answers[userId]) {
      throw new Error('Already answered this turn');
    }

    // Check deadline
    if (Date.now() > currentTurn.deadlineTs) {
      throw new Error('Turn deadline passed');
    }

    // Record answer
    currentTurn.answers[userId] = {
      idx: answerIndex,
      ms: responseTimeMs,
      timestamp: Date.now()
    };

    match.updatedAt = Date.now();

    // Check if both players have answered
    const allAnswered = match.players.every(p => currentTurn.answers[p.id]);

    if (allAnswered) {
      await this.revealTurn(matchId);
    }

    this.saveMatches();
    return match;
  }

  async revealTurn(matchId) {
    const match = this.matches[matchId];
    const currentTurn = match.turns[match.turns.length - 1];
    
    // Mark turn as revealed
    currentTurn.revealed = true;

    // Score the turn
    const correctAnswers = [];
    const incorrectAnswers = [];

    for (const player of match.players) {
      const answer = currentTurn.answers[player.id];
      if (answer && answer.idx === currentTurn.correctIndex) {
        correctAnswers.push({ ...player, ...answer });
      } else {
        incorrectAnswers.push({ ...player, ...answer });
      }
    }

    // Determine round winner
    let roundWinnerId = null;
    if (correctAnswers.length === 1) {
      roundWinnerId = correctAnswers[0].id;
    } else if (correctAnswers.length === 2) {
      // Both correct, fastest wins
      roundWinnerId = correctAnswers.reduce((a, b) => a.ms < b.ms ? a : b).id;
    }

    // Update scores
    if (roundWinnerId) {
      match.scores[roundWinnerId]++;
    }

    match.round++;
    match.updatedAt = Date.now();

    // Check if match is over
    const winningScore = Math.ceil(match.bestOf / 2);
    const winnerId = Object.keys(match.scores).find(id => match.scores[id] >= winningScore);

    if (winnerId) {
      match.status = 'over';
      match.winnerId = winnerId;
      await this.finalizeMatch(matchId);
    } else if (match.round <= match.bestOf) {
      // Start next turn
      setTimeout(() => this.startTurn(matchId), 2000);
    }

    // Notify players of results
    const opponent = this.getOpponent(match, match.players[0].id);
    match.players.forEach(player => {
      if (!player.id.startsWith('bot_')) {
        if (match.status === 'over') {
          const won = match.winnerId === player.id;
          this.enqueueNotification(player.id, `Match ${won ? 'won' : 'lost'} vs @${this.getOpponent(match, player.id).username}`);
        } else {
          this.enqueueNotification(player.id, `Round ${match.round - 1} results vs @${this.getOpponent(match, player.id).username}`);
        }
      }
    });

    this.saveMatches();
  }

  async finalizeMatch(matchId) {
    const match = this.matches[matchId];
    const winnerId = match.winnerId;
    const loserId = match.players.find(p => p.id !== winnerId).id;

    // Apply ladder points (+25/-25) only for human players
    if (!winnerId.startsWith('bot_')) {
      await storage.updateUserStats(winnerId, true, 50, 25); // Winner gets points + XP
    }
    
    if (!loserId.startsWith('bot_')) {
      await storage.updateUserStats(loserId, false, 25, -25); // Loser loses points, gets some XP
    }
  }

  getOpponent(match, userId) {
    return match.players.find(p => p.id !== userId);
  }

  // Get user's inbox - only friend challenges, no bot matches
  getUserInbox(userId) {
    const userMatches = Object.values(this.matches).filter(match => 
      match.players.some(p => p.id === userId) && !match.isBotMatch
    );

    return userMatches.map(match => {
      const opponent = this.getOpponent(match, userId);
      const currentTurn = match.turns[match.turns.length - 1];
      const yourTurn = currentTurn && !currentTurn.answers[userId] && !currentTurn.revealed;
      const timeLeft = currentTurn ? Math.max(0, currentTurn.deadlineTs - Date.now()) : 0;

      return {
        id: match.id,
        subject: match.subject,
        opponent: opponent ? opponent.username : 'Unknown',
        round: match.round,
        status: match.status,
        yourTurn,
        timeLeft,
        scores: match.scores,
        updatedAt: match.updatedAt
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get full match state (filtered for user)
  getMatchForUser(matchId, userId) {
    const match = this.matches[matchId];
    if (!match) return null;

    // Verify user is in this match
    const isPlayerInMatch = match.players.some(p => p.id === userId);
    if (!isPlayerInMatch) return null;

    // Filter sensitive data
    const filteredTurns = match.turns.map(turn => {
      if (turn.revealed) {
        return turn; // Show everything if revealed
      } else {
        // Hide correct answer and opponent's answer if not revealed
        return {
          qid: turn.qid,
          stem: turn.stem,
          choices: turn.choices,
          deadlineTs: turn.deadlineTs,
          answers: { [userId]: turn.answers[userId] }, // Only show user's answer
          revealed: turn.revealed
        };
      }
    });

    return {
      ...match,
      turns: filteredTurns
    };
  }

  async resignMatch(matchId, userId) {
    const match = this.matches[matchId];
    if (!match || match.status !== 'active') {
      throw new Error('Match not found or not active');
    }

    // Verify user is in this match
    const isPlayerInMatch = match.players.some(p => p.id === userId);
    if (!isPlayerInMatch) {
      throw new Error('User not in this match');
    }

    // Set opponent as winner
    const opponent = this.getOpponent(match, userId);
    match.status = 'over';
    match.winnerId = opponent.id;
    match.updatedAt = Date.now();

    await this.finalizeMatch(matchId);
    this.saveMatches();

    return match;
  }

  // Notification system
  enqueueNotification(userId, text) {
    const current = this.notifications.get(userId) || 0;
    this.notifications.set(userId, current + 1);
    
    // TODO: Wire to email/push later
    console.log(`Notification for ${userId}: ${text}`);
  }

  getUnreadCount(userId) {
    return this.notifications.get(userId) || 0;
  }

  clearNotifications(userId) {
    this.notifications.set(userId, 0);
  }

  // Background tasks
  startDeadlineChecker() {
    setInterval(() => {
      this.checkDeadlines();
    }, 60000); // Check every minute
  }

  checkDeadlines() {
    const now = Date.now();
    let matchesUpdated = false;

    Object.values(this.matches).forEach(match => {
      if (match.status !== 'active') return;

      const currentTurn = match.turns[match.turns.length - 1];
      if (!currentTurn || currentTurn.revealed) return;

      if (now > currentTurn.deadlineTs) {
        // Deadline passed - forfeit round to players who answered
        const answeredPlayers = Object.keys(currentTurn.answers);
        const unansweredPlayers = match.players.filter(p => !currentTurn.answers[p.id]);

        if (answeredPlayers.length === 1) {
          // One player answered, they win the round
          const winnerId = answeredPlayers[0];
          match.scores[winnerId]++;
        }
        // If neither answered, no one gets the point

        // Check for forfeit (2 missed rounds or 48h total)
        // This is simplified - you'd track missed rounds per player
        
        this.revealTurn(match.id);
        matchesUpdated = true;
      }
    });

    if (matchesUpdated) {
      this.saveMatches();
    }
  }

  startBotAnswerProcessor() {
    // Bot answers are scheduled individually, no global processor needed
  }
}

export default new AsyncDuels();