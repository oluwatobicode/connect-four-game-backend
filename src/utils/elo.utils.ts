/*

ratingChange = k * (actualResult - expectedResult)

what is k? 

The Elo rating K-factor is a constant determining the maximum rating
points a player can gain or lose in a single match (The K-factor is the maximum number
of points you can gain or lose in one sitting.)

NB 1-> HIGH-K FACTOR ARE ASSIGNED TO NEW PLAYERS
e.g K-factor = 40 -> If they win their first game, their score jumps up by 40 points.

NB 2-> LOW K-FACTOR ARE ASSIGNED TO OLD PLAYERS THAT HAVE BEEN PLAYING FOR A WHILE
K-factor = 10 -> If they lose one game because they got distracted, their score only drops by 10 points.

what is ActualResult?

1. Actual Result -> This is the simple truth of how the game ended
(
Win = 1
Draw = 0.5
Loss = 0
)

2) expected result -> This is a prediction made before the game starts, based on the players' current ratings. 
It represents the probability of a player winning, expressed as a number between 0 and 1

If ratings are equal: The expected result for both is 0.5 (a 50% chance of winning).
If you are much stronger: Your expected result might be 0.9 (a 90% chance of winning).
If you are much weaker: Your expected result might be 0.1 (a 10% chance of winning)

to calculate the expectedResult
expectedResult = (1 / (1 + 10^((ratingB - ratingA) / 400)))

*/
// CASES TO BUILD
// If a Pro (high rating) loses to a Noob (low rating), that is a big surprise. (RatingChange = K * (ActualResult - ExpectedResult))

// this is to calculate the expectedResult

import { ELO } from "../config/constants.config";

const calculateExpectedResult = (ratingA: number, ratingB: number) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

export function eloRatingSystem(
  k: number = ELO.K_FACTOR,
  playerRating: number,
  opponentRating: number,

  gameState: "WIN" | "LOSS" | "DRAW",
) {
  const actualResult = gameState === "WIN" ? 1 : gameState === "DRAW" ? 0.5 : 0;

  const expectedResult = calculateExpectedResult(playerRating, opponentRating);

  const ratingChange = Math.round(k * (actualResult - expectedResult));

  const newRating = Math.max(playerRating + ratingChange, 100);

  return { ratingChange, newRating };
}

export function updateBothRating(
  player1Rating: number,
  player2Rating: number,
  result: "PLAYER1_WIN" | "PLAYER2_WIN" | "DRAW",
) {
  const p1State =
    result === "PLAYER1_WIN"
      ? "WIN"
      : result === "PLAYER2_WIN"
        ? "LOSS"
        : "DRAW";
  const p2State =
    result === "PLAYER2_WIN"
      ? "WIN"
      : result === "PLAYER1_WIN"
        ? "LOSS"
        : "DRAW";

  const p1 = eloRatingSystem(
    ELO.K_FACTOR,
    player1Rating,
    player2Rating,
    p1State,
  );
  const p2 = eloRatingSystem(
    ELO.K_FACTOR,
    player2Rating,
    player1Rating,
    p2State,
  );

  return { p1, p2 };
}
