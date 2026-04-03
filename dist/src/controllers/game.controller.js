import prisma from "../config/prisma.js";
import { STATUS_CODE, ERROR_MESSAGES, GAME, } from "../config/constants.config.js";
import { sendSuccess, sendError } from "../interfaces/ApiResponse.js";
import { createInitialBoard, checkLowestRow, checkWin, } from "../utils/game.utils.js";
import { calculateNewElo } from "../utils/elo.utils.js";
import { getBestMove } from "../utils/minmax.utils.js";
import { checkMatchAchievements } from "../utils/achievements.utils.js";
import { clearTurnTimer, startTurnTimer } from "../services/timer.service.js";
const normalizeRoomCode = (roomCode) => {
    if (typeof roomCode !== "string")
        return null;
    const trimmedRoomCode = roomCode.trim().toUpperCase();
    return trimmedRoomCode ? trimmedRoomCode : null;
};
const isValidColumn = (column) => typeof column === "number" &&
    Number.isInteger(column) &&
    column >= 0 &&
    column < GAME.BOARD_COLS;
// Create a new game session, either PVP or vs CPU
export const createGameRoom = async (req, res, next) => {
    try {
        const userId = req.user;
        const { gameMode } = req.body;
        if (!gameMode) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("gameMode"));
        }
        const game = await prisma.game.create({
            data: {
                player1Id: userId,
                gameMode,
                status: "IN_PROGRESS",
                boardState: createInitialBoard(),
                currentTurn: userId, // Player 1 starts the game
            },
        });
        return sendSuccess(res, STATUS_CODE.CREATED, "Game room created successfully", game);
    }
    catch (error) {
        next(error);
    }
};
//  Get the current state of a specific game by ID
export const getCurrentGameState = async (req, res, next) => {
    try {
        const { id: gameId } = req.params;
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: { select: { id: true, username: true, avatar: true } },
                player2: { select: { id: true, username: true, avatar: true } },
            },
        });
        if (!game)
            return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");
        return sendSuccess(res, STATUS_CODE.Ok, "Fetched game state", game);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// this is for joining a game room
export const joinGameRoom = async (req, res, next) => {
    try {
        const { roomCode } = req.body;
        const userId = req.user;
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        if (!normalizedRoomCode) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("roomCode"));
        }
        const game = await prisma.game.findUnique({
            where: { roomCode: normalizedRoomCode },
        });
        if (!game)
            return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");
        if (game.status !== "IN_PROGRESS") {
            return sendError(res, STATUS_CODE.BAD_REQUEST, "Game is not joinable");
        }
        if (game.player1Id === userId) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, "You are already player 1");
        }
        if (game.player2Id && game.player2Id !== userId) {
            return sendError(res, STATUS_CODE.CONFLICT, "Room is full");
        }
        if (game.player2Id === userId) {
            return sendSuccess(res, STATUS_CODE.Ok, "Joined room", game);
        }
        const joinResult = await prisma.game.updateMany({
            where: {
                id: game.id,
                status: "IN_PROGRESS",
                player2Id: null,
            },
            data: {
                player2Id: userId,
                lastActiveAt: new Date(),
            },
        });
        if (joinResult.count === 0) {
            return sendError(res, STATUS_CODE.CONFLICT, "Room is full");
        }
        const updatedGame = await prisma.game.findUnique({
            where: { id: game.id },
        });
        // this is for emitting a socket event for when a player joins
        if (req.io && updatedGame) {
            req.io.to(game.id).emit("player_joined", { userId });
        }
        return sendSuccess(res, STATUS_CODE.Ok, "Joined room", updatedGame);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// if a player forfeits the game, the opponent wins
