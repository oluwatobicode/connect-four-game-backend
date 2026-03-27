import { Router } from "express";
import { leaderboardController } from "../controllers";
import { protect } from "../middleware/protected.middleware";

const router = Router();

router.get("/all", leaderboardController.getAllRankings);
router.get("/me", protect, leaderboardController.getMyRanking);

export default router;
