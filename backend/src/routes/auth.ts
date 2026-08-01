import { Router } from "express";
import { getMe, syncUser } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

authRouter.post("/sync", asyncHandler(syncUser));
authRouter.get("/me", requireAuth, asyncHandler(getMe));
