import { Router } from "express";
import { leaderboardController } from "../controllers/index.js";
import { protect } from "../middleware/protected.middleware.js";
const router = Router();
router.get("/all", leaderboardController.getAllRankings);
router.get("/me", protect, leaderboardController.getMyRanking);
export default router;
