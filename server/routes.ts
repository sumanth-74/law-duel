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
        ws.send(JSON.stringify({ 
          type: 'error', 
          payload: { message: 'Invalid message format' } 
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}

// Duel Management Functions
function startBotDuel(ws: WebSocket) {
  // Send duel start message
  ws.send(JSON.stringify({
    type: 'duel:start',
    payload: {
      roomCode: `bot_${Date.now()}`,
      subject: 'Evidence',
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
    sendQuestion(ws, 1);
  }, 2000);
}

function sendQuestion(ws: WebSocket, round: number) {
  const sampleQuestion = {
    qid: `q_${round}_${Date.now()}`,
    round,
    stem: `Evidence Law Question ${round}: Which of the following statements about hearsay is correct?`,
    choices: [
      "Hearsay is never admissible in court",
      "Hearsay is an out-of-court statement offered to prove the truth of the matter asserted",
      "All hearsay exceptions require the declarant to be unavailable",
      "Hearsay only applies to written statements"
    ],
    correctIndex: 1,
    explanation: "Hearsay is defined as an out-of-court statement offered to prove the truth of the matter asserted. There are many exceptions that allow hearsay to be admitted.",
    deadlineTs: Date.now() + 20000 // 20 seconds from now
  };

  ws.send(JSON.stringify({
    type: 'duel:question',
    payload: sampleQuestion
  }));
}

function handleDuelAnswer(ws: WebSocket, payload: any) {
  const { qid, idx, ms } = payload;
  
  // Simulate processing the answer
  setTimeout(() => {
    // Send result
    ws.send(JSON.stringify({
      type: 'duel:result',
      payload: {
        qid,
        correctIndex: 1, // B is correct
        explanation: "Hearsay is defined as an out-of-court statement offered to prove the truth of the matter asserted.",
        playerAnswers: [idx, 1], // [user answer, bot answer]
        scores: [idx === 1 ? 1 : 0, 1], // [user score, bot score]
        round: 1
      }
    }));

    // If this was the last round, send duel finished
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'duel:finished',
        payload: {
          winnerId: idx === 1 ? 'user' : 'bot_1',
          finalScores: {
            player1: idx === 1 ? 1 : 0,
            player2: 1
          },
          pointChanges: {
            player1: idx === 1 ? 25 : 5,
            player2: 0
          },
          xpGained: {
            player1: idx === 1 ? 20 : 5,
            player2: 0
          }
        }
      }));
    }, 3000);
  }, 1500);
}
