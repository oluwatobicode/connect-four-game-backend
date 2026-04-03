import { Router } from "express";
import { achievementsController } from "../controllers/index.js";
import { protect } from "../middleware/protected.middleware.js";
const router = Router();
router.get("/", protect, achievementsController.getAllAchievements);
router.get("/me", protect, achievementsController.getMyAchievements);
router.get("/:userId", protect, achievementsController.getAUserAchievement);
export default router;
