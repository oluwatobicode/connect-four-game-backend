import { Router } from "express";
import { authController } from "../controllers";

const router = Router();

router.post("/auth/google", authController.loginWithGoogle);
router.post("/auth/logout", authController.logout);
router.post("/auth/refresh", authController.refreshToken);
router.post("/auth/otp", authController.sendOtp);
router.post("/auth/otp/verify", authController.verifyOtpWithEmail);
router.post("/auth/password/reset-link", authController.sendResetPasswordLink);
router.post("/auth/password/change", authController.changePassword);
router.post("/auth/password/reset", authController.resetPassword);

export default router;
