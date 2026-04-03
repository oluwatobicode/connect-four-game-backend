import crypto from "crypto";
export const otpCode = () => {
    return crypto.randomInt(100000, 999999 + 1).toString();
};
