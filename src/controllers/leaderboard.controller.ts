import { NextFunction, Request, Response } from "express";

// Get all players ranked by ELO rating, highest to lowest
export const getAllRankings = async (
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

//Get current user's position and rank on the leaderboard
export const getMyRanking = async (
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
