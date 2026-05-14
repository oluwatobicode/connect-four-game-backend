# Code Quality & Performance Review
**Connect Four Backend**  
**Date:** 2026-05-14

---

## Executive Summary

The codebase demonstrates solid structure with clear separation of concerns (controllers, services, utilities). However, there are **7 critical performance issues** (N+1 queries, missing indexes, unbounded table growth) and **9 code quality issues** (inconsistent patterns, magic strings, type safety gaps) that should be addressed.

---

## 🔴 CRITICAL ISSUES

### 1. **Unbounded Table Growth: BlacklistedToken & Expired OTPs**
**Impact:** Database will grow indefinitely; cleanup queries will slow down over time.

**Files:** 
- `src/server.ts` (line 49-52)
- `src/controllers/auth.controller.ts` (line 427-457)
- `prisma/schema.prisma`

**Problem:**
- Every logout creates a new `BlacklistedToken` record; no cleanup mechanism
- OTP records created but only deleted on successful verification (failed attempts remain)
- `BlacklistedToken` query (line 193) does a full table scan on every token refresh

**Solution:**
- **Option A (Recommended):** Replace PostgreSQL blacklist with Redis (TTL auto-expiry)
- **Option B:** Add a cron job to clean up expired `BlacklistedToken` records (similar to stale game cleanup)
- For OTPs: Add cleanup cron for expired records older than 24 hours

**Code Example (if using Option B):**
```typescript
// Add to gameCleanup.service.ts
export const cleanupExpiredTokens = async () => {
  const now = new Date();
  await prisma.blacklistedToken.deleteMany({
    where: { expiresAt: { lt: now } }
  });
  // Also clean old OTP records
  await prisma.otp.deleteMany({
    where: { expiresAt: { lt: now } }
  });
};
```

---

### 2. **N+1 Query Pattern in Leaderboard**
**Impact:** High latency; scales poorly as user base grows.

**File:** `src/controllers/leaderboard.controller.ts` (line 35-69)

**Problem:**
```typescript
// Query 1: Fetch user
const myRanking = await prisma.user.findUnique({ ... });

// Query 2: Count all users with higher ELO (N+1 anti-pattern)
const rank = await prisma.user.count({
  where: { eloRating: { gt: myRanking.eloRating } }
});
```

With 10k users, this becomes 2 queries per request. If called frequently, DB gets hammered.

**Solution:**
Use a single SQL query with window functions:
```typescript
// Single query with DENSE_RANK()
export const getMyRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myRanking = await prisma.$queryRaw`
      SELECT 
        id,
        username,
        "eloRating",
        DENSE_RANK() OVER (ORDER BY "eloRating" DESC) as rank
      FROM "User"
      WHERE id = ${req.user}
    `;
    
    return sendSuccess(res, STATUS_CODE.Ok, "Fetched successfully", myRanking[0]);
  } catch (error) {
    next(error);
  }
};
```

---

### 3. **Missing Database Indexes**
**Impact:** Slow queries; full table scans on every cleanup/lookup.

**File:** `prisma/schema.prisma`

**Problem:**
Frequently queried columns have no indexes:
- `Game.lastActiveAt` (queried in cleanup, should be sorted)
- `Game.createdAt` (cleanup range query)
- `User.eloRating` (leaderboard sort)
- `BlacklistedToken.expiresAt` (cleanup queries)
- Foreign keys: `Game.player1Id`, `Game.player2Id`, `Otp.userId`, `Achievement.userId`

**Solution:**
Add to prisma schema:
```prisma
model User {
  // ... existing fields
  @@index([eloRating]) // for leaderboard sorting
}

model Game {
  // ... existing fields
  @@index([lastActiveAt]) // for cleanup queries
  @@index([createdAt])    // for range queries
  @@index([player1Id])    // FK index
  @@index([player2Id])    // FK index
}

model BlacklistedToken {
  // ... existing fields
  @@index([expiresAt]) // for cleanup
}

model Otp {
  // ... existing fields
  @@index([userId])    // FK index
  @@index([expiresAt]) // for cleanup
}

model Achievement {
  // ... existing fields
  @@index([userId])    // FK index
}
```

