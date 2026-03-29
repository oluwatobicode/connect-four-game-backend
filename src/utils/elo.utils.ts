import { ELO } from "../config/constants.config.js";

/**
 * Calculates new ELO ratings for two players after a match.
 * @param ratingA Player A's current ELO
 * @param ratingB Player B's current ELO
 * @param result "player1_win" | "player2_win" | "draw"
 * @returns { newRatingA: number, newRatingB: number }
 */

export const calculateNewElo = (
  ratingA: number,
  ratingB: number,
  result: "player1_win" | "player2_win" | "draw",
) => {
  // 1. Calculate Expected Scores (Probability of winning)
  // Formula: 1 / (1 + 10^((OpponentRating - MyRating) / 400))
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  // 2. Determine Actual Scores based on outcome (1 for win, 0.5 for draw, 0 for loss)
  let actualScoreA = 0;
  let actualScoreB = 0;

  if (result === "player1_win") {
    actualScoreA = 1;
    actualScoreB = 0;
  } else if (result === "player2_win") {
    actualScoreA = 0;
    actualScoreB = 1;
  } else if (result === "draw") {
    actualScoreA = 0.5;
    actualScoreB = 0.5;
  }

  // 3. Calculate New Ratings using the K-Factor
  // Formula: OldRating + K * (ActualScore - ExpectedScore)
  const newRatingA = Math.max(
    ELO.MIN_RATING,
    Math.round(ratingA + ELO.K_FACTOR * (actualScoreA - expectedScoreA)),
  );

  const newRatingB = Math.max(
    ELO.MIN_RATING,
    Math.round(ratingB + ELO.K_FACTOR * (actualScoreB - expectedScoreB)),
  );

  return { newRatingA, newRatingB };
};
