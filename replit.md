# Law Duel - Legal Education Game

## Overview
Law Duel is a competitive legal education game designed for bar exam preparation and law school finals. It features 1v1 duels, character creation, real-time matchmaking, a comprehensive leaderboard, and progressive solo challenges. The game allows players to choose law-themed archetypes, level up avatars through XP, and compete across various legal subjects. A key feature is the monetized Solo Challenge mode, offering progressive difficulty, a 3-lives system, and pay-to-continue mechanics. The platform aims to provide an engaging and competitive environment for legal education.

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

## Recent Changes (August 13, 2025 - Latest Core Loop Update)

### Stable Core Loop Implementation
- **Canonical Taxonomy Service**: Created server/taxonomy.js as single source of truth for all MBE subjects/subtopics
- **Progress Tracking Service**: Built server/progress.js with idempotent recording that captures attempts immediately
- **Weakness Targeting**: Implemented server/services/weaknessTargeting.js ensuring ≥3/5 questions from weakest subtopics
- **Adaptive Difficulty**: Questions scale based on player mastery (lower mastery = easier questions for learning)
- **API Endpoints**: Added /api/stats/subtopics and /api/profile/:username for stats and public profiles
- **Integration Complete**: Progress tracking integrated into matchmaker and async duels with proper subtopic tagging

### Comprehensive MBE Subtopic Implementation
- **Detailed Subtopic Structure**: Implemented full MBE subtopic breakdown with 75+ specific legal areas
- **Civil Procedure**: 12 subtopics including Jurisdiction, Personal Jurisdiction, Venue, Service of Process, Pleadings, Joinder, Discovery, Summary Judgment, Trial Process, Appeals, Res Judicata, and Erie Doctrine
- **Constitutional Law**: 10 subtopics covering Judicial Review, Separation of Powers, Federalism, Individual Rights, Due Process, Equal Protection, First Amendment (Speech & Religion), Takings, and Contracts Clause
- **Contracts**: 9 subtopics including Formation, Defenses, Statute of Frauds, Parol Evidence, Conditions, Breach, Remedies, Third-Party Rights, and UCC Article 2
- **Criminal Law/Procedure**: 11 subtopics covering Homicide, Crimes Against Person/Property, Inchoate Crimes, Accomplice Liability, Defenses, Fourth/Fifth/Sixth Amendment, Pretrial, and Guilty Pleas
- **Evidence**: 9 subtopics including Relevance, Character Evidence, Impeachment, Hearsay, Confrontation Clause, Opinion Testimony, Privileges, Authentication, and Judicial Notice
- **Real Property**: 11 subtopics covering Estates, Concurrent Ownership, Landlord-Tenant, Easements, Covenants, Sales, Deeds, Mortgages, Recording Acts, Adverse Possession, and Zoning
- **Torts**: 13 subtopics including Intentional Torts, Defenses, Negligence, Special Duties, Strict Liability, Products Liability, Vicarious Liability, Nuisance, Defamation, Privacy, and Economic Torts
- **Granular Area Tracking**: Each subtopic contains specific legal areas (e.g., Jurisdiction includes Federal Question, Diversity, Supplemental)
- **Stats Integration**: Subtopics are displayed in user stats with progress tracking and proficiency scores

## Recent Changes (August 13, 2025)

### Question Pool System for Instant Serving
- **Pre-Generation Pool**: Questions now pre-generated in background for instant serving during duels
- **Zero Latency**: Eliminated OpenAI generation delay during live duels - questions served instantly from pool
- **Smart Batching**: Efficient generation in small batches (3 at a time) to avoid API rate limits
- **Progressive Loading**: Prioritizes common difficulties (1-2) first, then generates higher difficulties
- **Auto-Refill**: Pool automatically maintains 5 questions per difficulty level per subject
- **Fallback Protection**: Direct generation backup if pool is empty, ensuring 100% reliability

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

## North Star Implementation (August 13, 2025 - Latest Update)

### Core Game Requirements
- **5-Question Matches**: All game modes use exactly 5 questions (MATCH_QUESTIONS constant)
- **25-Second Timers**: Server-authoritative timing with automatic answer locking
- **Weakness Targeting**: 3 of 5 questions target player's weakest subtopics
- **Instant Feedback**: Chips display "+12 XP · Evidence/Hearsay · Mastery +3" after each answer
- **Elo Rating System**: K=24 factor with rating changes displayed on result screens
- **Weekly Ladder**: Top 50 global players tracked by ISO week (Monday-Sunday)

### Adaptive Difficulty System
- **Dynamic Difficulty**: Questions get progressively harder based on player mastery
- **Mastery-Based Scaling**: Maps player proficiency (0-100%) to difficulty levels (1-10)
- **Smart Targeting**: Weakness questions served at appropriate difficulty for learning
- **Progressive Challenge**: Non-weakness questions served at slightly higher difficulty

### Public Profiles & Stats
- **Public Profile URLs**: `/stats/:userId` shows any user's public statistics
- **Profile Features**: Avatar, Elo rating, win rate, accuracy, daily streak display
- **Subject Mastery Bars**: Visual progress indicators for each MBE subject
- **Share & Challenge**: Direct profile sharing and friend challenge buttons
- **Privacy Controls**: Tabs disabled for sensitive data when viewing others

### OpenAI Integration
- **Fresh Questions**: All questions generated via OpenAI with proper validation
- **Topic Tagging**: Questions tagged with subject, subtopic, and difficulty
- **Quality Gates**: Schema validation, 4 choices, clear explanations required
- **No Duplicates**: Fingerprinting ensures no repeated questions within matches
- **Fallback Protection**: Cached questions serve as backup if generation fails