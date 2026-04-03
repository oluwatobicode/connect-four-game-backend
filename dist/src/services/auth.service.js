import { OAuth2Client } from "google-auth-library";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { AUTH } from "../config/constants.config.js";
export const loginWithGoogleService = async (googleToken) => {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    // 1. Verify the Google token
    const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new Error("Invalid Google token");
    }
    const { sub: googleId, email, name, picture } = payload;
    // 2) find or create a user
    let user = await prisma.user.findUnique({
        where: { googleId },
    });
    if (!user) {
        user = await prisma.user.findUnique({
            where: { email },
        });
    }
    if (user) {
        user = await prisma.user.update({
            where: { email },
            data: {
                googleId,
                authProvider: "google",
                avatar: picture ?? user.avatar,
            },
        });
    }
    else {
        user = await prisma.user.create({
            data: {
                email,
                username: name ?? email.split("@")[0],
                avatar: picture,
                authProvider: "google",
                googleId,
                isVerified: true,
            },
        });
    }
    return user;
};
export const createLocalUser = async (email, password, username) => {
    const hashedPassword = await bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);
    return prisma.user.create({
        data: {
            email,
            username,
            password: hashedPassword,
            authProvider: "local",
        },
    });
};
