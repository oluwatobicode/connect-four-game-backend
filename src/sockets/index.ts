import { Server, Socket } from "socket.io";
import { clearDisconnectTimer, startDisconnectTimer } from "../services/timer.service.js";

// Keep track of which game a user is looking at right now
const activePlayers = new Map<string, string>(); // Maps a userId to a gameId

export const setupSockets = (io: Server) => {
  // we are listening here
  io.on("connection", (socket: Socket) => {
    console.log("socket connected", socket.id, "user:", socket.data.userId);

    // Join a personal room for private notifications
    socket.join(socket.data.userId);

    socket.on("disconnect", (reason) => {
      console.log("socket disconnected", socket.id, "reason:", reason);

      // 1. Did they drop while actively inside a game room?
      const gameId = activePlayers.get(socket.data.userId);
      if (gameId) {
        // 2. Start the 30-second Abandonment clock! ⏳
        startDisconnectTimer(gameId, socket.data.userId, io);
      }
    });

    // Handle game-specific events here
    socket.on("join_game", (gameId: string) => {
      socket.join(gameId);
      
      // 1. Remember what room they are looking at in RAM
      activePlayers.set(socket.data.userId, gameId); 

      // 2. THE RESCUE: If they just refreshed their page, this cancels the disconnect timer! 🚀
      clearDisconnectTimer(gameId);

      console.log(`User ${socket.data.userId} joined game room: ${gameId}`);

      // Notify others in the room
      socket.to(gameId).emit("player_joined", { userId: socket.data.userId });
    });

    socket.on("leave_game", (gameId: string) => {
      socket.leave(gameId);

      // 1. They clicked a "Back" button or intentionally left 
      activePlayers.delete(socket.data.userId);

      console.log(`User ${socket.data.userId} left game room: ${gameId}`);

      // Notify others in the room
      socket.to(gameId).emit("player_left", { userId: socket.data.userId });
    });

    socket.on("send_message", (data: { message: string; gameId: string }) => {
      const { gameId, message } = data;

      if (!message.trim()) return;

      io.to(gameId).emit("receive_message", {
        userId: socket.data.userId,
        message: message.trim(),
        timeStamp: new Date(),
      });

      console.log(`[Chat] Message in ${gameId} from ${socket.data.userId}`);
    });
  });
};