export const leaveGameRoom = async (req, res, next) => {
    try {
        const { id: gameId } = req.params;
        const userId = req.user;
        const game = await prisma.game.findUnique({
            where: { id: gameId },
        });
        if (!game)
            return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");
        const isParticipant = game.player1Id === userId || game.player2Id === userId;
        if (!isParticipant) {
            return sendError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.UNAUTHORIZED);
        }
        if (game.status !== "IN_PROGRESS") {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.GAME_ALREADY_ENDED);
        }
        const winnerId = userId === game.player1Id ? game.player2Id : game.player1Id;
        if (!winnerId) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, "Cannot leave a room before another player joins");
        }
        clearTurnTimer(gameId);
        //  set the status to forfeited and handle forfeit
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
                status: "FORFEITED",
                winnerId,
                lastActiveAt: new Date(),
            },
        });
        // this is for emitting a socket event for when a player leaves
        if (req.io) {
            req.io.to(gameId).emit("player_left", { userId });
        }
        return sendSuccess(res, STATUS_CODE.Ok, "Left room", updatedGame);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// this is to get a live game state of an ongoing game via a room code to watch in real time
export const spectateGame = async (req, res, next) => {
    try {
        const { roomCode } = req.body;
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        if (!normalizedRoomCode) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, "Room code is required to spectate");
        }
        const game = await prisma.game.findUnique({
            where: { roomCode: normalizedRoomCode },
            include: {
                player1: { select: { id: true, username: true, avatar: true } },
                player2: { select: { id: true, username: true, avatar: true } },
            },
        });
        if (!game)
            return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");
        // The frontend can now use this 'role' field to hide the player controls!
        return sendSuccess(res, STATUS_CODE.Ok, "Spectating game", {
            ...game,
            role: "SPECTATOR"
        });
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// this is to submit a move (column index) for the current player's turn
export const makeMove = async (req, res, next) => {
    try {
        const { id: gameId } = req.params;
        const { column } = req.body;
        const userId = req.user;
        if (!isValidColumn(column)) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.INVALID_MOVE);
        }
        // 1. Fetch game and validate move
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: true,
                player2: true,
            },
        });
        if (!game)
            return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");
        const isParticipant = game.player1Id === userId || game.player2Id === userId;
        if (!isParticipant) {
            return sendError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.UNAUTHORIZED);
        }
        if (game.status !== "IN_PROGRESS")
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.GAME_ALREADY_ENDED);
        if (game.currentTurn !== userId)
            return sendError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.NOT_YOUR_TURN);
        // 2. Logic to update board
        clearTurnTimer(gameId);
        const board = game.boardState;
        const playerType = game.player1Id === userId ? "player1" : "player2";
        const playerNum = playerType === "player1" ? 1 : 2;
        const row = checkLowestRow(board, column);
        if (row === -1)
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.COLUMN_FULL);
        // this is to drop the disc
        board[column][row] = playerNum;
        const isWin = checkWin(board, column, row, playerType);
        // this is to determine next turn or a game over state.
        // If player2Id is missing in PVP, it's the CPU that is playing!
        let nextTurn = game.currentTurn === game.player1Id
            ? game.player2Id || "CPU"
            : game.player1Id;
        let newStatus = game.status;
        let winnerId = null;
        if (isWin) {
            newStatus = "COMPLETED";
            winnerId = userId;
        }
        else if (game.totalMoves + 1 >= GAME.BOARD_COLS * GAME.BOARD_ROWS) {
            newStatus = "DRAW"; // this is for when the board is full
        }
        // --- this is for the ELO Calculation ---
        let p1NewElo = game.player1.eloRating;
        let p2NewElo = game.player2 ? game.player2.eloRating : 1000;
        if (newStatus === "COMPLETED" || newStatus === "DRAW") {
            let result = "draw";
            if (newStatus === "COMPLETED") {
                result = winnerId === game.player1Id ? "player1_win" : "player2_win";
            }
            const eloUpdate = calculateNewElo(p1NewElo, p2NewElo, result);
            p1NewElo = eloUpdate.newRatingA;
            p2NewElo = eloUpdate.newRatingB;
            // this is to update the User profiles after a game
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: game.player1Id },
                    data: { eloRating: p1NewElo },
                }),
                ...(game.player2Id
                    ? [
                        prisma.user.update({
                            where: { id: game.player2Id },
                            data: { eloRating: p2NewElo },
                        }),
                    ]
                    : []),
            ]);
        }
        // this saves everything back to DB
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
                boardState: board,
                currentTurn: nextTurn,
                totalMoves: { increment: 1 },
                status: newStatus,
                winnerId: winnerId,
                lastActiveAt: new Date(),
                player1Elo: p1NewElo, // Saves snapshot of final ELO to game history
                player2Elo: p2NewElo,
            },
        });
        // 2.5 Trigger Achievements (Asynchronous)
        if (newStatus === "COMPLETED" || newStatus === "DRAW") {
            checkMatchAchievements(game.id).catch(console.error);
        }
        // 3.this is for emitting a socket event for when a player makes a move
        if (req.io) {
            req.io.to(gameId).emit("move_made", {
                playerId: userId,
                column,
                row,
                board,
                isWin,
                newStatus,
            });
        }
        // 4. TRIGGER AI MOVE IF NEEDED
        // If the mode is PVC (Player vs CPU), and it's suddenly the CPU's turn, calculate their move asynchronously!
        if (game.gameMode === "PVC" &&
            nextTurn === "CPU" &&
            newStatus === "IN_PROGRESS") {
            setTimeout(() => triggerCpuMove(game.id, req.io), 1000); // Wait 1 sec to feel "human"
        }
        // 5. START TIMERS FOR PVP/ONLINE MATCHES
        if (game.gameMode !== "PVC" &&
            newStatus === "IN_PROGRESS") {
            startTurnTimer(game.id, nextTurn, req.io);
        }
        return sendSuccess(res, STATUS_CODE.Ok, "Move recorded", updatedGame);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// Helper function for the CPU to think and play
