import { Router } from "express";
import { requireAuth } from "../middleware/auth";

// TODO: Monthly Billing & Settlement module — compile entries, generate PDF, mark paid/partial/due.
export const billsRouter = Router();

billsRouter.use(requireAuth);
