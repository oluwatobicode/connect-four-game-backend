import { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.utils.js";
import { ERROR_MESSAGES } from "../config/constants.config.js";

type SocketNext = (err?: Error) => void;

export const socketAuth = (socket: Socket, next: SocketNext) => {
  try {
    const tokenFromAuth = socket.handshake.auth?.token;
    const headerAuth = socket.handshake.headers.authorization;
    const tokenFromHeader =
      typeof headerAuth === "string" && headerAuth.startsWith("Bearer ")
        ? headerAuth.split(" ")[1]
        : undefined;

    const token = tokenFromAuth || tokenFromHeader;

    if (!token) {
      return next(new Error(ERROR_MESSAGES.NOT_LOGGED_IN));
    }

    const decoded = verifyAccessToken(token);
    socket.data.userId = decoded.userId;

    next();
  } catch (_error) {
    next(new Error(ERROR_MESSAGES.INVALID_TOKEN));
  }
};
