import { Router } from "express";
import { createPayment, listPayments } from "../controllers/paymentsController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth, requireRole("SHOP_OWNER"));

paymentsRouter.get("/", asyncHandler(listPayments));
paymentsRouter.post("/", asyncHandler(createPayment));
