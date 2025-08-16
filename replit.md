# Law Duel - Legal Education Game

## Overview
Law Duel is a competitive legal education game designed for bar exam preparation and law school finals. It features 1v1 duels, character creation, real-time matchmaking, a comprehensive leaderboard, and progressive solo challenges. The game allows players to choose law-themed archetypes, level up avatars through XP, and compete across various legal subjects. The platform aims to provide an engaging and competitive environment for legal education, including a monetized Solo Challenge mode.

## Recent Changes (Aug 16, 2025)
- **Fixed friend challenge system**: Replaced mock/placeholder code with real API integration for friend matches. Friend challenges now properly search for users, create async matches on the server, and store them in the database.
- **Prevented duplicate matches**: Added logic to ensure only one active match can exist between any two players. When attempting to create a new match with someone you're already playing, the system returns the existing match instead.
- **Token-based authentication implemented**: Added JWT token authentication as a fallback to bypass persistent cookie/session issues across different domains. System now supports dual authentication (cookies + Bearer tokens).
- **Authentication flow enhanced**: Server issues JWT tokens on login/register, client stores them in localStorage, and all API requests include Authorization headers. This ensures authentication works on any domain including lawduel.net.
- **Friend match flow working**: Users can now enter a friend's username, the system verifies they exist, creates or returns existing async match, and both players can access it through their inbox for asynchronous gameplay.
- **Beta-ready system**: Both authentication and friend challenges work reliably across all environments, ready for immediate beta launch on lawduel.net

## User Preferences
Preferred communication style: Simple, everyday language.

- **Game focus**: Law Duel is a competitive legal education game, not just a study tool
- **Direct signup**: Users can register directly on landing page with username and email
- **Avatar creation**: Account creation leads directly to character/avatar creation
- **Email required**: Email is now required during signup for user tracking and communication
- Stealth bot system: Players must never know they're playing against bots
- Streamlined matchmaking: Remove redundant "Quick Match" and "Create Room" options
- Clear game modes: "Quick Match" (vs stealth bots) and "Play with Friend" (enter username)
- Subject selection: Specific subjects or "Mixed Questions" option
- Rematch functionality: Allow rematches after game completion
- Persistent gamer tag: Username always visible like gaming platforms
- **Law school affiliation**: Display law school next to gamer tags across platform
- Purple theme: Mature, professional purple styling throughout platform
- Real-time leaderboard: Global leaderboard updates live across all players
- Friend challenges: Pop-up notifications with accept/decline options for friend duels
- **Hot Streaks & Loss Shield**: Win streaks give bonus points (+3/+5/+8), first loss after 3+ wins is halved
- **Instant Rematch**: Auto-focus rematch button, requeue both players in 3s
- **Daily Quests**: 3 rotating goals with cosmetic rewards and XP bursts
- **Tier Milestones**: Visible tiers (Novice to Archon) with short-term progression goals
- **Streamlined onboarding**: Direct signup to avatar creation flow for immediate engagement
- **Streamlined UI**: Removed redundant "View Rankings" link, leaderboard serves as primary rankings display
- **Populated leaderboard**: 12 competitive bot players with actual points make platform feel active (no zero-point players)
- **Solo Challenge Mode**: Progressive difficulty system with 5 free lives, 24-hour cooldown after exhausting all lives
- **Practice Mode Redesign**: Transformed from bot duels to progressive solo challenges with increasing difficulty
- **Game Mode Structure**: Two main modes - Solo Mode (single player with lives) and VS Mode (multiplayer with Live Duel and Friend Challenge)
- **Daily Casefile System**: Automated daily question generation with fresh content every 24 hours at midnight UTC
- **Daily Question Rotation**: Questions automatically regenerate with cleanup system removing old questions after 7 days

## System Architecture

### Full-Stack TypeScript Application
The application is a monorepo utilizing TypeScript for type safety across client and server, with shared schemas for core data entities.

### Frontend Architecture
- **Framework**: React with Vite.
- **UI Components**: shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom variables for a dark arcane theme, using Cinzel and Inter Tight fonts.
- **State Management**: React Query for server state.
- **Routing**: Wouter for client-side routing.
- **Avatar System**: Custom SVG-based avatar renderer.

### Backend Architecture
- **Server**: Express.js with RESTful API and WebSocket support for real-time features.
- **Real-time Features**: WebSockets enable matchmaking, duels, live game state updates, leaderboard broadcasts, and friend challenges.
- **Modularity**: Dedicated services for matchmaking, questions, leaderboard, bots, and notifications.
- **Data Persistence (Development)**: In-memory storage with JSON file persistence, using atomic writes.

### Data Storage Solutions
- **Production Database**: PostgreSQL via Drizzle ORM.
- **Development Database**: In-memory storage with JSON file persistence.
- **Caching**: 10-minute question cache.

### Authentication and User Management
- **Registration**: Simple username-based registration.
- **Profile**: Avatar customization and display name handling.
- **Client-side Storage**: Local storage for character data.

### Game Logic Architecture
- **Real-time Duels**: Server-authoritative, 20-second question timeouts, 5 questions per match.
- **Question Generation**: Professional bar exam quality questions generated using OpenAI with JSON schema validation, detailed explanations, and rule references. An MBE generator service ensures structured outputs. Questions are pre-generated in a pool for instant serving, with smart quota management.
- **Difficulty System**: Adaptive difficulty where questions scale based on player mastery (0-100% proficiency maps to 1-10 difficulty levels). Weakness targeting ensures ≥3/5 questions are from weakest subtopics.
- **Retention Mechanisms**: Fast matchmaking, immediate feedback, ladder progression, and rematch incentives.
- **Points System**: Competitive point system with bonuses for correct answers and penalties for losses.
- **Level Progression**: XP and leveling system tied to points.
- **Stealth Bots**: Adaptive difficulty bots for seamless matchmaking and retention.
- **Matchmaking Modes**: "Quick Match" (bots) and "Friend Challenge."
- **Solo Challenge**: Progressive difficulty (1-10 levels), 3-lives mechanic, monetized via life restoration.
- **Daily Questions**: Automated daily question generation via OpenAI, with topic rotation and 7-day cleanup.
- **Daily Streaks**: Tracks daily participation with milestone rewards.
- **Answer Randomization**: Fisher-Yates shuffle ensures even distribution of correct answers.
- **Progress Tracking**: Granular tracking for all MBE subjects and 70+ subtopics with proficiency scores and smart recommendations.
- **Elo Rating System**: K=24 factor with rating changes displayed on result screens.
- **Public Profiles**: `/stats/:userId` shows any user's public statistics including avatar, Elo rating, win rate, accuracy, daily streak, and subject mastery bars.

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-4o-mini model for generating legal questions and explanations.
- **Neon Database**: PostgreSQL hosting service.

### UI and Styling Libraries
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts**: Cinzel (headers) and Inter Tight (UI text).

### Development and Build Tools
- **Vite**: Fast build tool.
- **Drizzle Kit**: Database migration and schema management.
- **ESBuild**: JavaScript bundler.
- **TypeScript**: Static type checking.

### Validation and Data Management
- **Zod**: Runtime type validation.
- **React Hook Form**: Form state management.
- **TanStack Query**: Server state management.
- **Class Variance Authority**: Type-safe CSS class composition.

### WebSocket and Real-time Features
- **ws**: WebSocket library.