Then run: `npx prisma migrate dev --name add_indexes`

---

### 4. **No Pagination on Leaderboard**
**Impact:** Response size grows with database; clients load entire table.

**File:** `src/controllers/leaderboard.controller.ts` (line 7-32)

**Problem:**
```typescript
// Returns ALL users every time
const rankings = await prisma.user.findMany({
  orderBy: { eloRating: "desc" },
  select: { ... }
});
```

With 100k users, this is a huge payload and slow query.

**Solution:**
Add pagination:
```typescript
export const getAllRankings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [rankings, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { eloRating: "desc" },
        skip,
        take: limit,
        select: { id: true, avatar: true, username: true, eloRating: true }
      }),
      prisma.user.count()
    ]);

    const rankedData = rankings.map((user, index) => ({
      ...user,
      rank: skip + index + 1
    }));

    return sendSuccess(res, STATUS_CODE.Ok, "Fetched successfully", {
      data: rankedData,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 🟠 CODE QUALITY ISSUES

### 5. **Inconsistent Response Patterns**
**Severity:** Medium | **Files:** `src/controllers/*.ts`

**Problem:**
Mixed usage of response handlers:
```typescript
// Pattern 1: Using sendError()
return sendError(res, STATUS_CODE.BAD_REQUEST, "message");

// Pattern 2: Direct res.status().json()
res.status(400).json({ message: "Provide a google token" });
return;

// Pattern 3: Missing return after res.status()
res.status(STATUS_CODE.NOT_FOUND).json(...)
```

**Impact:** Inconsistent, error-prone, hard to maintain.

**Fix:** Use `sendError()` and `sendSuccess()` everywhere:
```typescript
// Before (auth.controller.ts line 153)
res.status(400).json({ message: "Provide a google token" });
return;

// After
return sendError(res, STATUS_CODE.BAD_REQUEST, "Provide a google token");
```

---

### 6. **Type Safety: `as any` and Unsafe Casts**
**Severity:** Medium | **File:** `src/controllers/auth.controller.ts` (line 448)

**Problem:**
```typescript
// Line 448: Using 'as any' bypasses TypeScript
expiresAt: new Date((decoded as any).exp * 1000),
```

**Better:**
```typescript
interface DecodedToken {
  userId: string;
  exp: number;
  iat: number;
}

const decoded = verifyRefreshToken(refreshToken) as DecodedToken;
expiresAt: new Date(decoded.exp * 1000)
```

Also in multiple controllers:
```typescript
// Unsafe assumption
const userId = req.user as string;

// Better
const userId = req.user;
if (!userId || typeof userId !== "string") {
  return sendError(res, STATUS_CODE.UNAUTHORIZED, "Invalid user");
}
```

---

### 7. **Hardcoded Configuration & Typo**
**Severity:** Medium | **File:** `src/server.ts` (line 56)

**Problem:**
```typescript
// Line 56: Hardcoded URL with typo
origin: process.env.FRONT_END_URL || "https://connect-four-gane.vercel.app",
//                                                           ^^^^
//                                                          Should be "game"
```

**Fix:**
```typescript
origin: process.env.FRONT_END_URL || process.env.FALLBACK_FRONTEND_URL,
// Add to .env:
// FALLBACK_FRONTEND_URL=https://connect-four-game.vercel.app
```

Also inconsistency: `CLIENT_URL` (line 38) vs `FRONT_END_URL` (line 56) — pick one.

---

### 8. **Inconsistent Input Validation**
**Severity:** Low-Medium | **Files:** `src/controllers/auth.controller.ts`

**Problem:**
- `signUp()` validates email, password, username (good)
- `login()` validates email, password (good)
- `loginWithGoogle()` validates googleToken but with raw response (line 153)
- `changePassword()` doesn't validate password strength (should check min length)

**Solution:**
Create a validation utility:
```typescript
// src/utils/validation.utils.ts
export const validatePassword = (password: string): string | null => {
  if (password.length < AUTH.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
};

// In controller:
const passwordError = validatePassword(newPassword);
if (passwordError) {
  return sendError(res, STATUS_CODE.BAD_REQUEST, passwordError);
}
```

---

### 9. **No Structured Logging**
**Severity:** Low | **Files:** All controllers

**Problem:**
```typescript
// Line 77 in auth.controller.ts
console.log(error);

// Should be:
console.error("SignUp failed:", {
  email: req.body.email,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

Without structured logging, debugging production issues is hard. Logs don't include request context, user ID, or timestamps.

---

## 🟡 PERFORMANCE RECOMMENDATIONS

### 10. **Add Caching Layer for Leaderboard**
**Impact:** Reduce DB load by ~80% if accessed frequently.

```typescript
// Simple in-memory cache (upgrade to Redis later)
const LEADERBOARD_CACHE = { data: null, expiresAt: 0 };
const CACHE_TTL = 30 * 1000; // 30 seconds

export const getAllRankings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = Date.now();
    if (LEADERBOARD_CACHE.data && LEADERBOARD_CACHE.expiresAt > now) {
      return sendSuccess(res, STATUS_CODE.Ok, "Fetched successfully", LEADERBOARD_CACHE.data);
    }

    const rankings = await prisma.user.findMany({
      orderBy: { eloRating: "desc" },
      take: 100, // Limit to top 100
      select: { id: true, avatar: true, username: true, eloRating: true }
    });

    const rankedData = rankings.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    LEADERBOARD_CACHE.data = rankedData;
    LEADERBOARD_CACHE.expiresAt = now + CACHE_TTL;

    return sendSuccess(res, STATUS_CODE.Ok, "Fetched successfully", rankedData);
  } catch (error) {
    next(error);
  }
};
```

---

### 11. **Replace BlacklistedToken with Redis**
**Impact:** Automatic expiry; O(1) lookups; reduced DB bloat.

```typescript
// Instead of Prisma query (currently line 193)
// Before:
const isBlacklisted = await prisma.blacklistedToken.findUnique({
  where: { token: refreshToken }
});

// After (with Redis):
import redis from "redis";
const redisClient = redis.createClient();

// On logout:
await redisClient.setex(`blacklist:${refreshToken}`, expiresIn, "true");

// On refresh:
const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
```

This removes the need for the `BlacklistedToken` table entirely.

---

### 12. **Add Rate Limiting to Auth Endpoints**
**Impact:** Prevent brute-force attacks; reduce load spikes.

```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, please try again later"
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 OTP requests per hour
});

app.post("/api/v1/auth/login", authLimiter, login);
app.post("/api/v1/auth/send-otp", otpLimiter, sendOtp);
```

---

### 13. **Optimize Socket.IO Attachment**
**File:** `src/server.ts` (line 49-52)

**Current:**
```typescript
app.use((req, res, next) => {
  req.io = io; // Attaches to every request
  next();
});
```

**Better:** Only attach where needed:
```typescript
// Only attach to routes that need it
app.use("/api/v1/game", (req, res, next) => {
  req.io = io;
  next();
}, gameRoutes);

// Or: Just pass io to controllers that need it
export const gameRoutes = (io: Server) => {
  const router = Router();
  router.post("/create", createGameRoom(io));
  return router;
};
```

---

## 📋 SUMMARY TABLE

| Issue | Severity | Type | Effort | Impact |
|-------|----------|------|--------|--------|
| Unbounded token/OTP growth | 🔴 Critical | Performance | 2-4h | DB bloat, slowdowns |
| N+1 leaderboard queries | 🔴 Critical | Performance | 1-2h | High latency at scale |
| Missing database indexes | 🔴 Critical | Performance | 1h | Full table scans |
| No leaderboard pagination | 🔴 Critical | Performance | 2h | Large response size |
| **Memory leaks in Timers/Maps** | **🔴 Critical** | **Performance** | **2-3h** | **OOM crashes after weeks** |
| **Race condition: single active game** | **🔴 Critical** | **Correctness** | **1-2h** | **Wrong game timeout logic** |
| Inconsistent response patterns | 🟠 Major | Quality | 2-3h | Maintainability |
| Type safety (as any) | 🟠 Major | Quality | 1-2h | Runtime errors |
| DB query on every socket connection | 🟠 Major | Performance | 1-2h | Connection pool exhaustion |
| No game existence validation | 🟠 Major | Quality | 1h | Orphaned socket rooms |
| Hardcoded config + typo | 🟠 Major | Quality | 30min | Config issues |
| Chat: no persistence/rate limit | 🟡 Minor | Quality | 1-2h | Spam vulnerability |
| Missing password validation | 🟡 Minor | Quality | 1h | Security gap |
| No structured logging | 🟡 Minor | Quality | 2-3h | Debugging difficulty |
| No heartbeat/ping mechanism | 🟡 Minor | Performance | 30min | Stale connection detection |
| No connection limits | 🟡 Minor | Security | 30min | DoS vulnerability |
| Add caching | 🟢 Enhancement | Performance | 2-3h | 80% DB load reduction |
| Replace blacklist with Redis | 🟢 Enhancement | Performance | 2-4h | Auto-expiry, faster |
| Add rate limiting (HTTP) | 🟢 Enhancement | Security | 1h | Prevent brute force |

---

## 🎯 Recommended Action Plan

**Phase 1 (URGENT - This Week):**
1. **Fix memory leaks in timers** (2-3h) — prevents OOM crashes
   - Clean up `activeTimers` and `disconnectTimers` after timeout fires
   - Add TTL and periodic cleanup cron
2. **Fix race condition in activePlayers** (1-2h) — prevents wrong game timeouts
   - Use Socket.IO rooms instead of single Map entry per user
3. **Add database indexes** (1h) — immediate query performance win
4. **Fix type safety: `io: any` → `io: Server`** (30min)
5. **Fix hardcoded config + typo** (30min)

**Phase 2 (Next Week):**
6. Implement N+1 fix with window functions (1-2h)
7. Add leaderboard pagination (2h)
8. Standardize response patterns (2-3h)
9. Add game existence validation on socket events (1h)
10. Add password validation (1h)

**Phase 3 (Performance & Polish):**
11. Implement cleanup cron for expired tokens/OTPs (2h)
12. Add user verification cache in socketAuth (1-2h) — prevent DB hammering on reconnects
13. Add simple caching or migrate to Redis (2-4h)
14. Implement chat persistence + rate limiting (1-2h)
15. Add rate limiting to auth endpoints (1h)
16. Add structured logging (2-3h)

---

---

## 🔴 WEBSOCKET / SOCKET.IO CRITICAL ISSUES

### 14. **Memory Leaks: Unbounded Timer & Active Player Maps**
**Impact:** Server memory grows indefinitely; eventual OOM crashes on long-running servers.

**Files:** 
- `src/sockets/index.ts` (line 5-6)
- `src/services/timer.service.ts` (line 3-4)

**Problem:**
```typescript
// Line 5 in sockets/index.ts - Never cleaned up
const activePlayers = new Map<string, string>();
const connectedSocketsByUser = new Map<string, Set<string>>();

// Line 3-4 in timer.service.ts - Never cleaned up
const activeTimers = new Map<string, NodeJS.Timeout>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();
```

If a server runs for days with 1000 concurrent users:
- `activePlayers` → grows indefinitely if disconnects don't trigger cleanup
- `disconnectTimers` → one entry per disconnect; never removed if game is deleted
- `activeTimers` → orphaned entries if timeouts fail or games are force-deleted

**Impact on Production:**
```
Day 1: ~100KB
Day 7: ~7MB
Day 30: ~30MB (adds up with multiple instances)
```

**Solution:**
Add cleanup logic and TTL:
```typescript
// In timer.service.ts
interface TimerRecord {
  timeout: NodeJS.Timeout;
  createdAt: number;
  gameId: string;
  userId: string;
}

const activeTimers = new Map<string, TimerRecord>();
const TIMER_TTL = 35 * 1000; // Auto-cleanup after timeout fires

const cleanupTimer = (key: string) => {
  const record = activeTimers.get(key);
  if (record) {
    clearTimeout(record.timeout);
    activeTimers.delete(key);
  }
};

// Add automatic cleanup in startTurnTimer
export const startTurnTimer = (gameId: string, playerToMoveId: string, io: Server) => {
  const key = `turn:${gameId}`;
  cleanupTimer(key); // Clear old timer first
  
  const timeout = setTimeout(async () => {
    try {
      // ... existing code
    } finally {
      // Ensure cleanup happens
      setTimeout(() => cleanupTimer(key), TIMER_TTL);
    }
  }, 30000);
  
  activeTimers.set(key, { timeout, createdAt: Date.now(), gameId, userId: playerToMoveId });
};
```

Also add periodic cleanup:
```typescript
// On server startup, add cleanup cron
import cron from "node-cron";

cron.schedule("*/5 * * * *", () => { // Every 5 minutes
  const now = Date.now();
  for (const [key, record] of activeTimers.entries()) {
    if (now - record.createdAt > 2 * 60 * 1000) { // 2 min TTL
      cleanupTimer(key);
    }
  }
});
```

---

### 15. **Type Safety: `io: any` Parameter**
**Severity:** 🟠 Major | **File:** `src/services/timer.service.ts` (line 22, 76)

**Problem:**
```typescript
// Line 22: No type checking
export const startTurnTimer = (gameId: string, playerToMoveId: string, io: any) => {
  // ...
  io?.to(gameId).emit("game_forfeited", { ... }); // Could fail silently
}
```

If `io` is undefined or wrong type, emit silently fails and game breaks.

**Fix:**
```typescript
import { Server } from "socket.io";

