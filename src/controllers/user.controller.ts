import { NextFunction, Request, Response } from "express";

// get current logged in user profile
export const getProfile = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// update currently logged in user profile
export const updateProfile = (
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

// soft-delete currently logged in user profile
export const deleteProfile = (
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

// get a specific user profile by id
export const getAUserProfile = (
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

// get a game history of a specific user by id
export const getAUserGameHistory = (
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
