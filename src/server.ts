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
import {
  globalErrorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { setupSockets } from "./sockets/index.js";
import { Server } from "socket.io";
import http from "http";
import { socketAuth } from "./middleware/socket.middleware.js";
import { initCleanupJob } from "./services/gameCleanup.service.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

const app: Application = express();
const PORT = process.env.PORT || 5000;

// start-stale-game-cleanup
// initCleanupJob();

// create a http server and pass it to socket.io
const server = http.createServer(app);

// Initialize Socket.IO by passing the http server instance
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.use(socketAuth);

// Set up socket handlers
setupSockets(io);

// Attach io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173" ||
      "https://connect-four-gane.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

// Load and serve Swagger UI documentation
const swaggerDocument = YAML.load(path.join(process.cwd(), "swagger.yml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

app.use(notFoundHandler);
app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