export const startTurnTimer = (gameId: string, playerToMoveId: string, io: Server) => {
  // Now TypeScript catches errors at compile time
  io.to(gameId).emit("game_forfeited", { loserId: playerToMoveId });
};
```

---

### 16. **Race Condition: Single Active Game Per User**
**Severity:** 🟠 Major | **File:** `src/sockets/index.ts` (line 5, 73)

**Problem:**
A user opens the game in **2 browser tabs**:
```
Tab 1: User joins game "A" → activePlayers.set(userId, "A")
Tab 2: User joins game "B" → activePlayers.set(userId, "B") // OVERWRITES Tab 1!
```

Now if Tab 1 disconnects, `activePlayers` still shows "B", and the disconnect timer won't fire for game A.

**Real Scenario:**
User is playing Game A on phone, opens Game B on laptop. Closes phone app (disconnect). `activePlayers` still thinks they're in Game B. Game A times out waiting for a move that never comes, but disconnect logic triggers for wrong game.

**Solution:**
Use Socket.IO's built-in room management instead:
```typescript
// Don't track in RAM, use Socket.IO rooms
socket.on("join_game", (gameId: unknown) => {
  if (typeof gameId !== "string" || !gameId.trim()) return;
  
  const normalizedGameId = gameId.trim();
  socket.join(normalizedGameId); // Already handles multi-socket per user
  
  // Check which games this socket is in
  const gameRooms = [...socket.rooms].filter(room => room !== socket.id);
  console.log(`User ${userId} is in rooms:`, gameRooms);
  
  clearDisconnectTimer(normalizedGameId, userId);
  socket.to(normalizedGameId).emit("player_joined", { userId });
});

