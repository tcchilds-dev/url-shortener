import { Router } from "express";
import {
  codeRedirect,
  codeStats,
  shorten,
} from "#controllers/urlController.js";
import { createUrlLimiter, getLimiter } from "#middleware/rateLimiter.js";

const router = Router();

router.post("/shorten", createUrlLimiter, shorten);
router.get("/:shortCode", getLimiter, codeRedirect);
router.get("/:shortCode/stats", getLimiter, codeStats);

export default router;
