import jwt from "jsonwebtoken";
// generate access token (short lived)
export const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY,
    });
};
// generate refresh token (long lived)
export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "30d",
    });
};
// checks if the access token is valid
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
// checks if the refresh token is valid
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
// refresh token being added to reset password link
export const generateResetPasswordToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });
};
export const verifyResetPasswordToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
