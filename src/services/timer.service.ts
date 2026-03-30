import prisma from "../config/prisma.js";

const activeTimers = new Map<string, NodeJS.Timeout>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

export const clearTurnTimer = (gameId: string) => {
  if (activeTimers.has(gameId)) {
    const timer = activeTimers.get(gameId);

    if (timer) {
      clearTimeout(timer);
    }
    activeTimers.delete(gameId);
  }
};

export const startTurnTimer = (
  gameId: string,
  playerToMoveId: string,
  io: any,
) => {
  clearTurnTimer(gameId);
  const timer = setTimeout(async () => {
    // 🚨 THIS CODE RUNS IF THEY RUN OUT OF TIME! 🚨
    // 1. Double check the DB to make sure the game didn't already end.
    const game = await prisma.game.findUnique({
      where: {
        id: gameId,
      },
    });

    if (!game) {
      throw new Error("No game found");
      //   return sendError(null, STATUS_CODE.NOT_FOUND, "Game not found");
    }
    // 2. If it's STILL their turn, update the DB so they Forfeit and the other player gets the Win!
    if (game.currentTurn === playerToMoveId) {
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: "FORFEITED",
          winnerId:
            game.player1Id === playerToMoveId ? game.player2Id : game.player1Id,
          lastActiveAt: new Date(),
        },
      });

      // 4. Emit a Socket.io event to the room: io.to(gameId).emit("game_forfeited", { loserId: playerToMoveId });
      io.to(gameId).emit("game_forfeited", { loserId: playerToMoveId });
    }
    // 3. (Optional) Run your checkMatchAchievements and update ELO.
  }, 30000);
  activeTimers.set(gameId, timer);
};

// DISCONNECTION TIMERS (For socket dropping / app closing)

export const clearDisconnectTimer = (gameId: string) => {
  if (disconnectTimers.has(gameId)) {
    const timer = disconnectTimers.get(gameId);
    if (timer) clearTimeout(timer);
    disconnectTimers.delete(gameId);
  }
};

export const startDisconnectTimer = (
  gameId: string,
  droppingUserId: string,
  io: any,
) => {
  clearDisconnectTimer(gameId); // prevent duplicates

  const timer = setTimeout(async () => {
    // 🚨 THIS CODE RUNS IF THEY DON'T RECONNECT IN 30 SECONDS! 🚨
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    // If the game is already over or doesn't exist, we don't care that they dropped
    if (!game || game.status !== "IN_PROGRESS") return;

    // Give the win to whoever DID NOT drop!
    const winnerId =
      game.player1Id === droppingUserId ? game.player2Id : game.player1Id;

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: "ABANDONED",
        winnerId: winnerId, // They win by default!
        lastActiveAt: new Date(),
      },
    });

    // Tell the lobby that the game was officially abandoned
    io.to(gameId).emit("game_abandoned", { loserId: droppingUserId });
  }, 30000); // Give them 30 seconds to get back on Wi-Fi

  disconnectTimers.set(gameId, timer);
};
