import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import MemoryStore from "memorystore";
import path from "path";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { registerPresence, startMatchmaking, handleDuelAnswer, handleHintRequest } from "./services/matchmaker.js";
import { initializeQuestionCoordinator } from "./services/qcoordinator.js";
import { initializeLeaderboard } from "./services/leaderboard.js";
import { questionBank, type CachedQuestion } from './questionBank';
import { retentionOptimizer } from './retentionOptimizer';
import { realTimeLeaderboard } from './realTimeLeaderboard';
import streakManager from './services/streakManager.js';
import asyncDuels from './services/async.js';

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

  // Initialize services
  await initializeQuestionCoordinator();
  await initializeLeaderboard();
  
  // Initialize real-time leaderboard updates
  setInterval(async () => {
    await realTimeLeaderboard.updateAndBroadcast();
  }, 30000); // Update every 30 seconds

  // Authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }

  // Authentication routes
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
      
      // Auto-login after registration
      (req.session as any).userId = user.id;
      
      // Don't return password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
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

  // === ASYNC DUELS ROUTES ===

  // Create async match
  app.post('/api/async/create', requireAuth, async (req: any, res) => {
    try {
      const { subject, opponentUsername } = req.body;
      const userId = req.session.userId;
      
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
