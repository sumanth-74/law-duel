# Law Duel - Legal Education Game

## Overview
Law Duel is a competitive legal education game designed for bar exam preparation and law school finals. It features 1v1 duels, character creation, real-time matchmaking, a comprehensive leaderboard, and progressive solo challenges. The game allows players to choose law-themed archetypes, level up avatars through XP, and compete across various legal subjects. A key feature is the monetized Solo Challenge mode, offering progressive difficulty, a 3-lives system, and pay-to-continue mechanics. The platform aims to provide an engaging and competitive environment for legal education.

## User Preferences
Preferred communication style: Simple, everyday language.

- **Game focus**: Law Duel is a competitive legal education game, not just a study tool
- **Direct signup**: Users can register directly on landing page with username and email
- **Avatar creation**: Account creation leads directly to character/avatar creation
- **Email required**: Email is now required during signup for account recovery purposes
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
- **Populated leaderboard**: 15+ competitive bot players make platform feel active and engaging
- **Solo Challenge Mode**: Progressive difficulty system with 3 lives, monetization via life restoration ($0.99)
- **Practice Mode Redesign**: Transformed from bot duels to progressive solo challenges with increasing difficulty
- **Game Mode Structure**: Two main modes - Solo Mode (single player with lives) and VS Mode (multiplayer with Live Duel and Friend Challenge)
- **Daily Casefile System**: Automated daily question generation with fresh content every 24 hours at midnight UTC
- **Daily Question Rotation**: Questions automatically regenerate with cleanup system removing old questions after 7 days

## Recent Changes (August 13, 2025)

### VS Mode Progressive Difficulty System
- **Unified Question Generation**: VS mode (live duels and friend challenges) now uses OpenAI-generated questions with progressive difficulty
- **Difficulty Progression**: Questions increase in difficulty every 2 rounds (Rounds 1-2: D1, 3-4: D2, 5-6: D3, 7: D4)
- **OpenAI Integration**: Enhanced question generator with 10 difficulty levels from introductory to mastery level
- **Friend Challenges Updated**: Async duels now also use the same progressive difficulty system as live duels
- **Consistent Experience**: Both Solo and VS modes now share the same difficulty progression mechanics

### MBE Subtopic Tracking System
- **Comprehensive Progress Tracking**: Added granular tracking for all MBE subjects and subtopics (70+ legal areas)
- **Hard-Won Progress**: Proficiency scores increase slowly (0.5% per correct answer) to reflect true mastery
- **Smart Recommendations**: System identifies weakest subtopics and provides focused study recommendations
- **Visual Progress Display**: New SubtopicProgress component shows detailed mastery levels for each legal area
- **Automatic Subtopic Detection**: Questions automatically tagged with appropriate subtopics based on content analysis
- **Persistence**: All subtopic progress saved to JSON file for development environment

## System Architecture

### Full-Stack TypeScript Application
The application is a monorepo utilizing TypeScript for type safety across client and server, with shared schemas for core data entities.

### Frontend Architecture
- **Framework**: React with Vite for development.
- **UI Components**: shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom variables for a dark arcane theme, using Cinzel and Inter Tight fonts.
- **State Management**: React Query for server state.
- **Routing**: Wouter for client-side routing.
- **Avatar System**: Custom SVG-based avatar renderer with dynamic scaling.

### Backend Architecture
- **Server**: Express.js with RESTful API and WebSocket support for real-time features.
- **Real-time Features**: WebSockets enable matchmaking, duels, live game state updates, leaderboard broadcasts, and friend challenges.
- **Modularity**: Dedicated services for matchmaking, questions, leaderboard, bots, and notifications.
- **Data Persistence (Development)**: In-memory storage with JSON file persistence, using atomic writes.

### Data Storage Solutions
- **Production Database**: PostgreSQL via Drizzle ORM.
- **Development Database**: In-memory storage with JSON file persistence.
- **Caching**: 10-minute question cache for performance and cost control.

### Authentication and User Management
- **Registration**: Simple username-based registration with duplicate checking.
- **Profile**: Avatar customization and display name handling.
- **Client-side Storage**: Local storage for character data.

### Game Logic Architecture
- **Real-time Duels**: Server-authoritative, 20-second question timeouts, 10 questions per match.
- **Question Generation**: Professional bar exam quality questions generated using OpenAI with JSON schema validation, detailed explanations, and rule references. An MBE generator service ensures structured outputs.
- **Cost Optimization**: Shared server calls, question caching, and structured generation minimize API costs.
- **Retention Mechanisms**: Fast matchmaking, immediate feedback, ladder progression, and rematch incentives.
- **Points System**: Competitive point system with bonuses for correct answers and penalties for losses.
- **Level Progression**: XP and leveling system tied to points, influencing visual scaling.
- **Stealth Bots**: Adaptive difficulty bots for seamless matchmaking and retention.
- **Matchmaking Modes**: "Quick Match" (bots) and "Friend Challenge."
- **Solo Challenge**: Progressive difficulty (1-10 levels), 3-lives mechanic, monetized via life restoration.
- **Daily Questions**: Automated daily question generation via OpenAI, with topic rotation and 7-day cleanup.
- **Daily Streaks**: Tracks daily participation with milestone rewards (XP bursts) and enhanced UI feedback.
- **Answer Randomization**: Fisher-Yates shuffle ensures even distribution of correct answers.

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