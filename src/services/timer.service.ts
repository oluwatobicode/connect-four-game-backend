import prisma from "../config/prisma.js";

const activeTimers = new Map<string, NodeJS.Timeout>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const getDisconnectTimerKey = (gameId: string, userId: string) =>
  `${gameId}:${userId}`;

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
    try {
      const game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
      });

      if (!game || game.status !== "IN_PROGRESS") {
        return;
      }

      if (game.currentTurn === playerToMoveId) {
        await prisma.game.update({
          where: { id: gameId },
          data: {
            status: "FORFEITED",
            winnerId:
              game.player1Id === playerToMoveId
                ? game.player2Id
                : game.player1Id,
            lastActiveAt: new Date(),
          },
        });

        io?.to(gameId).emit("game_forfeited", { loserId: playerToMoveId });
      }
    } catch (error) {
      console.error("Failed to process turn timeout:", error);
    } finally {
      activeTimers.delete(gameId);
    }
  }, 30000);
  activeTimers.set(gameId, timer);
};

// DISCONNECTION TIMERS (For socket dropping / app closing)

export const clearDisconnectTimer = (gameId: string, userId: string) => {
  const timerKey = getDisconnectTimerKey(gameId, userId);

  if (disconnectTimers.has(timerKey)) {
    const timer = disconnectTimers.get(timerKey);
    if (timer) clearTimeout(timer);
    disconnectTimers.delete(timerKey);
  }
};

export const startDisconnectTimer = (
  gameId: string,
  droppingUserId: string,
  io: any,
) => {
  const timerKey = getDisconnectTimerKey(gameId, droppingUserId);
  clearDisconnectTimer(gameId, droppingUserId);

  const timer = setTimeout(async () => {
    try {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game || game.status !== "IN_PROGRESS") return;

      const winnerId =
        game.player1Id === droppingUserId ? game.player2Id : game.player1Id;

      await prisma.game.update({
        where: { id: gameId },
        data: {
          status: "ABANDONED",
          winnerId,
          lastActiveAt: new Date(),
        },
      });

      io?.to(gameId).emit("game_abandoned", { loserId: droppingUserId });
    } catch (error) {
      console.error("Failed to process disconnect timeout:", error);
    } finally {
      disconnectTimers.delete(timerKey);
    }
  }, 30000); // Give them 30 seconds to get back on Wi-Fi

  disconnectTimers.set(timerKey, timer);
};
