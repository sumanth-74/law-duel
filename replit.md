# Law Duel - Legal Education Game

## Overview

Law Duel is a competitive legal education game where players engage in 1v1 duels using legal questions for both bar exam preparation and law school finals. The application features character creation, quick matchmaking, real-time gameplay, and a leaderboard system. Players can choose from various archetypes (e.g., werewolf, dragonling, shadow_goblin), gain XP and level up their avatars, and compete in different legal subjects including Evidence, Contracts, Torts, Property, Civil Procedure, Constitutional Law, and Criminal Law/Procedure.

## User Preferences

Preferred communication style: Simple, everyday language.

**UX Requirements (Updated 2025-01-12):**
- Stealth bot system: Players must never know they're playing against bots
- Streamlined matchmaking: Remove redundant "Quick Match" and "Create Room" options
- Clear game modes: "Quick Match" (vs stealth bots) and "Play with Friend" (enter username)
- Subject selection: Specific subjects or "Mixed Questions" option
- Rematch functionality: Allow rematches after game completion

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
- **WebSocket Integration**: Real-time communication for matchmaking, duels, and live game state updates
- **Modular Services**: Separated concerns with dedicated services for matchmaking, question coordination, leaderboard management, and stealth bot opponents
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
- **Real-time Duels**: Server-authoritative timer system with 20-second question timeouts
- **Question Generation**: OpenAI integration with 10-minute caching, 1200ms rate limiting, and training question fallbacks
- **Stealth Bot System**: Human-appearing bots with realistic names, avatars, and skill-based difficulty levels (Novice to Expert)
- **Streamlined Matchmaking**: Two clear modes - Quick Match (stealth bots) and Friend Challenge (username-based)
- **Subject Flexibility**: Specific legal subjects or mixed question pools
- **XP and Leveling**: Growth system with visual scaling based on character level (1 + 0.08 * level, capped at 1.8)
- **Leaderboard System**: ELO-style ranking with atomic updates and backup mechanisms

### Error Handling and Resilience
- **Graceful Degradation**: Fallback questions when OpenAI fails or returns invalid data
- **Retry Logic**: Single retry for failed operations before falling back to cached content
- **Connection Management**: Disconnect handling with forfeit logic for abandoned matches
- **Data Validation**: Strict schema validation for all user inputs and API responses

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-4o model for generating legal questions with server-side API key management
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