import { Request, Response } from "express";

export interface ApiResponse<T = unknown> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    statusCode,
    success: true,
    message,
    data,
  });
};

export const sendError = <T>(
  res: Response,
  statusCode: number,
  message: string,
  error?: any,
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    error,
  });
};
