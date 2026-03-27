import { NextFunction, Request, Response } from "express";
import {
  createLocalUser,
  loginWithGoogleService,
} from "../services/auth.service";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils";
import {
  AUTH,
  ERROR_MESSAGES,
  STATUS_CODE,
  SUCCESS_MESSAGES,
  USER_MESSAGES,
} from "../config/constants.config";
import prisma from "../config/prisma";
import { sendError, sendSuccess } from "../interfaces/ApiResponse";
import bcrypt from "bcrypt";
import { otpCode } from "../utils/otp.utils";
import { sendOtpEmail } from "../services/email.service";

// signing up locally
export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: ERROR_MESSAGES.REQUIRED_FIELD("email, password, username"),
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: ERROR_MESSAGES.DUPLICATE_ENTRY("Email"),
      });
    }

    const user = await createLocalUser(email, password, username);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const otp = otpCode();

    await prisma.otp.create({
      data: {
        otp,
        userId: user.id,
        expiresAt: new Date(Date.now() + AUTH.OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await sendOtpEmail(email, otp);

    return res.status(201).json({
      message: USER_MESSAGES.CHECK_EMAIL,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: ERROR_MESSAGES.REQUIRED_FIELD("email, password"),
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: ERROR_MESSAGES.NOT_FOUND("User"),
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password as string,
    );

    if (!isPasswordValid) {
      return res.status(STATUS_CODE.UNAUTHORIZED).json({
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const { password: _, ...safeUser } = user;

    return res.status(200).json({
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// login-signup with google
export const loginWithGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      res.status(400).json({ message: "Provide a google token" });
      return;
    }

    const user = await loginWithGoogleService(googleToken);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.status(201).json({
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1) get refresh token from body
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: ERROR_MESSAGES.REQUIRED_FIELD("Refresh token"),
      });
    }

    // 2)validate if refresh token is valid
    const decodedToken = verifyRefreshToken(refreshToken);

    // 3)Fetch user from DB

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
    });

    if (!user) {
      return sendError(
        res,
        STATUS_CODE.UNAUTHORIZED,
        ERROR_MESSAGES.NOT_FOUND("User"),
      );
    }

    // 4) generate new access token
    const newAccessToken = generateAccessToken(user.id);

    return sendSuccess(res, STATUS_CODE.Ok, "Token refreshed successfully", {
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(
        res,
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.REQUIRED_FIELD("Email"),
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendError(
        res,
        STATUS_CODE.NOT_FOUND,
        ERROR_MESSAGES.NOT_FOUND("User"),
      );
    }

    if (user.isVerified) {
      return sendSuccess(res, STATUS_CODE.Ok, "Email is already verified");
    }

    const otp = otpCode();

    await prisma.otp.create({
      data: {
        otp,
        userId: user.id,
        expiresAt: new Date(Date.now() + AUTH.OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await sendOtpEmail(email, otp);

    return sendSuccess(res, STATUS_CODE.Ok, "OTP sent successfully");
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const verifyOtpWithEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(
        res,
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.REQUIRED_FIELD("Email and OTP"),
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendError(
        res,
        STATUS_CODE.UNAUTHORIZED,
        ERROR_MESSAGES.NOT_FOUND("User"),
      );
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        otp,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return sendError(
        res,
        STATUS_CODE.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_OTP,
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    await prisma.otp.delete({
      where: { id: otpRecord.id },
    });

    return sendSuccess(res, STATUS_CODE.Ok, USER_MESSAGES.EMAIL_VERIFIED);
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const sendResetPasswordLink = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const changePassword = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
  } catch (err) {
    console.log(err);
    next(err);
  }
};