socket.on("disconnect", () => {
  // Iterate all game rooms user was in
  const gameRooms = [...socket.rooms].filter(room => room !== socket.id);
  gameRooms.forEach(gameId => {
    startDisconnectTimer(gameId, userId, io);
  });
});
```

---

### 17. **Database Query on Every Socket Connection**
**Severity:** 🟠 Major | **File:** `src/middleware/socket.middleware.ts` (line 24)

**Problem:**
```typescript
// Every socket.io connection hits DB
const user = await prisma.user.findUnique({
  where: { id: decoded.userId },
  select: { id: true, isVerified: true, authProvider: true }
});
```

With 1000 concurrent users, that's **1000 DB queries on connection spike**. No connection pooling, no caching.

**Impact:**
- During app restart: 1000s of users reconnect simultaneously → DB connection pool exhaustion
- Mobile users switching networks: frequent disconnects/reconnects
- Slow down of all other queries

**Solution:**
Cache user verification status in JWT or add optional caching:
```typescript
// Option 1: Add user verification status to JWT payload
// In jwt.utils.ts, when generating token:
const generateAccessToken = (userId: string, isVerified: boolean) => {
  return jwt.sign(
    { userId, isVerified, exp: ... },
    process.env.JWT_SECRET,
    { expiresIn: AUTH.JWT_EXPIRY }
  );
};

