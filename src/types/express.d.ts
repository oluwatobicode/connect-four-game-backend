import { Server } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      user?: string; // userId from JWT
      io?: Server;
    }
  }
}

