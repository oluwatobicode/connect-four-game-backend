import { sendError } from "../interfaces/ApiResponse.js";
import { ERROR_MESSAGES, STATUS_CODE, USER_MESSAGES } from "../config/constants.config.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";
import prisma from "../config/prisma.js";
export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_LOGGED_IN);
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId },
            select: {
                id: true,
                isVerified: true,
                authProvider: true,
            },
        });
        if (!user) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_LOGGED_IN);
        }
        if (user.authProvider !== "google" && !user.isVerified) {
            return sendError(res, STATUS_CODE.FORBIDDEN, USER_MESSAGES.EMAIL_NOT_VERIFIED);
        }
        req.user = user.id;
        next();
    }
    catch (error) {
        next(error);
    }
};
