import { clearDisconnectTimer, startDisconnectTimer } from "../services/timer.service.js";
// Keep track of which game a user is looking at right now
const activePlayers = new Map(); // Maps a userId to a gameId
const connectedSocketsByUser = new Map();
const debugLog = (...args) => {
    if (process.env.NODE_ENV !== "production") {
        console.log(...args);
    }
};
const registerSocket = (userId, socketId) => {
    const sockets = connectedSocketsByUser.get(userId) ?? new Set();
    sockets.add(socketId);
    connectedSocketsByUser.set(userId, sockets);
};
const unregisterSocket = (userId, socketId) => {
    const sockets = connectedSocketsByUser.get(userId);
    if (!sockets)
        return true;
    sockets.delete(socketId);
    if (sockets.size === 0) {
        connectedSocketsByUser.delete(userId);
        return true;
    }
    return false;
};
export const setupSockets = (io) => {
    // we are listening here
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        registerSocket(userId, socket.id);
        debugLog("socket connected", socket.id, "user:", userId);
        // Join a personal room for private notifications
        socket.join(userId);
        socket.on("disconnect", (reason) => {
            debugLog("socket disconnected", socket.id, "reason:", reason);
            const hasNoActiveSockets = unregisterSocket(userId, socket.id);
            if (!hasNoActiveSockets) {
                return;
            }
            // 1. Did they drop while actively inside a game room?
            const gameId = activePlayers.get(userId);
            activePlayers.delete(userId);
            if (gameId) {
                // 2. Start the 30-second Abandonment clock! ⏳
                startDisconnectTimer(gameId, userId, io);
            }
        });
        // Handle game-specific events here
        socket.on("join_game", (gameId) => {
            if (typeof gameId !== "string" || !gameId.trim()) {
                return;
            }
            const normalizedGameId = gameId.trim();
            socket.join(normalizedGameId);
            // 1. Remember what room they are looking at in RAM
            activePlayers.set(userId, normalizedGameId);
            socket.data.activeGameId = normalizedGameId;
            // 2. THE RESCUE: If they just refreshed their page, this cancels the disconnect timer! 🚀
            clearDisconnectTimer(normalizedGameId, userId);
            debugLog(`User ${userId} joined game room: ${normalizedGameId}`);
            // Notify others in the room
            socket.to(normalizedGameId).emit("player_joined", { userId });
        });
        socket.on("leave_game", (gameId) => {
            if (typeof gameId !== "string" || !gameId.trim()) {
                return;
            }
            const normalizedGameId = gameId.trim();
            socket.leave(normalizedGameId);
            // 1. They clicked a "Back" button or intentionally left 
            if (activePlayers.get(userId) === normalizedGameId) {
                activePlayers.delete(userId);
            }
            if (socket.data.activeGameId === normalizedGameId) {
                delete socket.data.activeGameId;
            }
            clearDisconnectTimer(normalizedGameId, userId);
            debugLog(`User ${userId} left game room: ${normalizedGameId}`);
            // Notify others in the room
            socket.to(normalizedGameId).emit("player_left", { userId });
        });
        socket.on("send_message", (data) => {
            if (!data || typeof data !== "object")
                return;
            const { gameId, message } = data;
            if (typeof message !== "string" || typeof gameId !== "string")
                return;
            if (!message.trim())
                return;
            io.to(gameId).emit("receive_message", {
                userId,
                message: message.trim(),
                timeStamp: new Date(),
            });
            debugLog(`[Chat] Message in ${gameId} from ${userId}`);
        });
    });
};
