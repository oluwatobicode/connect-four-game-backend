import { GAME } from "../config/constants.config.js";
import { checkLowestRow } from "./game.utils.js";

// Helper: Get all columns that aren't full
export function getValidColumns(grid: number[][]): number[] {
  const validCols: number[] = [];
  for (let col = 0; col < GAME.BOARD_COLS; col++) {
    if (checkLowestRow(grid, col) !== -1) {
      validCols.push(col);
    }
  }
  return validCols;
}

// Helper: Count how many times a specific piece (0, 1, or 2) exists in an array
function count(window: number[], piece: number): number {
  return window.filter((v) => v === piece).length;
}

// ------------------------------------------------------------
// Step A: Evaluate a specific 4-slot "Window"
// ------------------------------------------------------------
export function evaluateWindow(window: number[], playerVal: number): number {
  let score = 0;
  const oppVal = playerVal === 1 ? 2 : 1;
  const empty = 0;

  const pieces = count(window, playerVal);
  const oppPieces = count(window, oppVal);
  const empties = count(window, empty);

  // 1. Reward Good Windows (Player has pieces)
  if (pieces === 4) {
    score += 100; // Found a win! Huge points.
  } else if (pieces === 3 && empties === 1) {
    score += 5; // Good trap setup
  } else if (pieces === 2 && empties === 2) {
    score += 2; // Building a line
  }

  // 2. Penalize Bad Windows (Opponent is about to win!)
  if (oppPieces === 3 && empties === 1) {
    score -= 80; // DANGER! Must block!!
  }

  return score;
}

// ------------------------------------------------------------
// Step B: Scan the entire board and score everything
// ------------------------------------------------------------
export const scorePosition = (grid: number[][], playerVal: number): number => {
  let score = 0;

  // 1. Score the Center Column (Bonus points for holding the middle)
  const centerArray: number[] = [];
  const centerCol = Math.floor(GAME.BOARD_COLS / 2);
  for (let r = 0; r < GAME.BOARD_ROWS; r++) {
    centerArray.push(grid[centerCol][r]);
  }
  const centerCount = count(centerArray, playerVal);
  score += centerCount * 3;

  // 2. Extract Horizontal Windows
  for (let r = 0; r < GAME.BOARD_ROWS; r++) {
    for (let c = 0; c < GAME.BOARD_COLS - 3; c++) {
      const window = [grid[c][r], grid[c + 1][r], grid[c + 2][r], grid[c + 3][r]];
      score += evaluateWindow(window, playerVal);
    }
  }

  // 3. Extract Vertical Windows
  for (let c = 0; c < GAME.BOARD_COLS; c++) {
    for (let r = 0; r < GAME.BOARD_ROWS - 3; r++) {
      const window = [grid[c][r], grid[c][r + 1], grid[c][r + 2], grid[c][r + 3]];
      score += evaluateWindow(window, playerVal);
    }
  }

  // 4. Extract Positive Diagonal Windows (/)
  for (let r = 0; r < GAME.BOARD_ROWS - 3; r++) {
    for (let c = 0; c < GAME.BOARD_COLS - 3; c++) {
      const window = [grid[c][r], grid[c + 1][r + 1], grid[c + 2][r + 2], grid[c + 3][r + 3]];
      score += evaluateWindow(window, playerVal);
    }
  }

  // 5. Extract Negative Diagonal Windows (\)
  for (let r = 0; r < GAME.BOARD_ROWS - 3; r++) {
    for (let c = 0; c < GAME.BOARD_COLS - 3; c++) {
      const window = [grid[c][r + 3], grid[c + 1][r + 2], grid[c + 2][r + 1], grid[c + 3][r]];
      score += evaluateWindow(window, playerVal);
    }
  }

  return score;
};


// ------------------------------------------------------------
// Step C: The Actual AI Brain (Minimax with Alpha-Beta Pruning)
// ------------------------------------------------------------

// Helper to duplicate the board so the AI can test moves without ruining the real game
function copyBoard(board: number[][]): number[][] {
  return board.map((col) => [...col]);
}

export function minimax(
  board: number[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
): { column?: number; score: number } {
  // 1. Find all legal moves
  const validLocations = getValidColumns(board);
  
  // 2. Base case: We reached our depth limit, or the board is totally full
  if (depth === 0 || validLocations.length === 0) {
    return { score: scorePosition(board, 2) }; // Score it from the CPU's (Player 2) perspective!
  }

  // 3. Maximizing Player (The CPU AI trying to get a HIGH score)
  if (isMaximizingPlayer) {
    let bestScore = -Infinity;
    // Pick a random valid column as fallback
    let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];

    for (const col of validLocations) {
      const row = checkLowestRow(board, col);
      const tempBoard = copyBoard(board);
      tempBoard[col][row] = 2; // AI drops a piece

      // If this exact drop wins the game, prioritize it instantly!
      if (scorePosition(tempBoard, 2) >= 100) return { column: col, score: 1000000 };

      // Recursively call minimax for the HUMAN's turn next (isMaximizing = false)
      const result = minimax(tempBoard, depth - 1, alpha, beta, false);
      
      // Keep track of the highest score we find
      if (result.score > bestScore) {
        bestScore = result.score;
        bestCol = col;
      }
      alpha = Math.max(alpha, bestScore);
      if (alpha >= beta) break; // Break out early to save computation time (Alpha-Beta Pruning)
    }
    return { column: bestCol, score: bestScore };
  } 
  
  // 4. Minimizing Player (The Human trying to give the AI a LOW score)
  else {
    let bestScore = Infinity;
    let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];

    for (const col of validLocations) {
      const row = checkLowestRow(board, col);
      const tempBoard = copyBoard(board);
      tempBoard[col][row] = 1; // Human drops a piece

      // If the human dropping here wins the game, it's terrible for the AI!
      if (scorePosition(tempBoard, 1) >= 100) return { column: col, score: -1000000 };

      // Recursively call for AI's turn next
      const result = minimax(tempBoard, depth - 1, alpha, beta, true);

      // Keep track of the lowest score (assuming human plays perfectly to crush the AI)
      if (result.score < bestScore) {
        bestScore = result.score;
        bestCol = col;
      }
      beta = Math.min(beta, bestScore);
      if (alpha >= beta) break; 
    }
    return { column: bestCol, score: bestScore };
  }
}

// ------------------------------------------------------------
// Step D: The Gateway Function for the Controller
// ------------------------------------------------------------
export function getBestMove(board: number[][], difficultyDepth: number = 4): number {
  const validCols = getValidColumns(board);
  if (validCols.length === 0) return 0;
  
  // Kick off the Minimax calculation! 
  // depth = 4 means it looks 4 turns into the future
  const result = minimax(board, difficultyDepth, -Infinity, Infinity, true);
  
  // Return the best column it calculated
  return result.column ?? validCols[0];
}

