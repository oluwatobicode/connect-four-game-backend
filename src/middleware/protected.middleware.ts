import { NextFunction, Request, Response } from "express";
import { sendError } from "../interfaces/ApiResponse";
import { ERROR_MESSAGES, STATUS_CODE } from "../config/constants.config";
import { verifyAccessToken } from "../utils/jwt.utils";

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_LOGGED_IN);
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = verifyAccessToken(token);

    req.user = decodedToken.userId;

    next();
  } catch (error) {
    next(error);
  }
};
