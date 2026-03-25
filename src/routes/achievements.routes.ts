import { Router } from "express";
import { achievementsController } from "../controllers";

const router = Router();

router.get("/achievements", achievementsController.getAllAchievements);
router.get("/achievements/me", achievementsController.getMyAchievements);
router.get("/achievements/:userId", achievementsController.getAUserAchievement);

export default router;
