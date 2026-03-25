import { NextFunction, Request, Response } from "express";

// get all user achievements
export const getAllAchievements = (
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

// get my achievements
export const getMyAchievements = (
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

// get a specific user achievements
export const getAUserAchievement = (
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
