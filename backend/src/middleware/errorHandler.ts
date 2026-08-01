import type { NextFunction, Request, Response } from "express";

// Last-resort catch-all. Route handlers should return proper 4xx responses for
// expected failures (validation, not-found); anything reaching here is unexpected.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
