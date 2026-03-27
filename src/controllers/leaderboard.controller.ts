import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";
import { STATUS_CODE } from "../config/constants.config";
import { sendSuccess } from "../interfaces/ApiResponse";

// Get all players ranked by ELO rating, highest to lowest
export const getAllRankings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rankings = await prisma.user.findMany({
      orderBy: { eloRating: "desc" },
      select: {
        id: true,
        avatar: true,
        username: true,
        eloRating: true,
      },
    });

    const rankedData = rankings.map((user, index: number) => {
      return { ...user, rank: index + 1 };
    });

    return sendSuccess(res, STATUS_CODE.Ok, "Fetched successfully", rankedData);
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
    // const { userId } = req.user;

    const myRanking = await prisma.user.findUnique({
      where: { id: req.user },
      select: {
        id: true,
        username: true,
        eloRating: true,
      },
    });

    if (!myRanking) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const rank = await prisma.user.count({
      where: { eloRating: { gt: myRanking.eloRating } },
    });

    return res.status(STATUS_CODE.Ok).json({
      success: true,
      message: "Fetched successfully",
      data: { ...myRanking, rank: rank + 1 },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
