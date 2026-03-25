import { Router } from "express";
import { gameController } from "../controllers";

const router = Router();

router.post("/create", gameController.createGameRoom);
router.post("/join", gameController.joinGameRoom);
router.get("/:id", gameController.getCurrentGameState);
router.post("/:id/move", gameController.makeMove);
router.post("/:id/leave", gameController.leaveGameRoom);
router.post("/:id/spectate", gameController.spectateGame);
router.post("/ai", gameController.createAiGameRoom);

export default router;
