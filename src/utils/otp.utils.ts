import crypto from "crypto";

export const otpCode = (): string => {
  return crypto.randomInt(100000, 999999 + 1).toString();
};
