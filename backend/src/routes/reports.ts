import { Router } from "express";
import { getCustomerStatement, listCustomerReports } from "../controllers/reportsController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("SHOP_OWNER"));

reportsRouter.get("/customers", asyncHandler(listCustomerReports));
reportsRouter.get("/customers/:id", asyncHandler(getCustomerStatement));