async function triggerCpuMove(gameId, io) {
    try {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game || game.status !== "IN_PROGRESS" || game.currentTurn !== "CPU")
            return;
        // 1. Ask the Minimax AI for the best column
        const board = game.boardState;
        const cpuCol = getBestMove(board, 4); // Depth 4 is a medium-hard difficulty
        const cpuRow = checkLowestRow(board, cpuCol);
        if (cpuRow === -1)
            return; // Should never happen with AI
        // 2. Drop the AI's piece
        board[cpuCol][cpuRow] = 2; // CPU is always considered Player 2 (🟡)
        const isWin = checkWin(board, cpuCol, cpuRow, "player2");
        let newStatus = game.status;
        let winnerId = null;
        if (isWin) {
            newStatus = "COMPLETED";
            winnerId = "CPU"; // The system beat the human
        }
        else if (game.totalMoves + 1 >= GAME.BOARD_COLS * GAME.BOARD_ROWS) {
            newStatus = "DRAW";
        }
        // 3. Save the move to the DB
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
                boardState: board,
                currentTurn: game.player1Id, // Passes the turn back to the Human!
                status: newStatus,
                winnerId: winnerId,
                totalMoves: { increment: 1 },
                lastActiveAt: new Date(),
            },
        });
        // 3.5 Trigger Achievements for the Human if the CPU magically caused a Draw
        if (newStatus === "COMPLETED" || newStatus === "DRAW") {
            checkMatchAchievements(game.id).catch(console.error);
        }
        // 4. Broadcast the CPU's move to the frontend
        if (io) {
            io.to(gameId).emit("move_made", {
                playerId: "CPU",
                column: cpuCol,
                row: cpuRow,
                board,
                isWin,
                newStatus,
            });
        }
    }
    catch (error) {
        console.error("Failed to execute CPU Move:", error);
    }
}
//Create a new AI vs AI game session between Claude and Gemini
export const createAiGameRoom = async (req, res, next) => {
    try {
        return sendSuccess(res, STATUS_CODE.CREATED, "AI Game room created");
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
