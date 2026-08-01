import { Router } from "express";
import { createCustomer, getCustomer, listCustomers, updateCustomer } from "../controllers/customersController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const customersRouter = Router();

customersRouter.use(requireAuth, requireRole("SHOP_OWNER"));

customersRouter.get("/", asyncHandler(listCustomers));
customersRouter.post("/", asyncHandler(createCustomer));
customersRouter.get("/:id", asyncHandler(getCustomer));
customersRouter.patch("/:id", asyncHandler(updateCustomer));
