import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Verifies the Supabase access token on the Authorization header and attaches
 * the matching row from our own `users` table to `req.appUser`.
 *
 * Expects the user to already have been provisioned via POST /api/auth/sync
 * (called once by the app right after a successful Supabase sign-in). This
 * middleware does not provision users itself, so identity resolution has a
 * single code path.
 */
export const requireAuth = asyncHandler(async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    console.error("requireAuth: Supabase rejected token:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const appUser = await prisma.user.findUnique({
    where: { supabaseUserId: data.user.id },
  });

  if (!appUser) {
    return res.status(401).json({ error: "User not provisioned. Call /api/auth/sync first." });
  }

  if (!appUser.isActive) {
    return res.status(403).json({ error: "User account is disabled" });
  }

  req.appUser = appUser;
  next();
});

/** Restricts a route to one or more roles. Must run after requireAuth. */
export function requireRole(...roles: Array<"SUPER_ADMIN" | "SHOP_OWNER" | "CUSTOMER">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.appUser || !roles.includes(req.appUser.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
