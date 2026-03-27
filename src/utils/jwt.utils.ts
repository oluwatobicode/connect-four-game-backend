import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

// generate access token (short lived)
export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRY as StringValue,
  });
};

// generate refresh token (long lived)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "30d",
  });
};

// checks if the access token is valid
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
};

// checks if the refresh token is valid
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
    userId: string;
  };
};

// refresh token being added to reset password link
export const generateResetPasswordToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });
};

export const verifyResetPasswordToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as {
    userId: string;
  };
};
