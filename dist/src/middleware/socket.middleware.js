import { verifyAccessToken } from "../utils/jwt.utils.js";
import { ERROR_MESSAGES, USER_MESSAGES } from "../config/constants.config.js";
import prisma from "../config/prisma.js";
export const socketAuth = async (socket, next) => {
    try {
        const tokenFromAuth = socket.handshake.auth?.token;
        const headerAuth = socket.handshake.headers.authorization;
        const tokenFromHeader = typeof headerAuth === "string" && headerAuth.startsWith("Bearer ")
            ? headerAuth.split(" ")[1]
            : undefined;
        const token = tokenFromAuth || tokenFromHeader;
        if (!token) {
            return next(new Error(ERROR_MESSAGES.NOT_LOGGED_IN));
        }
        const decoded = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                isVerified: true,
                authProvider: true,
            },
        });
        if (!user) {
            return next(new Error(ERROR_MESSAGES.NOT_LOGGED_IN));
        }
        if (user.authProvider !== "google" && !user.isVerified) {
            return next(new Error(USER_MESSAGES.EMAIL_NOT_VERIFIED));
        }
        socket.data.userId = user.id;
        next();
    }
    catch (_error) {
        next(new Error(ERROR_MESSAGES.INVALID_TOKEN));
    }
};
