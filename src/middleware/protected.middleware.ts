import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.utils";

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = verifyAccessToken(token);

    req.user = decodedToken.userId;

    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
};