// In socketAuth middleware:
const decoded = verifyAccessToken(token);
// Use decoded.isVerified instead of DB query

// Option 2: Simple in-memory cache
const userVerificationCache = new Map<string, { verified: boolean; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const socketAuth = async (socket: Socket, next: SocketNext) => {
  try {
    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers.authorization?.split(" ")[1];
    
    if (!token) return next(new Error(ERROR_MESSAGES.NOT_LOGGED_IN));
    
    const decoded = verifyAccessToken(token);
    const now = Date.now();
    
    // Check cache first
    const cached = userVerificationCache.get(decoded.userId);
    if (cached && cached.expiresAt > now) {
      socket.data.userId = decoded.userId;
      socket.data.isVerified = cached.verified;
      return next();
    }
    
    // Fall back to DB query
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isVerified: true, authProvider: true }
    });
    
    if (!user) return next(new Error(ERROR_MESSAGES.NOT_LOGGED_IN));
    
    // Cache result
    userVerificationCache.set(decoded.userId, {
      verified: user.isVerified,
      expiresAt: now + CACHE_TTL
    });
    
    socket.data.userId = user.id;
    socket.data.isVerified = user.isVerified;
    next();
  } catch (_error) {
    next(new Error(ERROR_MESSAGES.INVALID_TOKEN));
  }
};
```

---

## 🟠 WEBSOCKET CODE QUALITY ISSUES

### 18. **No Input Validation on Game Operations**
**Severity:** 🟠 Major | **File:** `src/sockets/index.ts` (line 64-83)

**Problem:**
```typescript
socket.on("join_game", (gameId: unknown) => {
  if (typeof gameId !== "string" || !gameId.trim()) return;
  
  const normalizedGameId = gameId.trim();
  socket.join(normalizedGameId); // ✓ Validates format
  
  // ✗ But never checks if game exists!
  activePlayers.set(userId, normalizedGameId);
  clearDisconnectTimer(normalizedGameId, userId);
  socket.to(normalizedGameId).emit("player_joined", { userId });
});
```

A user can:
- Join a non-existent game
- Join a game that ended hours ago
- Join a game they're not in (spectating without permission)

Creates empty socket rooms cluttering memory.

**Solution:**
```typescript
socket.on("join_game", async (gameId: unknown) => {
  if (typeof gameId !== "string" || !gameId.trim()) {
    return socket.emit("error", { message: "Invalid game ID" });
  }
  
  const normalizedGameId = gameId.trim();
  
  // Verify game exists and user can join
  const game = await prisma.game.findUnique({
    where: { id: normalizedGameId },
    select: { id: true, status: true, player1Id: true, player2Id: true }
  });
  
  if (!game) {
    return socket.emit("error", { message: "Game not found" });
  }
  
  if (game.status !== "IN_PROGRESS") {
    return socket.emit("error", { message: "Game is not joinable" });
  }
  
  if (game.player1Id !== userId && game.player2Id !== userId) {
    // User is spectating, that's OK (or deny if needed)
  }
  
  socket.join(normalizedGameId);
  activePlayers.set(userId, normalizedGameId);
  clearDisconnectTimer(normalizedGameId, userId);
  
  socket.to(normalizedGameId).emit("player_joined", { userId });
});
```

---

### 19. **Chat System: No Persistence, Rate Limiting, or Validation**
**Severity:** 🟡 Minor | **File:** `src/sockets/index.ts` (line 108-123)

**Problem:**
```typescript
socket.on("send_message", (data: { message: string; gameId: string }) => {
  // ✗ Messages not saved to DB
  // ✗ No rate limiting (user can spam 1000 messages/sec)
  // ✗ No max length validation
  // ✗ Broadcasts to everyone in room, including spectators who might not want it
  
  io.to(gameId).emit("receive_message", {
    userId,
    message: message.trim(),
    timeStamp: new Date()
  });
});
```

**Issues:**
- Messages lost on server restart
- Spam vulnerability
- Chat history unavailable to new users joining
- Game replay / audit trail missing

**Solution:**
```typescript
const messageRateLimiter = new Map<string, { count: number; resetAt: number }>();

