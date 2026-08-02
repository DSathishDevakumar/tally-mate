import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

// Last-resort catch-all. Route handlers should return proper 4xx responses for
// expected failures (validation, not-found); anything reaching here is unexpected.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof MulterError || (err instanceof Error && err.message === "Only audio files are allowed")) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
