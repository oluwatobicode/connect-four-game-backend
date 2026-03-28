import prisma from "../config/prisma";
import { ACHIEVEMENTS } from "../config/achievements.config";

interface GameResult {
  winnerId: string | null;
  loserId: string | null;
  isDraw: boolean;
  totalMoves: number;
  winnerElo: number;
  loserElo: number;
}

// Check and unlock achievements after a game ends
export const checkAchievements = async (
  userId: string,
  gameResult: GameResult,
) => {
  const newlyUnlocked: typeof ACHIEVEMENTS = [];

  // Get user's existing achievements
  const existingAchievements = await prisma.achievement.findMany({
    where: { userId },
    select: { type: true },
  });

  const alreadyUnlocked = new Set(existingAchievements.map((a) => a.type));

  // Helper to unlock an achievement if not already unlocked
  const tryUnlock = async (achievementId: string) => {
    if (alreadyUnlocked.has(achievementId)) return;

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return;

    await prisma.achievement.create({
      data: { userId, type: achievementId },
    });

    newlyUnlocked.push(achievement);
  };

  // Get user stats
  const totalWins = await prisma.game.count({
    where: { winnerId: userId },
  });

  const totalGames = await prisma.game.count({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: { in: ["COMPLETED", "DRAW"] },
    },
  });

  const totalDraws = await prisma.game.count({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: "DRAW",
    },
  });

  // --- Check each achievement ---

  // First Blood — first win
  if (totalWins === 1 && gameResult.winnerId === userId) {
    await tryUnlock("first_win");
  }

  // Stalemate — first draw
  if (totalDraws === 1 && gameResult.isDraw) {
    await tryUnlock("first_draw");
  }

  // Veteran — 10 games played
  if (totalGames >= 10) {
    await tryUnlock("play_10_games");
  }

  // Dedicated — 50 games played
  if (totalGames >= 50) {
    await tryUnlock("play_50_games");
  }

  // Giant Killer — beat someone 200+ ELO above you
  if (
    gameResult.winnerId === userId &&
    gameResult.loserElo - gameResult.winnerElo >= 200
  ) {
    await tryUnlock("beat_higher_elo");
  }

  // Speed Demon — win in under 20 moves
  if (gameResult.winnerId === userId && gameResult.totalMoves < 20) {
    await tryUnlock("win_under_20");
  }

  // Rising Star — reach 1200 ELO
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { eloRating: true },
  });

  if (user && user.eloRating >= 1200) {
    await tryUnlock("reach_1200");
  }

  // Elite — reach 1500 ELO
  if (user && user.eloRating >= 1500) {
    await tryUnlock("reach_1500");
  }

  // Win streaks — check last N games
  if (gameResult.winnerId === userId) {
    const recentGames = await prisma.game.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { winnerId: true },
    });

    const consecutiveWins = recentGames.filter(
      (g) => g.winnerId === userId,
    ).length;

    // Check from the start — if any non-win, break the streak
    let streak = 0;
    for (const game of recentGames) {
      if (game.winnerId === userId) streak++;
      else break;
    }

    if (streak >= 3) await tryUnlock("win_streak_3");
    if (streak >= 5) await tryUnlock("win_streak_5");
  }

  return newlyUnlocked;
};