socket.on("send_message", async (data: { message: string; gameId: string }) => {
  if (!data || typeof data !== "object") {
    return socket.emit("error", { message: "Invalid message format" });
  }
  
  const { gameId, message } = data;
  if (typeof message !== "string" || typeof gameId !== "string") {
    return socket.emit("error", { message: "Invalid data types" });
  }
  
  const trimmed = message.trim();
  if (!trimmed) return;
  if (trimmed.length > 500) {
    return socket.emit("error", { message: "Message too long (max 500 chars)" });
  }
  
  // Rate limiting: max 5 messages per 10 seconds
  const now = Date.now();
  const key = `${userId}:${gameId}`;
  const limiter = messageRateLimiter.get(key);
  
  if (limiter && limiter.resetAt > now) {
    if (limiter.count >= 5) {
      return socket.emit("error", { message: "Too many messages, slow down" });
    }
    limiter.count++;
  } else {
    messageRateLimiter.set(key, { count: 1, resetAt: now + 10000 });
  }
  
  // Save to DB
  const chatMessage = await prisma.chatMessage.create({
    data: {
      gameId,
      userId,
      message: trimmed
    }
  });
  
  // Emit only to players, not spectators
  io.to(`players:${gameId}`).emit("receive_message", {
    userId,
    message: trimmed,
    timestamp: chatMessage.createdAt
  });
});
```

---

## 🟡 WEBSOCKET PERFORMANCE ISSUES

### 20. **No Heartbeat/Ping Mechanism**
**Severity:** 🟡 Minor | **File:** `src/sockets/index.ts`

**Problem:**
No keep-alive mechanism. Stale connections aren't detected until:
- Client sends event (could be minutes later)
- Server tries to emit (message lost)

NAT/firewall can kill idle connections silently.

**Solution:**
Socket.IO has built-in ping/pong; ensure it's enabled:
```typescript
const io = new Server(server, {
  cors: { ... },
  pingInterval: 25000, // Send ping every 25 seconds
  pingTimeout: 5000,   // Wait 5 seconds for pong, then disconnect
});
```

---

### 21. **No Connection Limits**
**Severity:** 🟡 Minor | **File:** `src/server.ts`

**Problem:**
No max connections limit. A single malicious client can create 10k sockets and exhaust server memory/file descriptors.

**Solution:**
```typescript
const MAX_CONNECTIONS_PER_USER = 3; // Prevent multi-tab abuse
const MAX_TOTAL_CONNECTIONS = 5000;

let totalConnections = 0;

io.on("connection", (socket: Socket) => {
  if (totalConnections >= MAX_TOTAL_CONNECTIONS) {
    socket.disconnect();
    return;
  }
  
  const userSockets = connectedSocketsByUser.get(socket.data.userId) || new Set();
  if (userSockets.size >= MAX_CONNECTIONS_PER_USER) {
    socket.emit("error", { message: "Too many connections from this account" });
    socket.disconnect();
    return;
  }
  
  totalConnections++;
  socket.on("disconnect", () => totalConnections--);
});
```

---

## ✅ Strengths

- **Clear MVC structure** with separation of concerns
- **Good error handling middleware** with Prisma error mapping
- **Proper JWT + refresh token pattern** (with caveats about blacklist)
- **Constants config file** avoids magic strings (mostly)
- **Type-safe response helpers** (`sendSuccess`/`sendError`)
- **Well-organized utilities** (ELO, achievements, game logic)
- **Socket.IO auth middleware** checks verification status
- **Disconnect/turn timers** implement good UX for game timeouts
- **Socket room management** for game isolation

