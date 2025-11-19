import { Router } from "express";
import {
  codeRedirect,
  codeStats,
  shorten,
} from "#controllers/urlController.js";

const router = Router();

router.post("/shorten", shorten);
router.get("/:shortCode", codeRedirect);
router.get("/:shortCode/stats", codeStats);

export default router;
