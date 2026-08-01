import { Router } from "express";
import { requireAuth } from "../middleware/auth";

// TODO: Product/Price Catalog module — editable product list with standard prices.
export const productsRouter = Router();

productsRouter.use(requireAuth);
