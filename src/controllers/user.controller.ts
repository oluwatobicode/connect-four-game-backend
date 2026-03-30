import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { STATUS_CODE, ERROR_MESSAGES } from "../config/constants.config.js";
import { sendSuccess, sendError } from "../interfaces/ApiResponse.js";

// get current logged in user profile
// get current logged in user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        eloRating: true,
        createdAt: true,
        _count: {
          select: {
            gamesAsPlayer1: true,
            gamesAsPlayer2: true,
            achievements: true
          }
        }
      }
    });

    if (!user) return sendError(res, STATUS_CODE.NOT_FOUND, "User not found");

    return sendSuccess(res, STATUS_CODE.Ok, "Profile fetched successfully", user);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// update currently logged in user profile
// update currently logged in user profile
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user as string;
    const { username, avatar } = req.body;

    if (username) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser && existingUser.id !== userId) {
        return sendError(res, STATUS_CODE.CONFLICT, "Username is already taken");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        eloRating: true,
      }
    });

    return sendSuccess(res, STATUS_CODE.Ok, "Profile updated successfully", updatedUser);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// soft-delete currently logged in user profile
// soft-delete currently logged in user profile
export const deleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, STATUS_CODE.NOT_FOUND, "User not found");

    // Soft-delete: Randomize identity but preserve ID so games don't brick
    await prisma.user.update({
      where: { id: userId },
      data: {
        username: `Deleted_User_${userId.substring(0, 5)}`,
        email: `deleted_${userId}@anonymized.com`,
        password: null,
        avatar: null,
      }
    });

    return sendSuccess(res, STATUS_CODE.Ok, "Profile deleted successfully");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get a specific user profile by id (Public Data Only)
export const getAUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = String(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        eloRating: true,
        createdAt: true,
        _count: {
          select: {
            gamesAsPlayer1: true,
            gamesAsPlayer2: true,
            achievements: true
          }
        }
      }
    });

    if (!user) return sendError(res, STATUS_CODE.NOT_FOUND, "User not found");

    return sendSuccess(res, STATUS_CODE.Ok, "Public profile fetched successfully", user);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// get a game history of a specific user by id
export const getAUserGameHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = String(req.params.userId);

    const games = await prisma.game.findMany({
      where: {
        status: { in: ["COMPLETED", "DRAW", "ABANDONED", "FORFEITED"] },
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        player1: { select: { id: true, username: true, avatar: true } },
        player2: { select: { id: true, username: true, avatar: true } },
      }
    });

    return sendSuccess(res, STATUS_CODE.Ok, "Game history fetched successfully", games);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
