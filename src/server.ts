import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import prisma from "./config/prisma.js";
import {
  achievementRoutes,
  authRoutes,
  gameRoutes,
  leaderboardRoutes,
  userRoutes,
} from "./routes/index.js";

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Connect Four API is running 🎮 ",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// all-my-endpoints
app.use("/api/v1/auth", authRoutes);

// game-achievements
app.use(`/api/v1/achievements`, achievementRoutes);
app.use("/api/v1/profile", userRoutes);
app.use("/api/v1/leaderboard", leaderboardRoutes);
app.use("/api/v1/game", gameRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
