import { Router } from "express";
import { createEntry, deleteEntry, listEntries, updateEntry } from "../controllers/entriesController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const entriesRouter = Router();

entriesRouter.use(requireAuth, requireRole("SHOP_OWNER"));

entriesRouter.get("/", asyncHandler(listEntries));
entriesRouter.post("/", asyncHandler(createEntry));
entriesRouter.patch("/:id", asyncHandler(updateEntry));
entriesRouter.delete("/:id", asyncHandler(deleteEntry));
