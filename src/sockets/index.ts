import { Server, Socket } from "socket.io";
import prisma from "../config/prisma.js";
import {
  clearDisconnectTimer,
  startDisconnectTimer,
} from "../services/timer.service.js";

// userId -> set of gameIds the user is currently inside
const activePlayers = new Map<string, Set<string>>();
const connectedSocketsByUser = new Map<string, Set<string>>();

// socketId -> recent message timestamps (for chat rate limiting)
const recentMessages = new Map<string, number[]>();
const CHAT_WINDOW_MS = 10_000;
const CHAT_MAX_PER_WINDOW = 5;
const CHAT_MAX_LENGTH = 500;

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

const registerSocket = (userId: string, socketId: string) => {
  const sockets = connectedSocketsByUser.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  connectedSocketsByUser.set(userId, sockets);
};

const unregisterSocket = (userId: string, socketId: string) => {
  const sockets = connectedSocketsByUser.get(userId);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    connectedSocketsByUser.delete(userId);
    return true;
  }

  return false;
};

const addActiveGame = (userId: string, gameId: string) => {
  const games = activePlayers.get(userId) ?? new Set<string>();
  games.add(gameId);
  activePlayers.set(userId, games);
};

const removeActiveGame = (userId: string, gameId: string) => {
  const games = activePlayers.get(userId);
  if (!games) return;
  games.delete(gameId);
  if (games.size === 0) activePlayers.delete(userId);
};

const isParticipant = async (userId: string, gameId: string) => {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { player1Id: true, player2Id: true },
  });
  if (!game) return false;
  return game.player1Id === userId || game.player2Id === userId;
};

export const setupSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    registerSocket(userId, socket.id);

    debugLog("socket connected", socket.id, "user:", userId);

    // Join a personal room for private notifications
    socket.join(userId);

    socket.on("disconnect", (reason) => {
      debugLog("socket disconnected", socket.id, "reason:", reason);
      recentMessages.delete(socket.id);

      const hasNoActiveSockets = unregisterSocket(userId, socket.id);
      if (!hasNoActiveSockets) return;

      // User dropped completely — start disconnect timer for every game they were in
      const games = activePlayers.get(userId);
      if (!games) return;

      const gameIds = Array.from(games);
      activePlayers.delete(userId);

      for (const gameId of gameIds) {
        startDisconnectTimer(gameId, userId, io);
      }
    });

    socket.on("join_game", async (gameId: unknown) => {
      if (typeof gameId !== "string" || !gameId.trim()) return;
      const normalizedGameId = gameId.trim();

      const game = await prisma.game.findUnique({
        where: { id: normalizedGameId },
        select: { id: true, status: true, player1Id: true, player2Id: true },
      });

      if (!game || game.status !== "IN_PROGRESS") {
        socket.emit("join_error", { reason: "Game not joinable" });
        return;
      }

      socket.join(normalizedGameId);
      addActiveGame(userId, normalizedGameId);

      // If they refreshed / reconnected, cancel any pending disconnect timer
      clearDisconnectTimer(normalizedGameId, userId);

      debugLog(`User ${userId} joined game room: ${normalizedGameId}`);
      socket.to(normalizedGameId).emit("player_joined", { userId });
    });

    socket.on("leave_game", (gameId: unknown) => {
      if (typeof gameId !== "string" || !gameId.trim()) return;
      const normalizedGameId = gameId.trim();

      socket.leave(normalizedGameId);
      removeActiveGame(userId, normalizedGameId);
      clearDisconnectTimer(normalizedGameId, userId);

      debugLog(`User ${userId} left game room: ${normalizedGameId}`);
      socket.to(normalizedGameId).emit("player_left", { userId });
    });

    socket.on("send_message", async (data: { message: string; gameId: string }) => {
      if (!data || typeof data !== "object") return;
      const { gameId, message } = data;
      if (typeof gameId !== "string" || typeof message !== "string") return;

      const trimmed = message.trim();
      if (!trimmed || trimmed.length > CHAT_MAX_LENGTH) return;

      // Rate limit: max N messages per window per socket
      const now = Date.now();
      const recent = (recentMessages.get(socket.id) ?? []).filter(
        (t) => now - t < CHAT_WINDOW_MS,
      );
      if (recent.length >= CHAT_MAX_PER_WINDOW) return;
      recent.push(now);
      recentMessages.set(socket.id, recent);

      // Only participants of the game can chat in its room
      if (!(await isParticipant(userId, gameId))) return;

      io.to(gameId).emit("receive_message", {
        userId,
        message: trimmed,
        timeStamp: new Date(),
      });

      debugLog(`[Chat] Message in ${gameId} from ${userId}`);
    });
  });
};
