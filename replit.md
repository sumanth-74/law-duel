# Law Duel - Legal Education Game

## Overview

Law Duel is a competitive legal education game where players engage in 1v1 duels using legal questions for bar exam preparation and law school finals. The application features character creation, quick matchmaking, real-time gameplay, and a leaderboard system. Players can choose from various law-themed archetypes (e.g., Trial Hawk, Constitutional Scholar, Corporate Counsel) with legal accessories like gavels, scales of justice, law books, briefcases, and diplomas. Characters gain XP and level up their avatars, and compete in different legal subjects including Evidence, Contracts, Torts, Property, Civil Procedure, Constitutional Law, and Criminal Law/Procedure.

## User Preferences

Preferred communication style: Simple, everyday language.

**UX Requirements (Updated 2025-01-12):**
- **Game focus**: Law Duel is a competitive legal education game, not just a study tool
- **Direct signup**: Users can register directly on landing page with username only
- **Avatar creation**: Account creation leads directly to character/avatar creation
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

## System Architecture

### Full-Stack TypeScript Application
The application uses a monorepo structure with shared types and schemas between client and server. TypeScript provides type safety across the entire stack, with shared interfaces for users, matches, questions, and avatar data defined in the `shared/schema.ts` file using Drizzle ORM and Zod validation.

### Frontend Architecture
- **React with Vite**: Modern React setup using Vite for fast development and building
- **Component-based UI**: Uses shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom CSS variables for theming, featuring a dark arcane theme with fonts like Cinzel for headlines and Inter Tight for UI
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Avatar System**: Custom SVG-based avatar renderer with dynamic scaling based on character level

### Backend Architecture
- **Express.js Server**: RESTful API with WebSocket support for real-time duel functionality
- **WebSocket Integration**: Real-time communication for matchmaking, duels, live game state updates, leaderboard broadcasting, and friend challenges
- **Modular Services**: Separated concerns with dedicated services for matchmaking, question coordination, leaderboard management, stealth bot opponents, and friend challenge notifications
- **Real-time Features**: Live leaderboard updates, instant friend challenge notifications, WebSocket-based duel invitations with 1-minute expiry timers
- **In-Memory Storage**: File-based storage using JSON files with atomic write operations for data persistence

### Data Storage Solutions
- **PostgreSQL Schema**: Drizzle ORM configuration for production database with tables for users, matches, and questions
- **Development Storage**: In-memory storage with JSON file persistence for rapid development
- **Atomic Writes**: Safe file operations using temporary files and atomic renames to prevent data corruption
- **Caching Layer**: 10-minute question cache with fallback mechanisms for reliability

### Authentication and User Management
- **Simple Registration**: Username-based user creation with duplicate checking
- **Local Storage**: Client-side character data persistence for quick access
- **Profile Management**: Character creation with avatar customization and display name handling
- **Username Validation**: 2-18 character limit with alphanumeric and space restrictions

### Game Logic Architecture
- **Real-time Duels**: Server-authoritative timer system with 20-second question timeouts, 10 questions per match
- **Question Quality**: Professional bar exam quality questions using structured OpenAI generation with JSON schema validation, comprehensive explanations and rule references
- **Structured Generation**: MBE generator service using OpenAI's structured outputs for both dueling questions and Daily Casefile, ensuring consistent format and quality
- **Cost Optimization**: Shared server calls between players, 10-minute question cache, structured generation reducing API costs while maintaining quality
- **Retention Loop**: Fast matchmaking (<8s target) → immediate win/lose feedback → ladder progression → rematch incentives, targeting D7 retention ≥ 20%
- **Competitive Points System**: Winners earn 5 points per correct answer + 25 bonus points, losers forfeit 25 points, creating high-stakes competition
- **Level Progression**: Levels determined by total points earned (every 100 points = 1 level), with points preventing from going below 0
- **Stealth Bot System**: Human-appearing bots with adaptive difficulty (70% base accuracy, adjusted for player retention optimization)
- **Streamlined Matchmaking**: Two clear modes - Quick Match (stealth bots) and Friend Challenge (username-based)
- **Subject Flexibility**: Specific legal subjects or mixed question pools
- **XP and Leveling**: Growth system with visual scaling based on character level (1 + 0.08 * level, capped at 1.8)
- **Leaderboard System**: Points-based ranking with real-time stat updates and database synchronization

### Error Handling and Resilience
- **Question Bank System**: Pre-generated, verified questions with 10-minute cache and nightly regeneration for cost control
- **Fresh Duel Questions**: OpenAI generation confirmed working - generates questions like `fresh_openai_1755027766896_aouqoebfa` with professional legal analysis (Updated 2025-08-12)
- **Question Delivery**: Server successfully delivers OpenAI questions when clients maintain persistent WebSocket connections throughout the generation process (Updated 2025-08-12)
- **Fast Matchmaking**: <8s target with immediate bot matching for optimal user experience
- **Retention Optimization**: Adaptive bot difficulty, D7 retention tracking, and rematch incentives
- **Cost Management**: Shared question delivery, batch generation, and cached explanations keeping operational costs minimal
- **Connection Management**: Disconnect handling with forfeit logic for abandoned matches
- **Data Validation**: Strict schema validation for all user inputs and API responses
- **Quality Monitoring**: Daily spot-checking of question accuracy and explanation tightness
- **Leaderboard System**: Fixed "users2" initialization error caused by variable shadowing in statsService - both overall and real-time leaderboards now functional
- **Subject Integrity Guard**: Comprehensive system implemented to eliminate cross-subject bleed with canonical subject normalization, heuristic validation, and retry logic (Updated 2025-08-12)

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-4o-mini model for generating legal questions with server-side API key management - **FULLY OPERATIONAL** (Updated 2025-08-12)
- **Question Generation**: Answer randomization working correctly - questions generated with topics like "Separation of Powers", "Privacy Torts", "Hearsay", "Future Interests"
- **Fresh Question System**: OpenAI generates unique questions with IDs like `fresh_openai_1755027766896_aouqoebfa` for each duel round
- **Topic Variety**: Property (Covenants), Torts (Defamation), Evidence (Judicial Notice), Constitutional Law (Separation of Powers) - diverse topics across all subjects
- **Connection Management**: Successfully delivers OpenAI questions when clients maintain persistent connections during generation
- **Neon Database**: PostgreSQL hosting service for production data storage

### UI and Styling Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom theming
- **Lucide React**: Icon library for consistent UI elements
- **Google Fonts**: Cinzel (serif headers) and Inter Tight (UI text) font families

### Development and Build Tools
- **Vite**: Fast build tool with HMR and TypeScript support
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Static type checking across the entire codebase

### Validation and Data Management
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation
- **TanStack Query**: Server state management, caching, and synchronization
- **Class Variance Authority**: Type-safe CSS class composition

### WebSocket and Real-time Features
- **ws**: WebSocket library for real-time server communication
- **Socket-like Implementation**: Custom WebSocket handling for matchmaking and duel states