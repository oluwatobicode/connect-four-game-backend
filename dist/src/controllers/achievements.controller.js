import prisma from "../config/prisma.js";
import { ACHIEVEMENTS } from "../config/achievements.config.js";
import { STATUS_CODE } from "../config/constants.config.js";
import { sendSuccess, sendError } from "../interfaces/ApiResponse.js";
// get all user achievements
export const getAllAchievements = (req, res, next) => {
    try {
        return sendSuccess(res, STATUS_CODE.Ok, "Fetched all achievements", ACHIEVEMENTS);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// get my achievements
export const getMyAchievements = async (req, res, next) => {
    try {
        const userId = req.user;
        if (!userId) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, "Unauthorized");
        }
        const myAchievements = await prisma.achievement.findMany({
            where: { userId },
            select: { type: true, unlockedAt: true },
            orderBy: { unlockedAt: 'desc' },
        });
        const populated = myAchievements.map((a) => {
            const config = ACHIEVEMENTS.find((c) => c.id === a.type);
            return { ...config, unlockedAt: a.unlockedAt };
        });
        return sendSuccess(res, STATUS_CODE.Ok, "Fetched my achievements", populated);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// get a specific user achievements
export const getAUserAchievement = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const userAchievements = await prisma.achievement.findMany({
            where: { userId: userId },
            select: { type: true, unlockedAt: true },
            orderBy: { unlockedAt: 'desc' },
        });
        const populated = userAchievements.map((a) => {
            const config = ACHIEVEMENTS.find((c) => c.id === a.type);
            return { ...config, unlockedAt: a.unlockedAt };
        });
        return sendSuccess(res, STATUS_CODE.Ok, "Fetched user achievements", populated);
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
