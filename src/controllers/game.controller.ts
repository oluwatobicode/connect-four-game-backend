import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { STATUS_CODE, ERROR_MESSAGES } from "../config/constants.config.js";
import { sendSuccess, sendError } from "../interfaces/ApiResponse.js";

// Create a new game session, either PVP or vs CPU
export const createGameRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user;
    const { gameMode } = req.body;

    if (!gameMode) {
      return sendError(
        res,
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.REQUIRED_FIELD("gameMode"),
      );
    }

    const game = await prisma.game.create({
      data: {
        player1Id: userId as string,
        gameMode,
        status: "IN_PROGRESS",
      },
    });

    return sendSuccess(
      res,
      STATUS_CODE.CREATED,
      "Game room created successfully",
      game,
    );
  } catch (error) {
    next(error);
  }
};

//  Get the current state of a specific game by ID
export const getCurrentGameState = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: gameId } = req.params;
    const game = await prisma.game.findUnique({
      where: { id: gameId as string },
      include: {
        player1: { select: { id: true, username: true, avatar: true } },
        player2: { select: { id: true, username: true, avatar: true } },
      },
    });

    if (!game) return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");

    return sendSuccess(res, STATUS_CODE.Ok, "Fetched game state", game);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// this is for joining a game room
export const joinGameRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { roomCode } = req.body;
    const userId = req.user as string;

    const game = await prisma.game.findUnique({
      where: { roomCode: (roomCode as string).toUpperCase() },
    });
    if (!game) return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");


    if (game.player1Id === userId) {
      return sendError(
        res,
        STATUS_CODE.BAD_REQUEST,
        "You are already player 1",
      );
    }

    if (game.player2Id && game.player2Id !== userId) {
      return sendError(res, STATUS_CODE.CONFLICT, "Room is full");
    }

    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: { player2Id: userId },
    });

    // Emit socket event
    if (req.io) {
      req.io.to(game.id).emit("player_joined", { userId });
    }


    return sendSuccess(res, STATUS_CODE.Ok, "Joined room", updatedGame);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Current player forfeits the game, opponent wins
export const leaveGameRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.user as string;

    const game = await prisma.game.findUnique({
      where: { id: gameId as string },
    });
    if (!game) return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");

    // Logic to set status and handle forfeit
    const updatedGame = await prisma.game.update({
      where: { id: gameId as string },
      data: { status: "FORFEITED" },
    });

    // Emit socket event
    if (req.io) {
      req.io.to(gameId as string).emit("player_left", { userId });
    }

    return sendSuccess(res, STATUS_CODE.Ok, "Left room", updatedGame);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Get live game state of an ongoing game to watch in real time
export const spectateGame = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: gameId } = req.params;
    return sendSuccess(res, STATUS_CODE.Ok, "Spectating game", { gameId });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Submit a move (column index) for the current player's turn
export const makeMove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: gameId } = req.params;
    const { column } = req.body;
    const userId = req.user as string;

    if (column === undefined) {
      return sendError(
        res,
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.REQUIRED_FIELD("column"),
      );
    }

    // 1. Fetch game and validate move
    const game = await prisma.game.findUnique({
      where: { id: gameId as string },
    });
    if (!game) return sendError(res, STATUS_CODE.NOT_FOUND, "Game not found");

    // 2. Logic to update board (Simplified for foundation stage)

    // 3. Emit socket event
    if (req.io) {
      req.io.to(gameId as string).emit("move_made", {
        playerId: userId,
        column,
      });
    }

    return sendSuccess(res, STATUS_CODE.Ok, "Move recorded", { column });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

//Create a new AI vs AI game session between Claude and Gemini
export const createAiGameRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    return sendSuccess(res, STATUS_CODE.CREATED, "AI Game room created");
  } catch (error) {
    console.log(error);
    next(error);
  }
};
