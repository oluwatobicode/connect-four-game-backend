import cron from "node-cron";
import prisma from "../config/prisma.js";

const UNJOINED_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INACTIVE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Deletes stale games from the database.
 * 1. Games with no second player that are older than 30 minutes.
 * 2. Ongoing or forfeited games with no activity for more than 24 hours.
 */
export const cleanupStaleGames = async () => {
  try {
    const now = new Date();
    const unjoinedThreshold = new Date(now.getTime() - UNJOINED_TIMEOUT);
    const inactiveThreshold = new Date(now.getTime() - INACTIVE_TIMEOUT);

    console.log(`[CleanupService] Starting stale game cleanup at ${now.toISOString()}`);

    // Delete unjoined rooms (only player1 present)
    const unjoinedResult = await prisma.game.deleteMany({
      where: {
        player2Id: null,
        createdAt: { lt: unjoinedThreshold },
      },
    });

    // Delete inactive games (already started but no moves/activity)
    const inactiveResult = await prisma.game.deleteMany({
      where: {
        player2Id: { not: null },
        lastActiveAt: { lt: inactiveThreshold },
        status: { in: ["IN_PROGRESS", "FORFEITED", "ABANDONED"] },
      },
    });

    const totalDeleted = unjoinedResult.count + inactiveResult.count;
    if (totalDeleted > 0) {
      console.log(
        `[CleanupService] Cleanup complete. Deleted ${unjoinedResult.count} unjoined and ${inactiveResult.count} inactive games.`,
      );
    } else {
      console.log("[CleanupService] No stale games found.");
    }
  } catch (error) {
    console.error("[CleanupService] Error during cleanup:", error);
  }
};

/**
 * Initializes the cleanup cron job.
 * Runs every 30 minutes.
 */
export const initCleanupJob = () => {
  // Run every 30 minutes: '*/30 * * * *'
  cron.schedule("*/30 * * * *", () => {
    cleanupStaleGames();
  });
  
  console.log("[CleanupService] Stale game cleanup job scheduled (every 30 mins).");
  
  // Also run once on startup
  cleanupStaleGames();
};
