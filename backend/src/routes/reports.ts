import { Router } from "express";
import { requireAuth } from "../middleware/auth";

// TODO: Reports & Analytics module — outstanding dues, top customers, product trends.
export const reportsRouter = Router();

reportsRouter.use(requireAuth);
