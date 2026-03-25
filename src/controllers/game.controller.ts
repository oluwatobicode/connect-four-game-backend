import { NextFunction, Request, Response } from "express";

// Create a new game session, either PVP or vs CPU
export const createGameRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
  } catch (error) {
    console.log(error);
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
  } catch (error) {
    console.log(error);
    next(error);
  }
};
