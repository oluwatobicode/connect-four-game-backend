import { Router } from "express";
import { gameController } from "../controllers/index.js";
import { protect } from "../middleware/protected.middleware.js";

const router = Router();

// Create and join games require authentication
router.post("/create", protect, gameController.createGameRoom);
router.post("/join", protect, gameController.joinGameRoom);
router.get("/:id", gameController.getCurrentGameState);
router.post("/:id/move", protect, gameController.makeMove);
router.post("/:id/leave", protect, gameController.leaveGameRoom);
router.post("/spectate", protect, gameController.spectateGame);
router.post("/ai", protect, gameController.createAiGameRoom);

export default router;
