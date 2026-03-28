# 🎮 Connect Four — Full Stack Game Platform

> A production-grade Connect Four game with online multiplayer, AI vs AI battles (Claude vs Gemini), ELO ranking, achievements, and spectate mode.

**Author:** Odetokun Treasure Oluwatobi (codingninja)  
**Stack:** React + TypeScript + Vite + Tailwind (Frontend) | Node.js + Express + TypeScript + PostgreSQL + Prisma (Backend)  
**Status:** 🚧 Active Development

---

## 📖 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Game Modes](#game-modes)
- [Edge Cases](#edge-cases)
- [User Flow](#user-flow)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Build Order / Phases](#build-order--phases)
- [AI Context for Prompting](#ai-context-for-prompting)

---

## Project Overview

This is not a basic Connect Four game. It is a full platform built around the classic game with the following goals:

1. Demonstrate full stack engineering skills across React, Node.js, PostgreSQL, WebSockets, and AI API integration
2. Build a real product with real users, real rankings, and real game history
3. Serve as a portfolio centrepiece for switching to a stronger PPA and landing a better role

The game supports four modes: local Player vs Player, Player vs CPU (with difficulty levels), Online Multiplayer (two real humans via WebSockets), and AI vs AI (Claude vs Gemini battling in real time while users spectate).

---

## Features

| Feature                             | Status        |
| ----------------------------------- | ------------- |
| Local PVP                           | ✅ Complete   |
| Player vs CPU (4 difficulty levels) | ✅ Complete   |
| Google OAuth Authentication         | ✅ Complete   |
| JWT + Refresh Token                 | ✅ Complete   |
| OTP Authentication                  | ✅ Complete   |
| Password Reset & Change             | ✅ Complete   |
| Local Signup + Login                | ✅ Complete   |
| Secure Logout (Token Blacklist)     | ✅ Complete   |
| Auth Middleware (Protect Routes)    | ✅ Complete   |
| Leaderboard + ELO Ranking           | ✅ Complete   |
| Achievements System                 | ✅ Complete   |
| User Profiles & History             | 📋 Scaffolded |
| Game Room Management                | ✅ Complete   |
| Spectate Mode                       | 📋 Scaffolded |
| AI vs AI (Claude vs Gemini)         | 📋 Planned    |
| Online Multiplayer (WebSockets)     | 🚀 In Progress|

---

## Tech Stack

### Frontend

- **React 18** + **TypeScript** + **Vite** — core framework
- **Tailwind CSS** — styling
- **React Router** — client side routing
- **useReducer** — complex game state management
- **react-hot-toast** — notifications
- **Vercel Analytics** — usage tracking

### Backend

- **Node.js** + **Express** + **TypeScript** — server
- **PostgreSQL** — relational database
- **Prisma ORM (v7)** — database client and migrations
- **JWT** — authentication tokens
- **Google OAuth 2.0** — user authentication
- **Morgan** — HTTP request logging
- **tsx watch** — hot reload in development
- **WebSockets (Socket.io)** — real-time multiplayer & room events

### Infrastructure

- **Render** — backend hosting + PostgreSQL database (production)
- **Vercel** — frontend hosting
- **WSL (Ubuntu)** — local development environment

---

## Project Structure

```
connect-four/
│
├── connect-four-game/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board.tsx           # Bottom colored board
│   │   │   ├── GameGrid.tsx        # Main game grid + disc logic
│   │   │   ├── LevelList.tsx       # CPU difficulty selector
│   │   │   ├── RulesList.tsx       # Game rules display
│   │   │   └── Settings.tsx        # Main menu / game mode selector
│   │   ├── contexts/
│   │   │   └── GameProvider.tsx    # Global game state (useReducer)
│   │   ├── pages/
│   │   │   ├── Start.tsx           # Home/menu page
│   │   │   ├── Game.tsx            # Game page
│   │   │   ├── Rules.tsx           # Rules page
│   │   │   └── Levels.tsx          # Difficulty selection page
│   │   ├── ui/
│   │   │   ├── Navbar.tsx          # Top nav with menu/restart
│   │   │   └── Modal.tsx           # Pause menu modal
│   │   └── App.tsx                 # Routes definition
│   └── public/images/              # Game assets (board, counters, icons)
│
└── connect-four-backend/           # Backend (Node.js + Express)
    ├── src/
    │   ├── config/
    │   │   └── prisma.ts           # Prisma client singleton
    │   ├── controllers/            # Route handler logic
    │   ├── middleware/             # Auth middleware, error handling
    │   ├── routes/                 # Express route definitions
    │   └── index.ts               # App entry point
    ├── prisma/
    │   ├── schema.prisma           # Database models
    │   └── migrations/             # Migration history
    ├── generated/
    │   └── prisma/                 # Auto-generated Prisma client
    ├── prisma.config.ts            # Prisma 7 datasource config
    ├── tsconfig.json
    ├── package.json
    └── .env                        # Environment variables (never commit)
```

---

## Database Schema

### Models

**User**

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  avatar    String?
  eloRating Int      @default(1000)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  gamesAsPlayer1 Game[]        @relation("Player1Games")
  gamesAsPlayer2 Game[]        @relation("Player2Games")
  achievements   Achievement[]
}
```

**Game**

```prisma
model Game {
  id           String     @id @default(uuid())
  roomCode     String     @unique @default(dbgenerated(...))
  player1Id    String
  player2Id    String?
  gameMode     GameMode
  status       GameStatus @default(IN_PROGRESS)
  winnerId     String?
  player1Elo   Int        @default(1000)
  player2Elo   Int        @default(1000)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  lastActiveAt DateTime   @default(now())

  player1 User  @relation("Player1Games", fields: [player1Id], references: [id])
  player2 User? @relation("Player2Games", fields: [player2Id], references: [id])
}
```

**Achievement**

```prisma
model Achievement {
  id         String   @id @default(uuid())
  userId     String
  type       String
  unlockedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

### Enums

```prisma
enum GameMode {
  PVP        // two humans playing locally
  PVC        // human vs CPU
  AI_VS_AI   // Claude vs Gemini
  ONLINE     // two humans playing online
}

enum GameStatus {
  IN_PROGRESS
  COMPLETED
  DRAW
  ABANDONED
}
```

---

## API Endpoints

### Auth

| Method | Route                              | Description                                                         |
| ------ | ---------------------------------- | ------------------------------------------------------------------- |
| POST   | `/api/v1/auth/google`              | Exchange Google OAuth code for JWT token, create user if first time |
| POST   | `/api/v1/auth/logout`              | Invalidate current session and clear tokens                         |
| POST   | `/api/v1/auth/refresh`             | Get a new JWT access token using refresh token before it expires    |
| POST   | `/api/v1/auth/otp`                 | Send OTP code to user's email for verification                      |
| POST   | `/api/v1/auth/otp/verify`          | Verify OTP code and authenticate user                               |
| POST   | `/api/v1/auth/password/reset-link` | Send password reset link to user's email                            |
| POST   | `/api/v1/auth/password/change`     | Change password for authenticated user                              |
| POST   | `/api/v1/auth/password/reset`      | Reset password using reset link token                               |

### Leaderboard

| Method | Route                     | Description                                             |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/api/v1/leaderboard/all` | Get all players ranked by ELO rating, highest to lowest |
| GET    | `/api/v1/leaderboard/me`  | Get current user's position and rank on the leaderboard |

### Achievements

| Method | Route                               | Description                                                      |
| ------ | ----------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/v1/achievements/achievements` | Get all achievements that exist in the app (locked and unlocked) |
| GET    | `/api/v1/achievements/me`           | Get only the achievements the current user has unlocked          |
| GET    | `/api/v1/achievements/:userId`      | Get a specific user's unlocked achievements by their ID          |

### Profile

| Method | Route                                  | Description                                               |
| ------ | -------------------------------------- | --------------------------------------------------------- |
| GET    | `/api/v1/profile`                      | Get the currently logged in user's full profile and stats |
| PUT    | `/api/v1/profile`                      | Update current user's username or avatar                  |
| DELETE | `/api/v1/profile`                      | Soft-delete the current user's profile                    |
| GET    | `/api/v1/profile/:userId`              | Get any user's public profile by their ID                 |
| GET    | `/api/v1/profile/:userId/game-history` | Get a user's past games, wins, losses and draws           |

### Game

| Method | Route                       | Description                                                  |
| ------ | --------------------------- | ------------------------------------------------------------ |
| POST   | `/api/v1/game/create`       | Create a new game room (Returns a 6-char `roomCode`)       |
| POST   | `/api/v1/game/join`         | Join an existing game room via `roomCode`                  |
| GET    | `/api/v1/game/:id`          | Get the current state of a specific game by ID               |
| POST   | `/api/v1/game/:id/move`     | Submit a move (Emits `move_made` to room via Socket.io)     |
| POST   | `/api/v1/game/:id/leave`    | Current player leaves or forfeits the game, opponent wins    |
| POST   | `/api/v1/game/:id/spectate` | Get live game state of an ongoing game to watch in real time |
| POST   | `/api/v1/game/ai`           | Create a new AI vs AI game session between Claude and Gemini |

---

## Game Modes

### Local PVP

Two players on the same device. No backend required for moves — all game logic runs on the frontend via `useReducer`. Backend only saves the final result.

### Player vs CPU

Human plays against the minimax AI with alpha-beta pruning. Four difficulty levels mapped to minimax depth:

| Level        | Minimax Depth |
| ------------ | ------------- |
| Easy         | 1             |
| Medium       | 3             |
| Hard         | 6             |
| Professional | 7             |

### Online Multiplayer

Two real humans on different devices connected via WebSockets. Every move is validated server-side. Handles disconnections, reconnections, and timeouts.

### AI vs AI (Claude vs Gemini)

Claude (player1) and Gemini (player2) play against each other in real time. Users can watch the game live. Each AI receives the current board state and returns a column index. Moves are streamed to the frontend via WebSockets.

---

## Edge Cases

### Auth

- Google token expired on arrival
- Same email registers twice
- JWT tampered with
- Refresh token expired — force logout
- User revokes Google access
- Request with no token hitting protected route

### Game

- Player drops in a full column
- Player sends move when it is not their turn
- Move sent to a finished game
- Player sends move to a game they are not part of
- Two moves sent at the exact same millisecond
- Game ID does not exist
- Player disconnects mid game
- Player tries to resign a finished game
- Board full with no winner — draw not handled

### Multiplayer

- Player internet drops mid game
- Player reconnects after timeout — game forfeited
- Someone tries to join a full game
- Player tries to join their own game as player 2

### AI vs AI

- Claude API is down
- Gemini API is down
- AI suggests a full or invalid column
- AI response is malformed
- One user spamming AI vs AI games — rate limiting needed

### Leaderboard

- Two players with identical ELO — tiebreaker needed
- User with zero games appearing on leaderboard
- ELO dropping below zero — floor at minimum value
- Fake game farming to boost ELO

### Achievements

- Same achievement triggered twice — no duplicates
- Achievement unlocks but DB write fails
- User deleted — achievement cleanup

---

## User Flow

### Auth Flow

```
User opens app
      ↓
Is user logged in?
      ├── Yes → Is JWT valid?
      │             ├── Yes → Enter app
      │             └── No  → Refresh token → Enter app
      └── No  → Show Google OAuth button
                    ↓
               User clicks → Google OAuth screen
                    ↓
               Did user approve?
                    ├── No  → Show error → Back to login
                    └── Yes → Send token to backend
                                   ↓
                              Does user exist in DB?
                                   ├── No  → Create user → JWT → Enter app
                                   └── Yes → Fetch user  → JWT → Enter app
```

### Game Flow

```
User selects game mode
      ├── Local PVP     → Game starts immediately
      ├── vs CPU        → Select difficulty → Game starts
      ├── Online        → Find opponent → Matched → Game starts
      └── AI vs AI      → Watch Claude vs Gemini live

Game Loop:
Player makes move
      ↓
Is move valid?
      ├── No  → Show error → Player tries again
      └── Yes → Update board
                    ↓
               Did someone win?
                    ├── Yes → Update scores → Update ELO
                    │              ↓
                    │         Achievement unlocked?
                    │              ├── Yes → Show notification → Win screen
                    │              └── No  → Win screen
                    │
                    └── No  → Is board full?
                                   ├── Yes → Draw screen
                                   └── No  → Switch turns → repeat
```

---

## Environment Variables

```env
# Backend (.env)
DATABASE_URL="postgresql://username:password@localhost:5432/connect_four"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ANTHROPIC_API_KEY="your-claude-api-key"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
NODE_ENV="development"

# Frontend (.env)
VITE_API_URL="http://localhost:3000"
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- WSL (Ubuntu) or Linux/Mac
- PostgreSQL 16

### Backend Setup

```bash
# 1. Start PostgreSQL (run every time WSL restarts)
sudo service postgresql start

# 2. Clone and install
cd connect-four-backend
npm install

# 3. Set up .env (see Environment Variables above)

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Start dev server
npm run dev
# Server runs on http://localhost:3000

# 7. (Optional) Open Prisma Studio to inspect database
npx prisma studio
# Opens at http://localhost:5555
```

### Frontend Setup

```bash
cd connect-four-game
npm install
npm run dev
# App runs on http://localhost:5173
```

### When You Change the Database Schema

```bash
# Always run both after editing prisma/schema.prisma
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

---

## Build Order / Phases

```
Phase 1 — Auth
  POST /auth/google
  POST /auth/logout
  POST /auth/refresh-token
  Middleware: protect all routes that need a logged in user

Phase 2 — Leaderboard + ELO
  GET /leaderboard
  GET /leaderboard/me
  ELO calculation logic after each game

Phase 3 — Achievements
  GET /achievements
  GET /achievements/me
  Achievement unlock triggers after game ends

Phase 4 — WebSocket Foundation
  ✅ Set up Socket.io on the backend
  ✅ Room management (roomCode generation, join/leave events)
  ✅ Automated Cleanup Service for stale rooms
  ✅ Real-time move synchronization

Phase 5 — AI vs AI
  POST /game/ai
  Claude API integration
  Gemini API integration
  Stream moves to frontend via WebSockets

Phase 6 — Online Multiplayer
  POST /game/create (online mode)
  Matchmaking
  Real time move sync via WebSockets
  Disconnection and reconnection handling

Phase 7 — Spectate Mode
  GET /game/:id/spectate
  Broadcast live game state to spectators via WebSockets
```

---

## AI Context for Prompting

> Use this section when prompting an AI assistant for help on this project. Paste the relevant parts as context.

### Project Summary

This is a full stack Connect Four game platform. Frontend is React + TypeScript + Vite + Tailwind. Backend is Node.js + Express + TypeScript. Database is PostgreSQL managed with Prisma ORM (version 7). Authentication uses Google OAuth + JWT. The game has four modes: local PVP, Player vs CPU (minimax with alpha-beta pruning), Online Multiplayer (WebSockets), and AI vs AI (Claude vs Gemini).

### Key Decisions Made

- Prisma 7 is being used — `DATABASE_URL` lives in `prisma.config.ts` not `schema.prisma`
- Prisma client is generated to `../generated/prisma` not the default location
- `PrismaPg` adapter is used from `@prisma/adapter-pg`
- Frontend game logic runs entirely in `useReducer` inside `GameProvider.tsx`
- CPU AI uses minimax with alpha-beta pruning, depth varies by difficulty level
- UUIDs are used for all primary keys, not auto-increment integers
- ELO starts at 1000 for all new users

### Current File Locations

- Frontend entry: `src/App.tsx`
- Game state: `src/contexts/GameProvider.tsx`
- Backend entry: `src/index.ts`
- Prisma client singleton: `src/config/prisma.ts`
- Database schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Environment variables: `.env`

### Commands Reference

```bash
npm run dev                              # start backend dev server
npx prisma migrate dev --name <name>     # apply schema changes
npx prisma generate                      # regenerate Prisma client
npx prisma studio                        # open database GUI at localhost:5555
sudo service postgresql start            # start PostgreSQL in WSL
```
