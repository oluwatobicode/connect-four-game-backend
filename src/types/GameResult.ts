export interface GameResult {
  winnerId: string | null;
  loserId: string | null;
  isDraw: boolean;
  totalMoves: number;
  winnerElo: number;
  loserElo: number;
}
