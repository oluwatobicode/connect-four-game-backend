import prisma from './src/config/prisma.js';
import { createInitialBoard, checkLowestRow, checkWin } from './src/utils/game.utils.js';

// Helper to print the board nicely
function printBoard(board: number[][]) {
  console.log("\nBoard State:");
  // Start from top row (5) down to bottom (0)
  for (let row = 5; row >= 0; row--) {
    let rowStr = "| ";
    for (let col = 0; col < 7; col++) {
      const cell = board[col][row];
      const char = cell === 1 ? "🔴" : cell === 2 ? "🟡" : "⚫";
      rowStr += char + " ";
    }
    console.log(rowStr + "|");
  }
  console.log("  0  1  2  3  4  5  6 \n");
}

async function runSimulation() {
  console.log("🎮 Starting Connect Four Sandbox Simulation 🎮");

  let board = createInitialBoard();
  printBoard(board);

  // A sequence of moves designed to make Player 1 (Red) win vertically in Column 3
  const simulatedMoves = [
    { player: "player1" as const, col: 3 }, // P1 drops in 3
    { player: "player2" as const, col: 4 }, // P2 drops in 4
    { player: "player1" as const, col: 3 }, // P1 drops in 3
    { player: "player2" as const, col: 5 }, // P2 drops in 5
    { player: "player1" as const, col: 3 }, // P1 drops in 3
    { player: "player2" as const, col: 1 }, // P2 drops in 1
    { player: "player1" as const, col: 3 }, // P1 drops in 3 -> WIN!
  ];

  for (let i = 0; i < simulatedMoves.length; i++) {
    const move = simulatedMoves[i];
    const playerNum = move.player === "player1" ? 1 : 2;
    const playerEmoji = move.player === "player1" ? "🔴" : "🟡";

    console.log(`\nMove ${i + 1}: ${playerEmoji} drops a disc in column ${move.col}`);

    // 1. Get gravity row
    const row = checkLowestRow(board, move.col);
    if (row === -1) {
      console.log(`Column ${move.col} is full! Move skipped.`);
      continue;
    }

    // 2. Apply move
    board[move.col][row] = playerNum;
    printBoard(board);

    // 3. Check for win
    const isWin = checkWin(board, move.col, row, move.player);
    if (isWin) {
      console.log(`🎉 🏆 TEAM ${playerEmoji} WINS THE GAME ON MOVE ${i + 1}! 🏆 🎉`);
      break;
    }
  }

  await prisma.$disconnect();
}

runSimulation().catch(console.error);
