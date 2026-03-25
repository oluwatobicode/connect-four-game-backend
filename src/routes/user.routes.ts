import { Router } from "express";
import { userController } from "../controllers";

const router = Router();

router.get("/", userController.getProfile);
router.put("/", userController.updateProfile);
router.delete("/", userController.deleteProfile);
router.get("/:userId", userController.getAUserProfile);
router.get("/:userId/game-history", userController.getAUserGameHistory);

export default router;
