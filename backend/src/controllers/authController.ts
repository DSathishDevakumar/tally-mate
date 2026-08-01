import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { supabaseAdmin } from "../config/supabase";

/**
 * POST /api/auth/sync
 *
 * Called by the app once, right after a successful Supabase sign-in, to
 * create (or fetch) the matching row in our own `users` table.
 *
 * Phase-1 bootstrap rule: this app starts with a single shop. If no Shop
 * exists yet, the first person to sync becomes that Shop's SHOP_OWNER and a
 * placeholder Shop row is created for them to rename in Settings. Once
 * proper Super Admin shop onboarding exists, replace this with an invite-based
 * flow instead of "first user owns the shop".
 */
export async function syncUser(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const supabaseUser = data.user;
  const email = supabaseUser.email;
  if (!email) {
    return res.status(400).json({ error: "Supabase user has no email" });
  }

  const existing = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });
  if (existing) {
    return res.json({ user: existing });
  }

  const name =
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    (supabaseUser.user_metadata?.name as string | undefined) ??
    email;

  const shopCount = await prisma.shop.count();

  const user = await prisma.$transaction(async (tx) => {
    let shopId: string | null = null;

    if (shopCount === 0) {
      const shop = await tx.shop.create({
        data: {
          name: `${name}'s Shop`,
          ownerName: name,
        },
      });
      shopId = shop.id;
    }

    return tx.user.create({
      data: {
        supabaseUserId: supabaseUser.id,
        email,
        name,
        role: "SHOP_OWNER",
        shopId,
      },
    });
  });

  return res.status(201).json({ user });
}

/** GET /api/auth/me — returns the signed-in app user (requires requireAuth). */
export async function getMe(req: Request, res: Response) {
  return res.json({ user: req.appUser });
}
