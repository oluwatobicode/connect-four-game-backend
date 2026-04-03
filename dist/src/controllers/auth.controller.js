import { createLocalUser, loginWithGoogleService, } from "../services/auth.service.js";
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken, verifyRefreshToken, verifyResetPasswordToken, } from "../utils/jwt.utils.js";
import { AUTH, ERROR_MESSAGES, STATUS_CODE, SUCCESS_MESSAGES, USER_MESSAGES, } from "../config/constants.config.js";
import prisma from "../config/prisma.js";
import { sendError, sendSuccess } from "../interfaces/ApiResponse.js";
import bcrypt from "bcrypt";
import { otpCode } from "../utils/otp.utils.js";
import { sendOtpEmail, sendResetPasswordLinkEmail, } from "../services/email.service.js";
// signing up locally
export const signUp = async (req, res, next) => {
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
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
export const login = async (req, res, next) => {
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
        if (!user.password) {
            return res.status(STATUS_CODE.BAD_REQUEST).json({
                message: "This account uses Google sign-in",
            });
        }
        if (!user.isVerified) {
            return res.status(STATUS_CODE.FORBIDDEN).json({
                message: USER_MESSAGES.EMAIL_NOT_VERIFIED,
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
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
    }
    catch (error) {
        console.log(error);
        next(error);
    }
};
// login-signup with google
export const loginWithGoogle = async (req, res, next) => {
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
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const refreshToken = async (req, res, next) => {
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
        // 3) Check if token is blacklisted
        const isBlacklisted = await prisma.blacklistedToken.findUnique({
            where: { token: refreshToken },
        });
        if (isBlacklisted) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, "Token has been revoked");
        }
        // 4) Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId },
        });
        if (!user) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_FOUND("User"));
        }
        if (!user.isVerified) {
            return sendError(res, STATUS_CODE.FORBIDDEN, USER_MESSAGES.EMAIL_NOT_VERIFIED);
        }
        // 5) generate new access token
        const newAccessToken = generateAccessToken(user.id);
        return sendSuccess(res, STATUS_CODE.Ok, "Token refreshed successfully", {
            accessToken: newAccessToken,
        });
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("Email"));
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return sendError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND("User"));
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
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const verifyOtpWithEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("Email and OTP"));
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_FOUND("User"));
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
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.INVALID_OTP);
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });
        await prisma.otp.delete({
            where: { id: otpRecord.id },
        });
        return sendSuccess(res, STATUS_CODE.Ok, USER_MESSAGES.EMAIL_VERIFIED);
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const sendResetPasswordLink = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("Email"));
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return sendError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.NOT_FOUND("User"));
        }
        const resetPasswordToken = generateResetPasswordToken(user.id);
        await sendResetPasswordLinkEmail(email, resetPasswordToken);
        return sendSuccess(res, STATUS_CODE.Ok, "Reset password link sent successfully");
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const changePassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("Token and New password"));
        }
        const decoded = verifyResetPasswordToken(token);
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, AUTH.BCRYPT_SALT_ROUNDS);
        // Update in DB
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { password: hashedPassword },
        });
        return sendSuccess(res, STATUS_CODE.Ok, "Password changed successfully");
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return sendError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.REQUIRED_FIELD("Refresh token"));
        }
        const decoded = verifyRefreshToken(refreshToken);
        await prisma.blacklistedToken.create({
            data: {
                token: refreshToken,
                expiresAt: new Date(decoded.exp * 1000),
            },
        });
        return sendSuccess(res, STATUS_CODE.Ok, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
    }
    catch (err) {
        console.log(err);
        next(err);
    }
};
