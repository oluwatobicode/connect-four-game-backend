import { Server, Socket } from "socket.io";

export const setupSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("socket connected", socket.id, "user:", socket.data.userId);

    // Join a personal room for private notifications
    socket.join(socket.data.userId);

    socket.on("disconnect", (reason) => {
      console.log("socket disconnected", socket.id, "reason:", reason);
    });

    // Handle game-specific events here
    socket.on("join_game", (gameId: string) => {
      socket.join(gameId);
      console.log(`User ${socket.data.userId} joined game room: ${gameId}`);
      
      // Notify others in the room
      socket.to(gameId).emit("player_joined", { userId: socket.data.userId });
    });

    socket.on("leave_game", (gameId: string) => {
      socket.leave(gameId);
      console.log(`User ${socket.data.userId} left game room: ${gameId}`);
      
      // Notify others in the room
      socket.to(gameId).emit("player_left", { userId: socket.data.userId });
    });
  });
};
