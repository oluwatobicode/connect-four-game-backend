import { Router } from "express";
import { leaderboardController } from "../controllers";

const router = Router();

router.get("/all", leaderboardController.getAllRankings);
router.get("/me", leaderboardController.getMyRanking);

export default router;
