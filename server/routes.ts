import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import MemoryStore from "memorystore";
import path from "path";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { statsService } from "./services/statsService";
import { registerPresence, startMatchmaking, handleDuelAnswer, handleHintRequest } from "./services/matchmaker.js";
import { initializeQuestionCoordinator } from "./services/qcoordinator.js";
import { initializeLeaderboard, updateBotActivity } from "./services/leaderboard.js";
import { generateMBEItem } from "./services/mbeGenerator";
import { questionBank, type CachedQuestion } from './questionBank';
import { retentionOptimizer } from './retentionOptimizer';
import { realTimeLeaderboard } from './realTimeLeaderboard';
import streakManager from './services/streakManager.js';
import asyncDuels from './services/async.js';
import { dailyCasefileService } from './services/dailyCasefileService';

// Initialize bot practice system
import { BotPractice } from './services/botPractice.js';
const botPractice = new BotPractice();

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const MemStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    store: new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Health check endpoint for OpenAI
  app.get("/health/openai", async (req, res) => {
    try {
      const { healthCheck } = await import("./services/robustGenerator.js");
      const result = await healthCheck();
      return res.status(result.ok ? 200 : 500).json(result);
    } catch (e) {
      console.error("OpenAI health check failed:", e);
      return res.status(500).json({ 
        ok: false, 
        error: e.message
      });
    }
  });

  // Fresh question generation endpoint - always generates new questions
  app.get("/question", async (req, res) => {
    // Force no-cache headers
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    try {
      const requestedSubject = req.query.subject;
      const subjects = ['Civil Procedure', 'Constitutional Law', 'Contracts', 'Criminal Law', 'Evidence', 'Property', 'Torts'];
      
      // Pick random subject if not specified or if "Mix" requested
      const subject = (requestedSubject && subjects.includes(requestedSubject as string)) 
        ? requestedSubject as string 
        : subjects[Math.floor(Math.random() * subjects.length)];
      
      // Generate fresh question using the proven system
      const { generateFreshQuestion } = await import("./services/robustGenerator.js");
      const question = await generateFreshQuestion(subject);
      
      // Log the generated question details for debugging
      console.log(`🔍 Generated question correctIndex: ${question.correctIndex}`);
      console.log(`🔍 Generated question choices count: ${question.choices.length}`);
      
      // Don't leak the answer to client - keep correctIndex on server for validation
      const { correctIndex, ...safeQuestion } = question;
      const item = {
        ...safeQuestion,
        timeLimitSec: 60, // Always 60 seconds
        id: question.qid
      };
      
      console.log(`📤 Serving fresh question: ${item.id} for ${subject} (answer: ${correctIndex})`);
      return res.json({ item });
      
    } catch (error) {
      console.error("Question generation failed:", error);
      return res.status(500).json({ 
        error: "Failed to generate fresh question",
        message: error.message 
      });
    }
  });

  // Initialize services
  await initializeQuestionCoordinator();
  await initializeLeaderboard();
  
  // Initialize real-time leaderboard updates
  setInterval(async () => {
    await realTimeLeaderboard.updateAndBroadcast();
  }, 30000); // Update every 30 seconds

  // Periodically update bot activity for more dynamic leaderboard
  setInterval(async () => {
    await updateBotActivity();
  }, 5 * 60 * 1000); // Update bot activity every 5 minutes

  // Authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }

  // Check username availability
  app.post("/api/auth/check-username", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string' || username.trim().length < 2) {
        return res.status(400).json({ message: "Username must be at least 2 characters" });
      }

      const cleanUsername = username.trim();
      
      // Check if username is taken
      const existing = await storage.getUserByUsername(cleanUsername);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      res.json({ message: "Username available", username: cleanUsername });
    } catch (error: any) {
      console.error("Username check error:", error);
      res.status(400).json({ message: "Failed to check username" });
    }
  });

  // Full registration with password and character data
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      const { confirmPassword, ...userInsert } = userData;
      
      // Check if username is taken
      const existing = await storage.getUserByUsername(userData.username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const user = await storage.createUser(userInsert);
      
      // Initialize user stats
      await statsService.initializeUserStats(user.id);
      
      // Auto-login after registration
      (req.session as any).userId = user.id;
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid user data", error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(credentials.username, credentials.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      (req.session as any).userId = user.id;
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid credentials", error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get user", error: error.message });
    }
  });

  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch user", error: error.message });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      // Ensure user can only update their own profile
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden: Can only update your own profile" });
      }

      const updates = req.body;
      const user = await storage.updateUser(req.params.id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update user", error: error.message });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const players = await storage.getTopPlayers(limit);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard", error: error.message });
    }
  });

  // Update user stats after duel
  app.patch('/api/users/:id/stats', requireAuth, async (req: any, res) => {
    try {
      // Ensure user can only update their own stats
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden: Can only update your own stats" });
      }
      
      const { won, xpGained, pointsChange, streakData, opponentId } = req.body;
      
      // Calculate hot streaks and loss shield if opponent provided
      let finalPointsChange = pointsChange;
      let finalStreakData = streakData;
      
      if (opponentId) {
        const result = streakManager.calculateMatchResults(
          won ? req.params.id : opponentId,
          won ? opponentId : req.params.id
        );
        
        finalPointsChange = won ? result.winner.pointsDelta : result.loser.pointsDelta;
        finalStreakData = won ? result.winner : result.loser;
      }
      
      const user = await storage.updateUserStats(req.params.id, won, xpGained, finalPointsChange, finalStreakData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      console.error("Error updating user stats:", error);
      res.status(500).json({ message: "Failed to update user stats", error: error.message });
    }
  });

  // Get Atticus memory hook
  app.get('/api/memory-hook/:id', requireAuth, async (req: any, res) => {
    try {
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const memoryHook = streakManager.getMemoryHook(req.params.id);
      res.json({ hook: memoryHook });
    } catch (error) {
      console.error("Error getting memory hook:", error);
      res.status(500).json({ message: "Failed to get memory hook" });
    }
  });

  // Get tier information
  app.get('/api/tier-info/:points', requireAuth, async (req: any, res) => {
    try {
      const points = parseInt(req.params.points) || 0;
      const tierInfo = streakManager.getTierInfo(points);
      res.json(tierInfo);
    } catch (error) {
      console.error("Error getting tier info:", error);
      res.status(500).json({ message: "Failed to get tier info" });
    }
  });

  // === PLAYER STATS ROUTES ===
  
  // Get current user's comprehensive stats
  app.get('/api/stats/me', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await statsService.getUserStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch stats", error: error.message });
    }
  });

  // Get any user's public stats
  app.get('/api/stats/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await statsService.getPublicStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching public stats:", error);
      if (error.message === 'User not found') {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(500).json({ message: "Failed to fetch stats", error: error.message });
      }
    }
  });

  // Get overall leaderboard with stats
  app.get('/api/stats/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await statsService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching stats leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard", error: error.message });
    }
  });

  // Get subject-specific leaderboard
  app.get('/api/stats/leaderboard/:subject', async (req, res) => {
    try {
      const { subject } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await statsService.getSubjectLeaderboard(subject as any, limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching subject leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch subject leaderboard", error: error.message });
    }
  });

  // Record question attempt (called during/after matches)
  app.post('/api/stats/question-attempt', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { 
        questionId, 
        subject, 
        selectedAnswer, 
        correctAnswer, 
        timeSpent, 
        difficulty,
        matchId 
      } = req.body;
      
      const isCorrect = selectedAnswer === correctAnswer;
      
      await statsService.recordQuestionAttempt(
        userId,
        questionId,
        subject,
        selectedAnswer,
        correctAnswer,
        isCorrect,
        timeSpent,
        difficulty,
        matchId
      );
      
      res.json({ success: true, isCorrect });
    } catch (error: any) {
      console.error("Error recording question attempt:", error);
      res.status(500).json({ message: "Failed to record attempt", error: error.message });
    }
  });

  // Initialize stats for existing users (migration endpoint)
  app.post('/api/stats/initialize', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await statsService.initializeUserStats(userId);
      res.json({ success: true, message: "Stats initialized" });
    } catch (error: any) {
      console.error("Error initializing stats:", error);
      res.status(500).json({ message: "Failed to initialize stats", error: error.message });
    }
  });

  // User search by username (for stats lookup)
  app.post("/api/auth/search", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const user = await storage.getUserByUsername(username.trim());
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return public user info only
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error: any) {
      console.error("Error searching for user:", error);
      res.status(500).json({ message: "Failed to search for user", error: error.message });
    }
  });

  // === BOT PRACTICE ROUTES (Instant Practice) ===
  
  // Create instant bot practice match
  app.post('/api/practice/start', requireAuth, async (req: any, res) => {
    try {
      const { subject } = req.body;
      const userId = req.session.userId;
      
      const practiceSession = await botPractice.createPracticeMatch(userId, subject);
      res.json(practiceSession);
    } catch (error: any) {
      console.error('Error creating practice match:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Submit answer to practice match
  app.post('/api/practice/answer', requireAuth, async (req: any, res) => {
    try {
      const { practiceSession, userAnswer, responseTime } = req.body;
      
      const result = await botPractice.submitAnswer(practiceSession, userAnswer, responseTime);
      res.json(result);
    } catch (error: any) {
      console.error('Error submitting practice answer:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // === SOLO CHALLENGE ROUTES ===
  
  // Import solo challenge service
  const { soloChallengeService } = await import("./services/soloChallengeService.js");
  
  // Get solo challenge status
  app.get('/api/solo-challenge/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const status = soloChallengeService.getChallengeStatus(userId);
      res.json(status);
    } catch (error: any) {
      console.error("Error getting solo challenge status:", error);
      res.status(500).json({ message: "Failed to get challenge status", error: error.message });
    }
  });

  // Start a new solo challenge
  app.post('/api/solo-challenge/start', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { subject } = req.body;
      
      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }

      const result = await soloChallengeService.startChallenge(userId, subject);
      res.json(result);
    } catch (error: any) {
      console.error("Error starting solo challenge:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Submit answer to solo challenge
  app.post('/api/solo-challenge/answer', requireAuth, async (req: any, res) => {
    try {
      const { challengeId, questionId, userAnswer } = req.body;
      
      if (challengeId === undefined || questionId === undefined || userAnswer === undefined) {
        return res.status(400).json({ message: "challengeId, questionId, and userAnswer are required" });
      }

      const result = await soloChallengeService.submitAnswer(challengeId, questionId, userAnswer);
      res.json(result);
    } catch (error: any) {
      console.error("Error submitting solo challenge answer:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get next question for solo challenge
  app.post('/api/solo-challenge/next-question', requireAuth, async (req: any, res) => {
    try {
      const { challengeId } = req.body;
      
      if (!challengeId) {
        return res.status(400).json({ message: "challengeId is required" });
      }

      const question = await soloChallengeService.getNextQuestion(challengeId);
      res.json(question);
    } catch (error: any) {
      console.error("Error getting next solo challenge question:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Restore lives with payment (monetization)
  app.post('/api/solo-challenge/restore-lives', requireAuth, async (req: any, res) => {
    try {
      const { challengeId } = req.body;
      
      if (!challengeId) {
        return res.status(400).json({ message: "challengeId is required" });
      }

      // In real implementation, verify payment here
      const result = await soloChallengeService.restoreLives(challengeId);
      res.json(result);
    } catch (error: any) {
      console.error("Error restoring lives:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // === ASYNC DUELS ROUTES (Friend Challenges Only) ===

  // Create async match with friend
  app.post('/api/async/create', requireAuth, async (req: any, res) => {
    try {
      const { subject, opponentUsername } = req.body;
      const userId = req.session.userId;
      
      // Only allow friend challenges - no bot matches
      if (!opponentUsername) {
        return res.status(400).json({ message: 'Opponent username required for friend challenges' });
      }
      
      const result = await asyncDuels.createMatch(userId, subject, opponentUsername);
      res.json(result);
    } catch (error: any) {
      console.error('Error creating async match:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get user's async inbox
  app.get('/api/async/inbox', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const inbox = asyncDuels.getUserInbox(userId);
      const unreadCount = asyncDuels.getUnreadCount(userId);
      
      res.json({ matches: inbox, unreadCount });
    } catch (error) {
      console.error('Error getting inbox:', error);
      res.status(500).json({ message: 'Failed to get inbox' });
    }
  });

  // Get specific async match
  app.get('/api/async/match/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const matchId = req.params.id;
      
      const match = asyncDuels.getMatchForUser(matchId, userId);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      
      res.json(match);
    } catch (error) {
      console.error('Error getting match:', error);
      res.status(500).json({ message: 'Failed to get match' });
    }
  });

  // Submit answer to async match
  app.post('/api/async/answer', requireAuth, async (req: any, res) => {
    try {
      const { matchId, answerIndex, responseTime } = req.body;
      const userId = req.session.userId;
      
      const match = await asyncDuels.submitAnswer(matchId, userId, answerIndex, responseTime);
      res.json({ success: true, match });
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Resign from async match
  app.post('/api/async/resign', requireAuth, async (req: any, res) => {
    try {
      const { matchId } = req.body;
      const userId = req.session.userId;
      
      const match = await asyncDuels.resignMatch(matchId, userId);
      res.json({ success: true, match });
    } catch (error: any) {
      console.error('Error resigning match:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Clear notifications
  app.post('/api/async/notifications/clear', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      asyncDuels.clearNotifications(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ message: 'Failed to clear notifications' });
    }
  });

  // Admin endpoint to test question generation
  app.post("/api/admin/generate-question", async (req, res) => {
    try {
      const { subject, topic, subtopic, rule } = req.body;
      
      if (!subject || !topic) {
        return res.status(400).json({ error: "subject and topic are required" });
      }

      const topicConfig = {
        subject: subject || "Evidence",
        topic: topic || "Hearsay",
        subtopic: subtopic || undefined,
        rule: rule || "prior identification non-hearsay"
      };

      const item = await generateMBEItem(topicConfig);
      res.json({ success: true, item });
      
    } catch (error: any) {
      console.error("Admin question generation failed:", error);
      
      if (error.message === 'QUOTA_EXCEEDED') {
        return res.status(429).json({ 
          error: "OpenAI API quota exceeded", 
          message: "Please add credits to your OpenAI account or update the API key"
        });
      }
      
      if (error.message === 'INVALID_API_KEY') {
        return res.status(401).json({ 
          error: "Invalid OpenAI API key", 
          message: "Please check your API key configuration"
        });
      }
      
      res.status(500).json({ 
        error: "Question generation failed", 
        message: error.message 
      });
    }
  });

  // Question bank stats for monitoring
  app.get('/api/admin/question-stats', requireAuth, async (req, res) => {
    try {
      const stats = questionBank.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get question stats" });
    }
  });

  // Retention metrics for optimization
  app.get('/api/admin/retention-metrics', requireAuth, async (req, res) => {
    try {
      const metrics = retentionOptimizer.getRetentionMetrics();
      const suggestions = retentionOptimizer.getOptimizationSuggestions();
      res.json({ metrics, suggestions });
    } catch (error) {
      res.status(500).json({ message: "Failed to get retention metrics" });
    }
  });

  // Send friend challenge
  app.post('/api/challenge/send', requireAuth, async (req: any, res) => {
    try {
      const { targetUsername, subject } = req.body;
      const challengerId = req.session.userId;
      
      const challenger = await storage.getUser(challengerId);
      if (!challenger) {
        return res.status(404).json({ message: "Challenger not found" });
      }

      const result = await realTimeLeaderboard.sendFriendChallenge(
        challengerId,
        challenger.displayName || challenger.username,
        targetUsername,
        subject
      );

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error sending challenge:", error);
      res.status(500).json({ message: "Failed to send challenge" });
    }
  });

  // Respond to friend challenge
  app.post('/api/challenge/respond', requireAuth, async (req: any, res) => {
    try {
      const { challengeId, accepted } = req.body;
      const responderId = req.session.userId;

      const result = await realTimeLeaderboard.handleChallengeResponse(
        challengeId,
        accepted,
        responderId
      );

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error responding to challenge:", error);
      res.status(500).json({ message: "Failed to respond to challenge" });
    }
  });

  // Get user matches
  app.get("/api/users/:id/matches", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const matches = await storage.getUserMatches(req.params.id, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches", error: error.message });
    }
  });



  // Serve archetypes data
  app.get("/api/archetypes", (req, res) => {
    res.sendFile(path.join(process.cwd(), "client/public/archetypes.json"));
  });

  // === DAILY CASEFILE ROUTES ===
  
  // Get today's daily question
  app.get("/api/daily-question", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const result = await dailyCasefileService.getTodaysQuestion(userId);
      res.json(result);
    } catch (error) {
      console.error("Error getting daily question:", error);
      res.status(500).json({ message: "Failed to get daily question" });
    }
  });

  // Submit daily answer
  app.post("/api/daily-answer", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { questionId, choiceIndex } = req.body;
      
      if (!questionId || typeof choiceIndex !== 'number') {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const result = await dailyCasefileService.submitDailyAnswer(userId, questionId, choiceIndex);
      res.json(result);
    } catch (error: any) {
      console.error("Error submitting daily answer:", error);
      if (error.message === 'Daily question already attempted today') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Get daily streak info
  app.get("/api/daily-streak", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const streakInfo = await dailyCasefileService.getDailyStreakInfo(userId);
      res.json(streakInfo);
    } catch (error) {
      console.error("Error getting daily streak:", error);
      res.status(500).json({ message: "Failed to get streak info" });
    }
  });

  // === DUEL API ENDPOINTS ===
  
  // Duel state storage
  const duelStorage = new Map();
  const testQuestionStorage = new Map(); // Store questions for answer validation
  const CANONICAL_SUBJECTS = ['Civil Procedure', 'Constitutional Law', 'Contracts', 'Criminal Law', 'Evidence', 'Property', 'Torts'];

  // Helper functions for duel management
  function normalizeChoices(raw) {
    if (!Array.isArray(raw) || raw.length !== 4) throw new Error("Need exactly 4 choices");
    const cleaned = raw.map(s => String(s || "").replace(/^\s*[A-D][\)\].:\-]\s*/i, "").trim());
    if (cleaned.some(c => c.length < 6)) throw new Error("Choices too short");
    if (new Set(cleaned.map(c => c.toLowerCase())).size < 4) throw new Error("Duplicate choices");
    return cleaned;
  }

  function fingerprintStem(stem) {
    const crypto = require('crypto');
    return crypto.createHash("sha1")
      .update(String(stem).toLowerCase().replace(/\s+/g, " "))
      .digest("hex");
  }

  // Test duel state management  
  const testDuels = new Map();
  
  // Helper to check if round is finished
  function isRoundFinished(duel, r) {
    const q = duel.q[r];
    if (!q) return true;
    const timeout = Date.now() > q.endsAt;
    const playerDone = Boolean(duel.answers['test_player']?.[r]);
    return timeout || playerDone;
  }

  // Public test endpoint for duel questions (no auth required)
  app.post("/test/duel-next", async (req, res) => {
    console.log('🎯 TEST DUEL/NEXT endpoint called');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Get or create test duel
      let duel = testDuels.get('test_duel');
      if (!duel) {
        duel = {
          id: 'test_duel',
          round: 0,
          rounds: 10,
          q: {},
          answers: {},
          seen: new Set(),
          subjectPool: ['Evidence', 'Contracts', 'Criminal Law', 'Torts']
        };
        testDuels.set('test_duel', duel);
      }

      // If current round exists and is NOT finished, return it with updated timer
      if (duel.round < duel.rounds && duel.q[duel.round] && !isRoundFinished(duel, duel.round)) {
        const q = duel.q[duel.round];
        const remaining = Math.max(0, Math.floor((q.endsAt - Date.now()) / 1000));
        return res.json({
          question: {
            id: q.item.qid, subject: q.item.subject, topic: q.item.topic,
            stem: q.item.stem, choices: q.item.choices,
            timeLimitSec: 60, timeRemainingSec: remaining,
            round: duel.round + 1, totalRounds: duel.rounds, source: "active"
          }
        });
      }

      // If current round is finished, advance to next round
      if (duel.round < duel.rounds && duel.q[duel.round] && isRoundFinished(duel, duel.round)) {
        duel.round += 1;
      }

      // Done with all rounds?
      if (duel.round >= duel.rounds) {
        return res.json({ done: true });
      }

      // Generate brand-new question for the new round
      if (!duel.q[duel.round]) {
        const subject = duel.subjectPool[Math.floor(Math.random() * duel.subjectPool.length)];
        
        let item;
        let created = false;
        let lastErr = null;

        // Try OpenAI generation with de-duplication
        for (let tries = 0; tries < 3; tries++) {
          try {
            const { generateFreshQuestion } = await import('./services/robustGenerator.js');
            item = await generateFreshQuestion(subject);
            
            // Check if we've seen this question before
            const crypto = await import('crypto');
            const hash = crypto.createHash('sha1')
              .update(item.stem.toLowerCase().replace(/\s+/g, ' '))
              .digest('hex');
            
            if (duel.seen.has(hash)) {
              console.log(`🔄 Duplicate question detected, retrying...`);
              continue;
            }
            
            duel.seen.add(hash);
            created = true;
            console.log(`✅ Generated fresh OpenAI question for test: ${item.qid}`);
            break;
          } catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
          }
        }

        // Fallback to local question if OpenAI fails
        if (!created) {
          console.warn(`[GEN_FAIL] OpenAI generation failed for ${subject}:`, lastErr?.message || lastErr);
          
          try {
            const { pickLocalFallback } = await import('./services/fallbacks.js');
            item = pickLocalFallback([subject]);
            
            if (item) {
              item.qid = `FB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              console.log(`✅ Using fallback question: ${item.id} → ${item.qid} for subject ${subject}`);
              created = true;
            }
          } catch (fallbackError) {
            console.error('Fallback import failed:', fallbackError);
          }
        }

        if (!created || !item) {
          return res.status(502).json({ 
            error: 'generate_failed', 
            reason: String(lastErr?.message || 'Failed to generate or find fallback question')
          });
        }

        // Store the question for this round
        const startAt = Date.now();
        const endsAt = startAt + 60 * 1000;
        duel.q[duel.round] = { item, startAt, endsAt };

        // Store for answer validation  
        testQuestionStorage.set(item.qid, {
          correctIndex: item.correctIndex,
          explanation: item.explanationLong || item.explanation,
          item: item,
          round: duel.round
        });
      }

      // Return the freshly created round
      const q = duel.q[duel.round];
      const remaining = Math.max(0, Math.floor((q.endsAt - Date.now()) / 1000));
      
      const question = {
        id: q.item.qid,
        subject: q.item.subject,
        topic: q.item.topic,
        stem: q.item.stem,
        choices: q.item.choices,
        timeLimitSec: 60,
        timeRemainingSec: remaining,
        round: duel.round + 1,
        totalRounds: duel.rounds,
        source: q.item.qid.startsWith('FB-') ? "fallback" : "ai"
      };
      
      res.json({ question });
      
    } catch (error: any) {
      console.error('Test duel/next error:', error);
      res.status(500).json({ error: 'Failed to generate question', reason: error.message });
    }
  });

  // Working duel endpoint with all requested features
  app.post("/duel/next", async (req, res) => {
    console.log('🎯 DUEL/NEXT endpoint called');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Pick a random subject
      const subjects = ['Evidence', 'Contracts', 'Criminal Law', 'Torts'];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      
      // Generate fresh question using proven system
      const { generateFreshQuestion } = await import('./services/robustGenerator.js');
      const item = await generateFreshQuestion(subject);
      
      console.log(`✅ Generated fresh question for duel: ${item.qid}`);
      
      // Return clean question without answer (exactly as requested)
      const question = {
        id: item.qid,
        subject: item.subject, // Shows ACTUAL subject from question, not user selection
        topic: item.topic,
        stem: item.stem,
        choices: item.choices, // Already normalized, no "A)" prefixes
        timeLimitSec: 60,
        timeRemainingSec: 60,
        round: 1,
        totalRounds: 7
      };
      
      res.json({ question });
      
    } catch (error) {
      console.error('Duel/next error:', error);
      res.status(500).json({ error: 'Failed to generate question' });
    }
  });

  // Public test endpoint for answers (no auth required)
  app.post("/test/duel-answer", async (req, res) => {
    console.log('🎯 TEST DUEL/ANSWER endpoint called');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { choiceIndex, questionId } = req.body || {};
      
      // Find the specific question to validate against
      const questionData = testQuestionStorage.get(questionId);
      
      if (!questionData) {
        console.log(`❌ Question ${questionId} not found in storage`);
        return res.status(400).json({ error: 'Question not found for validation' });
      }
      
      // Check if timed out (-1 indicates timeout)
      const timedOut = choiceIndex === -1;
      const isCorrect = !timedOut && Number(choiceIndex) === Number(questionData.correctIndex);
      
      const result = {
        correct: isCorrect,
        correctIndex: questionData.correctIndex,
        explanation: questionData.explanation,
        explanationLong: questionData.item?.explanationLong || questionData.explanation,
        timeRemaining: 45,
        scores: [isCorrect ? 1 : 0, 0],
        roundFinished: true,
        duelComplete: false
      };
      
      console.log(`🎯 Answer validation: Player chose ${choiceIndex}, correct is ${questionData.correctIndex}, timedOut: ${timedOut} → ${isCorrect ? 'CORRECT ✅' : 'WRONG ❌'}`);
      
      // Mark answer in test duel if it exists
      const testDuel = testDuels.get('test_duel');
      if (testDuel && questionData.round !== undefined) {
        testDuel.answers['test_player'] = testDuel.answers['test_player'] || {};
        testDuel.answers['test_player'][questionData.round] = {
          choiceIndex,
          correct: isCorrect,
          timeMs: Date.now() - (testDuel.q[questionData.round]?.startAt || Date.now())
        };
      }

      // Don't delete - keep for potential retries or review
      // testQuestionStorage.delete(questionId);
      
      res.json(result);
      
    } catch (error: any) {
      console.error('Test duel/answer error:', error);
      res.status(500).json({ error: 'Failed to process answer' });
    }
  });

  // Simple answer endpoint for testing
  app.post("/duel/answer", async (req, res) => {
    console.log('🎯 DUEL/ANSWER endpoint called');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { choiceIndex } = req.body || {};
      
      // Return mock result for testing
      const result = {
        correct: Math.random() > 0.5, // Random for testing
        correctIndex: Math.floor(Math.random() * 4),
        explanation: "This is a test explanation for the answer choice selected.",
        timeRemaining: 45,
        scores: [1, 0],
        roundFinished: true,
        duelComplete: false
      };
      
      console.log(`✅ Answer submitted: choice ${choiceIndex}, correct: ${result.correct}`);
      res.json(result);
      
    } catch (error) {
      console.error('Duel/answer error:', error);
      res.status(500).json({ error: 'Failed to process answer' });
    }
  });

  // /duel/answer - Submit answer and advance round
  app.post("/duel/answer", async (req, res) => {
    try {
      const { duelId, playerId, choiceIndex, timeMs } = req.body || {};
      if (!duelId) return res.status(400).json({ error: "Missing duelId" });

      const duel = duelStorage.get(duelId);
      if (!duel) return res.status(404).json({ error: "Duel not found" });

      const q = duel.q[duel.round];
      if (!q) return res.status(400).json({ error: "No active question" });

      const tNow = Date.now();
      const timedOut = tNow > q.endsAt;
      const correct = !timedOut && Number(choiceIndex) === Number(q.item.correctIndex);

      // Record answer
      q.answers[playerId || 'player'] = {
        choice: Number(choiceIndex),
        correct,
        timeMs: timeMs || (tNow - q.startAt),
        timedOut
      };

      // Check if round is finished (for bot duels, assume bot answers immediately)
      const playerAnswered = Boolean(q.answers['player']);
      const botAnswered = true; // Assume bot for now
      const roundFinished = timedOut || (playerAnswered && botAnswered);

      if (roundFinished) {
        // Update scores
        if (correct) duel.scores[0]++;
        // Bot score would be updated here based on bot logic
        
        duel.round += 1; // Advance to next round
      }

      const result = {
        correct,
        correctIndex: q.item.correctIndex,
        explanation: q.item.explanation,
        timeRemaining: Math.max(0, Math.floor((q.endsAt - tNow) / 1000)),
        scores: duel.scores,
        roundFinished,
        duelComplete: duel.round >= duel.rounds
      };

      res.json(result);

    } catch (e) {
      console.error("Duel/answer error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('Client connected to WebSocket');
    
    // Extract user ID from session if available (simplified for now)
    const cookies = req.headers.cookie;
    let userId: string | undefined;
    // In a real implementation, you would parse the session cookie here
    
    // Add client to real-time leaderboard
    realTimeLeaderboard.addClient(ws, userId);
    
    // Trigger immediate leaderboard update for new client
    setTimeout(async () => {
      await realTimeLeaderboard.updateAndBroadcast();
    }, 500);
    
    // Immediately start a bot duel when client connects
    setTimeout(() => {
      startBotDuel(ws);
    }, 1000);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        switch (type) {
          case 'queue:join':
            console.log('🎯 Queue join request:', payload?.subject);
            // Import matchmaker and start matchmaking
            const { startMatchmaking } = await import('./services/matchmaker.js');
            startMatchmaking(wss, ws, payload);
            break;
            
          case 'duel:answer':
            handleDuelAnswer(ws, payload);
            break;
          
          case 'duel:hint':
            // Handle hint request (not implemented yet)
            break;
          
          default:
            console.log('Unknown message type:', type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        console.error('Received data:', data.toString());
        ws.send(JSON.stringify({ 
          type: 'error', 
          payload: { message: 'Invalid message format' } 
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      // Clean up active duel state
      activeDuels.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}

// Duel state management
const activeDuels = new Map<WebSocket, {
  currentRound: number;
  scores: [number, number]; // [player, bot]
  totalRounds: number;
}>();

// Duel Management Functions
function startBotDuel(ws: WebSocket) {
  // Initialize duel state
  activeDuels.set(ws, {
    currentRound: 0,
    scores: [0, 0],
    totalRounds: 10
  });

  // Send duel start message
  ws.send(JSON.stringify({
    type: 'duel:start',
    payload: {
      roomCode: `bot_${Date.now()}`,
      subject: 'Evidence',
      totalRounds: 10,
      opponent: {
        id: 'bot_1',
        username: 'LegalEagle47',
        displayName: 'LegalEagle47',
        level: 5,
        points: 850
      }
    }
  }));

  // Send first question after a short delay
  setTimeout(() => {
    sendNextQuestion(ws);
  }, 2000);
}

function sendNextQuestion(ws: WebSocket) {
  const duelState = activeDuels.get(ws);
  if (!duelState) return;

  duelState.currentRound++;
  
  // Use cost-optimized question bank for fast delivery
  const cachedQuestion = questionBank.getSharedQuestion(duelState.subject || 'Mixed');
  
  if (cachedQuestion) {
    // Use cached question for cost optimization
    const questionData = {
      qid: cachedQuestion.id,
      stem: cachedQuestion.stem,
      choices: cachedQuestion.choices,
      round: duelState.currentRound,
      timeLeft: 20,
      deadlineTs: Date.now() + 20000
    };

    ws.send(JSON.stringify({
      type: 'duel:question',
      payload: questionData
    }));
    
    // Store for answer checking
    duelState.currentQuestion = cachedQuestion;
    return;
  }
  
  // Fallback to embedded questions if bank is empty
  const questions = [
    {
      stem: "A witness testified that she saw the defendant hit the victim with a baseball bat. On cross-examination, defense counsel asked the witness, 'Isn't it true that you told the police officer immediately after the incident that you weren't sure what the defendant hit the victim with?' The witness denied making this statement. Defense counsel then called the police officer to testify about the witness's prior statement. The officer's testimony is:",
      choices: [
        "Admissible as substantive evidence and to impeach the witness",
        "Admissible only to impeach the witness", 
        "Inadmissible because it is hearsay",
        "Inadmissible because the witness denied making the statement"
      ],
      correctIndex: 1,
      explanation: "Under FRE 613(b), extrinsic evidence of a prior inconsistent statement may be introduced only to impeach the witness's credibility, not as substantive evidence, unless the statement was made under oath at a prior proceeding."
    },
    {
      stem: "A homeowner contracted with a builder to construct a swimming pool for $50,000. The contract specified that the pool should be 20 feet long, 10 feet wide, and 8 feet deep. After completion, the homeowner discovered that the pool was only 19 feet long. The cost to reconstruct the pool to the correct length would be $25,000, but the difference in value between the pool as built and as contracted for is only $2,000. What is the homeowner's likely remedy?",
      choices: [
        "$25,000 in expectation damages",
        "$2,000 in diminished value damages",
        "No damages because the breach was not material", 
        "Specific performance requiring reconstruction"
      ],
      correctIndex: 1,
      explanation: "When the cost of completion greatly exceeds the diminished value and the deviation is relatively minor, courts typically award diminished value damages rather than cost of completion under the economic waste doctrine."
    },
    {
      stem: "A defendant was charged with burglary. At trial, the prosecution seeks to introduce evidence that the defendant committed two other burglaries in the same neighborhood within the past month. This evidence is:",
      choices: [
        "Admissible to prove the defendant's propensity to commit burglary",
        "Admissible to prove modus operandi or identity",
        "Inadmissible character evidence",
        "Inadmissible unless the defendant opens the door by introducing character evidence"
      ],
      correctIndex: 2,
      explanation: "Under FRE 404(b), evidence of other crimes is generally inadmissible to prove character or propensity. While it may be admitted for other purposes like modus operandi, the question doesn't provide facts suggesting such a purpose, making it inadmissible character evidence."
    },
    {
      stem: "A landowner devised his property 'to my daughter for life, then to my grandson, but if my grandson dies before reaching age 25, then to my nephew.' The grandson is currently 20 years old. What interest does the nephew have?",
      choices: [
        "Contingent remainder",
        "Vested remainder subject to divestment", 
        "Executory interest",
        "Reversion"
      ],
      correctIndex: 2,
      explanation: "The nephew has an executory interest because his interest will divest the grandson's vested remainder if the grandson dies before age 25. This is a shifting executory interest that cuts short the preceding estate."
    },
    {
      stem: "In a personal injury action, the plaintiff claims the defendant was driving 60 mph in a 35 mph zone. To prove the defendant's speed, the plaintiff offers testimony from a witness who will testify that immediately after the accident, a bystander who had since died said, 'That car must have been going at least 60 mph!' This testimony is:",
      choices: [
        "Admissible as a present sense impression",
        "Admissible as an excited utterance", 
        "Inadmissible hearsay because the declarant is unavailable",
        "Inadmissible because it contains the witness's opinion about speed"
      ],
      correctIndex: 0,
      explanation: "The bystander's statement qualifies as a present sense impression under FRE 803(1) because it was made immediately after perceiving the event (the car's speed) and describes what the declarant observed."
    },
    {
      stem: "A buyer contracted to purchase a rare painting for $100,000. Before delivery, the seller learned the painting was actually worth $500,000 and refused to deliver it. The buyer sued for specific performance. The seller's best defense is:",
      choices: [
        "The contract price was unconscionably low",
        "There was a mutual mistake about the painting's value",
        "The seller's performance would cause undue hardship",
        "Specific performance is inappropriate because money damages are adequate"
      ],
      correctIndex: 3,
      explanation: "Specific performance is generally not awarded when money damages provide an adequate remedy. Since the buyer can purchase a substitute painting or be compensated monetarily, specific performance would likely be denied."
    },
    {
      stem: "A defendant was arrested for robbery. During a properly conducted lineup, the victim identified the defendant as the perpetrator. At trial, the victim is unavailable to testify. The prosecution seeks to introduce the victim's out-of-court identification through the testimony of the police officer who conducted the lineup. This testimony is:",
      choices: [
        "Admissible as a prior identification under FRE 801(d)(1)(C)",
        "Admissible as a present sense impression",
        "Inadmissible hearsay because the victim cannot be cross-examined",
        "Inadmissible because lineup identifications are inherently unreliable"
      ],
      correctIndex: 2,
      explanation: "FRE 801(d)(1)(C) requires that the declarant testify at trial and be subject to cross-examination about the prior identification. Since the victim is unavailable, the identification is inadmissible hearsay."
    },
    {
      stem: "A state law requires all attorneys to be members of the state bar association and pay annual dues of $500. An attorney challenges this requirement as a violation of his First Amendment freedom of association. The law is:",
      choices: [
        "Constitutional because bar membership is a compelling state interest",
        "Constitutional because it regulates conduct, not speech",
        "Unconstitutional because it compels association with an organization",
        "Constitutional if the bar association does not engage in political activities unrelated to the legal profession"
      ],
      correctIndex: 3,
      explanation: "Under Keller v. State Bar of California, mandatory bar membership is constitutional if the association limits its activities to regulating the legal profession and improving legal services, but not if it engages in political activities unrelated to these purposes."
    },
    {
      stem: "A plaintiff was injured when a chair collapsed at a restaurant. The chair was manufactured by Company A but assembled by Company B. In strict products liability, if the plaintiff can prove the chair was defectively designed, who can be held liable?",
      choices: [
        "Only Company A because it designed the chair",
        "Only Company B because it was in the stream of commerce when the injury occurred",
        "Both companies because they are in the chain of distribution",
        "Neither company if the restaurant modified the chair after assembly"
      ],
      correctIndex: 2,
      explanation: "In strict products liability, all parties in the chain of distribution—including manufacturers, assemblers, and retailers—can be held liable for defective products that cause injury, regardless of their degree of fault."
    },
    {
      stem: "A defendant was charged with assault. At trial, the prosecution calls a character witness to testify that the defendant has a reputation in the community for violence. Defense counsel's objection should be:",
      choices: [
        "Overruled because reputation evidence is always admissible",
        "Overruled because the evidence is relevant to the defendant's propensity for violence",
        "Sustained because the prosecution cannot introduce character evidence in its case-in-chief",
        "Sustained because only specific acts evidence is admissible to prove character"
      ],
      correctIndex: 2,
      explanation: "Under FRE 404(a)(1), the prosecution generally cannot introduce evidence of a defendant's bad character in its case-in-chief to prove the defendant's propensity to commit the charged crime. The defendant must 'open the door' by introducing character evidence first."
    }
  ];

  const questionIndex = (duelState.currentRound - 1) % questions.length;
  const questionTemplate = questions[questionIndex];

  const question = {
    qid: `q_${duelState.currentRound}_${Date.now()}`,
    round: duelState.currentRound,
    stem: `Question ${duelState.currentRound}/10: ${questionTemplate.stem}`,
    choices: questionTemplate.choices,
    correctIndex: questionTemplate.correctIndex,
    explanation: questionTemplate.explanation,
    deadlineTs: Date.now() + 20000 // 20 seconds from now
  };

  ws.send(JSON.stringify({
    type: 'duel:question',
    payload: question
  }));
}

function handleDuelAnswer(ws: WebSocket, payload: any) {
  const { qid, idx, ms } = payload;
  const duelState = activeDuels.get(ws);
  if (!duelState) return;
  
  // Check cached question first for cost optimization
  let correctIndex = 0;
  
  if (duelState.currentQuestion && 'correctIndex' in duelState.currentQuestion) {
    correctIndex = duelState.currentQuestion.correctIndex;
  } else {
    // Fallback to embedded answers
    const correctAnswers = [1, 1, 2, 2, 0, 3, 2, 3, 2, 2];
    correctIndex = correctAnswers[(duelState.currentRound - 1) % correctAnswers.length];
  }
  
  // Generate bot answer (bot has ~70% accuracy)
  const botAnswer = Math.random() < 0.7 ? correctIndex : Math.floor(Math.random() * 4);
  
  // Update scores
  if (idx === correctIndex) duelState.scores[0]++;
  if (botAnswer === correctIndex) duelState.scores[1]++;
  
  // Simulate processing the answer
  setTimeout(() => {
    // Send result
    ws.send(JSON.stringify({
      type: 'duel:result',
      payload: {
        qid,
        correctIndex,
        explanation: getExplanation(duelState.currentRound),
        playerAnswers: [idx, botAnswer], // [user answer, bot answer]
        scores: duelState.scores,
        round: duelState.currentRound,
        totalRounds: duelState.totalRounds
      }
    }));

    // Check if duel is finished
    if (duelState.currentRound >= duelState.totalRounds) {
      setTimeout(() => {
        const playerWon = duelState.scores[0] > duelState.scores[1];
        const correctAnswers = duelState.scores[0];
        const botCorrectAnswers = duelState.scores[1];
        
        // Competitive point system: 5 points per correct answer, steal 5 points from opponent per win
        let pointsEarned = correctAnswers * 5; // Base points for correct answers
        let pointsLost = 0;
        
        if (playerWon) {
          pointsEarned += 25; // Bonus for winning the match
        } else {
          pointsLost = 25; // Lose points for losing the match
        }
        
        // Calculate new level based on points (every 100 points = 1 level)
        const finalPointChange = pointsEarned - pointsLost;
        
        ws.send(JSON.stringify({
          type: 'duel:finished',
          payload: {
            winnerId: playerWon ? 'user' : 'bot_1',
            finalScores: {
              player1: duelState.scores[0],
              player2: duelState.scores[1]
            },
            pointChanges: {
              player1: finalPointChange,
              player2: 0
            },
            xpGained: {
              player1: correctAnswers * 10 + (playerWon ? 50 : 0), // XP for learning
              player2: 0
            },
            competitiveDetails: {
              correctAnswers,
              basePoints: correctAnswers * 5,
              winBonus: playerWon ? 25 : 0,
              lossePenalty: playerWon ? 0 : -25,
              finalChange: finalPointChange
            }
          }
        }));
        
        // Clean up
        activeDuels.delete(ws);
      }, 3000);
    } else {
      // Send next question after a short delay
      setTimeout(() => {
        sendNextQuestion(ws);
      }, 4000);
    }
  }, 1500);
}

function getExplanation(round: number): string {
  const explanations = [
    "Under FRE 613(b), extrinsic evidence of a prior inconsistent statement may be introduced only to impeach the witness's credibility, not as substantive evidence, unless the statement was made under oath at a prior proceeding.",
    "When the cost of completion greatly exceeds the diminished value and the deviation is relatively minor, courts typically award diminished value damages rather than cost of completion under the economic waste doctrine.",
    "Under FRE 404(b), evidence of other crimes is generally inadmissible to prove character or propensity. While it may be admitted for other purposes like modus operandi, the question doesn't provide facts suggesting such a purpose, making it inadmissible character evidence.",
    "The nephew has an executory interest because his interest will divest the grandson's vested remainder if the grandson dies before age 25. This is a shifting executory interest that cuts short the preceding estate.",
    "The bystander's statement qualifies as a present sense impression under FRE 803(1) because it was made immediately after perceiving the event (the car's speed) and describes what the declarant observed.",
    "Specific performance is generally not awarded when money damages provide an adequate remedy. Since the buyer can purchase a substitute painting or be compensated monetarily, specific performance would likely be denied.",
    "FRE 801(d)(1)(C) requires that the declarant testify at trial and be subject to cross-examination about the prior identification. Since the victim is unavailable, the identification is inadmissible hearsay.",
    "Under Keller v. State Bar of California, mandatory bar membership is constitutional if the association limits its activities to regulating the legal profession and improving legal services, but not if it engages in political activities unrelated to these purposes.",
    "In strict products liability, all parties in the chain of distribution—including manufacturers, assemblers, and retailers—can be held liable for defective products that cause injury, regardless of their degree of fault.",
    "Under FRE 404(a)(1), the prosecution generally cannot introduce evidence of a defendant's bad character in its case-in-chief to prove the defendant's propensity to commit the charged crime. The defendant must 'open the door' by introducing character evidence first."
  ];
  return explanations[(round - 1) % explanations.length];
}
