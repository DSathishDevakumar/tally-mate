import { Router } from "express";
import { requireAuth } from "../middleware/auth";

// TODO: Payment Tracking module — partial payments, carry-forward balance, payment history.
export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);
