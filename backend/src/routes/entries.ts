import { Router } from "express";
import multer from "multer";
import {
  createEntriesBulk,
  createEntry,
  deleteEntry,
  draftPhotoEntries,
  draftVoiceEntry,
  listEntries,
  updateEntry,
} from "../controllers/entriesController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export const entriesRouter = Router();

entriesRouter.use(requireAuth, requireRole("SHOP_OWNER"));

entriesRouter.get("/", asyncHandler(listEntries));
entriesRouter.post("/", asyncHandler(createEntry));
entriesRouter.post("/bulk", asyncHandler(createEntriesBulk));
entriesRouter.post("/voice", uploadAudio.single("audio"), asyncHandler(draftVoiceEntry));
entriesRouter.post("/photo", uploadImage.single("photo"), asyncHandler(draftPhotoEntries));
entriesRouter.patch("/:id", asyncHandler(updateEntry));
entriesRouter.delete("/:id", asyncHandler(deleteEntry));
