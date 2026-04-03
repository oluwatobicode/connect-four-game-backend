import { GAME } from "../config/constants.config.js";

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
  col: number,
  row: number,
  player: "player1" | "player2",
): boolean => {
  const playerVal = player === "player1" ? 1 : 2;
  const numCols = GAME.BOARD_COLS;
  const numRows = GAME.BOARD_ROWS;

  // 1. HORIZONTAL (-)
  let count = 1;
  for (let c = col + 1; c < numCols && grid[c][row] === playerVal; c++) count++;
  for (let c = col - 1; c >= 0 && grid[c][row] === playerVal; c--) count++;
  if (count >= 4) return true;

  // 2. VERTICAL (|)
  count = 1;
  // We only need to check down because discs are dropped from above
  for (let r = row - 1; r >= 0 && grid[col][r] === playerVal; r--) count++;
  if (count >= 4) return true;

  // 3. DIAGONAL UP (/)
  count = 1;
  for (
    let i = 1;
    col + i < numCols &&
    row + i < numRows &&
    grid[col + i][row + i] === playerVal;
    i++
  )
    count++;
  for (
    let i = 1;
    col - i >= 0 && row - i >= 0 && grid[col - i][row - i] === playerVal;
    i++
  )
    count++;
  if (count >= 4) return true;

  // 4. DIAGONAL DOWN (\)
  count = 1;
  for (
    let i = 1;
    col + i < numCols && row - i >= 0 && grid[col + i][row - i] === playerVal;
    i++
  )
    count++;
  for (
    let i = 1;
    col - i >= 0 && row + i < numRows && grid[col - i][row + i] === playerVal;
    i++
  )
    count++;
  if (count >= 4) return true;

  return false;
};

export const isColumnFull = (grid: number[][], column: number): boolean => {
  return grid[column][GAME.BOARD_ROWS - 1] !== 0;
};

/* 
Column = vertical strip, index 0 to 6 → 7 columns total
Row = horizontal strip, index 0 to 5 → 6 rows total  — row 0 is the bottom, row 5 is the top. 

And the one extra thing to lock in — row 0 is the bottom, row 5 is the top. 
Because discs fall down, so the first slot to fill in any column is at the bottom (index 0), 
and it stacks upward from there.

row 5  [ ][ ][ ][ ][ ][ ][ ]   ← top
row 4  [ ][ ][ ][ ][ ][ ][ ]
row 3  [ ][ ][ ][ ][ ][ ][ ]
row 2  [ ][ ][ ][ ][ ][ ][ ]
row 1  [ ][ ][ ][ ][ ][ ][ ]
row 0  [ ][ ][ ][ ][ ][ ][ ]   ← bottom (discs land here first)
       c0 c1 c2 c3 c4 c5 c6

*/
