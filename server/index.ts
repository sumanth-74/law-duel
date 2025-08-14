import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dailyCasefileService } from "./services/dailyCasefileService";
import './services/questionCache.js'; // Initialize question cache for instant loading

const app = express();
const PROD = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';

// CRITICAL: Trust proxy FIRST for Replit/any proxy
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Removed domain redirect - allow access from both Replit and lawduel.net
// This was breaking access when lawduel.net deployment wasn't properly configured

// SESSION CONFIGURATION - MUST BE BEFORE ALL ROUTES
let sessionStore: any;
if (PROD && process.env.DATABASE_URL) {
  const PgSession = connectPgSimple(session);
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: PROD ? { rejectUnauthorized: false } : false
  });
  sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15, // Prune every 15 minutes
  });
} else {
  const MemStore = MemoryStore(session);
  sessionStore = new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
}

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',                  // Always use lax for same-origin
    secure: PROD,                      // Secure cookies in production
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
    // DO NOT set domain - let it be host-only
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Redirect authenticated users from landing/login pages to main app
app.get(["/", "/login"], (req: any, res, next) => {
  if (req.session?.userId || req.session?.user) {
    return res.redirect(302, "/play");
  }
  next();
});

(async () => {
  // Daily cleanup and fresh question generation
  const setupDailyTasks = () => {
    // Run cleanup on startup
    dailyCasefileService.cleanupOldQuestions();
    
    // Schedule daily cleanup at midnight UTC
    const scheduleNextCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 5, 0, 0); // 5 minutes past midnight to ensure new day
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        dailyCasefileService.cleanupOldQuestions();
        log("🗓️ Daily question system: New day detected, ready for fresh questions");
        scheduleNextCleanup(); // Schedule next cleanup
      }, timeUntilMidnight);
      
      log(`📅 Next daily cleanup scheduled in ${Math.round(timeUntilMidnight / 1000 / 60 / 60)} hours`);
    };
    
    scheduleNextCleanup();
  };
  
  setupDailyTasks();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
