declare namespace Express {
  interface Request {
    user?: string; // userId from JWT
  }
}
