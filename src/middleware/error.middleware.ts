import { NextFunction, Request, Response } from "express";
import { sendError } from "../interfaces/ApiResponse";
import { ERROR_MESSAGES, STATUS_CODE } from "../config/constants.config";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

const getPrismaErrorMessage = (errorCode?: string) => {
  if (errorCode === "P2002") {
    return "A record with this value already exists";
  }

  if (errorCode === "P2025") {
    return ERROR_MESSAGES.NOT_FOUND("Record");
  }

  return ERROR_MESSAGES.SERVER_ERROR;
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  return sendError(
    res,
    STATUS_CODE.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
  );
};

export const globalErrorHandler = (
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = error.statusCode ?? STATUS_CODE.INTERNAL_SERVER_ERROR;

  if (res.headersSent) {
    return;
  }

  if (error.name === "TokenExpiredError") {
    return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.TOKEN_EXPIRED);
  }

  if (error.name === "JsonWebTokenError") {
    return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.INVALID_TOKEN);
  }

  if (error.name === "PrismaClientKnownRequestError") {
    return sendError(
      res,
      statusCode === STATUS_CODE.INTERNAL_SERVER_ERROR
        ? STATUS_CODE.BAD_REQUEST
        : statusCode,
      getPrismaErrorMessage(error.code),
      process.env.NODE_ENV === "development" ? error.message : undefined,
    );
  }

  return sendError(
    res,
    statusCode,
    error.message || ERROR_MESSAGES.SERVER_ERROR,
    process.env.NODE_ENV === "development" ? error.stack : undefined,
  );
};
