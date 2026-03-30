import prisma from "../config/prisma.js";

/**
 * Checks for newly unlocked achievements after a game completes.
 * Iterates over the players involved and grants them new badges
 * if they met the required conditions.
 */
export async function checkMatchAchievements(gameId: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!game || (game.status !== "COMPLETED" && game.status !== "DRAW"))
      return;

    // Build the list of humans to check (Don't check achievements for the CPU!)
    const humanPlayers = [game.player1Id];
    if (game.player2Id) humanPlayers.push(game.player2Id);

    for (const userId of humanPlayers) {
      // Get what the user already has unlocked so we don't grant duplicates
      const existing = await prisma.achievement.findMany({ where: { userId } });
      const unlockedTypes = new Set(existing.map((a) => a.type));
      const newlyUnlocked: string[] = [];

      // Determine user's match stats
      const userElo =
        userId === game.player1Id
          ? game.player1.eloRating
          : game.player2?.eloRating;
      const opponentElo =
        userId === game.player1Id
          ? game.player2?.eloRating
          : game.player1.eloRating;
      const isWinner = game.winnerId === userId;
      const isDraw = game.status === "DRAW";

      // -------------------------------------------------------------
      // CONDITION CHECKS (Matching IDs from achievements.config.ts)
      // -------------------------------------------------------------

      if (isWinner && !unlockedTypes.has("first_win")) {
        newlyUnlocked.push("first_win");
      }

      if (isDraw && !unlockedTypes.has("first_draw")) {
        newlyUnlocked.push("first_draw");
      }

      if (
        isWinner &&
        game.totalMoves < 20 &&
        !unlockedTypes.has("win_under_20")
      ) {
        newlyUnlocked.push("win_under_20");
      }

      if (userElo && userElo >= 1200 && !unlockedTypes.has("reach_1200")) {
        newlyUnlocked.push("reach_1200");
      }

      if (userElo && userElo >= 1500 && !unlockedTypes.has("reach_1500")) {
        newlyUnlocked.push("reach_1500");
      }

      if (
        isWinner &&
        opponentElo &&
        opponentElo - userElo! >= 200 &&
        !unlockedTypes.has("beat_higher_elo")
      ) {
        newlyUnlocked.push("beat_higher_elo");
      }

      // NOTE: "play_10_games" and "win_streak_3" would require a slightly deeper DB query
      // (counting total Games or checking recent Game history). Skipping for Phase 5 to keep it lightweight.

      // ------------------------------------------------------------o
      // SAVE TO DATABASE
      // -------------------------------------------------------------
      if (newlyUnlocked.length > 0) {
        await prisma.achievement.createMany({
          data: newlyUnlocked.map((type) => ({ userId, type })),
        });
      }
    }
  } catch (error) {
    console.error("Failed to check achievements:", error);
  }
}
