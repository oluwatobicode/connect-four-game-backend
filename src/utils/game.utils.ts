import { GAME } from "../config/constants.config";

export const createInitialBoard = (): number[][] => {
  // We use 7 columns, each containing 6 rows.
  // This makes column-based access much easier!
  return Array.from({ length: GAME.BOARD_COLS }, () =>
    Array(GAME.BOARD_ROWS).fill(0),
  );
};

export const checkLowestRow = (grid: number[][], column: number): number => {
  // Start from the bottom (index 0) and go up to the top (index 5)
  for (let row = 0; row < GAME.BOARD_ROWS; row++) {
    if (grid[column][row] === 0) {
      return row;
    }
  }

  return -1; // Column is full
};

export const checkWin = (
  grid: number[][],
  column: number,
  row: number,
  player: "player1" | "player2",
): boolean => {};

export const isColumnFull = (grid: number[][], column: number): boolean => {
  return grid[column][GAME.BOARD_ROWS - 1] !== 0;
};
