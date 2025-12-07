import { Router } from "express";
import {
  codeRedirect,
  shorten,
  getSpecificUrlAnalytics,
  getUserUrlAnalytics,
} from "#controllers/urlController.js";
import { createUrlLimiter, getLimiter } from "#middleware/rateLimiter.js";
import { requireAuth } from "#middleware/authentication.js";

const router: Router = Router();

// --- Specific URL Analytics ---
router.get(
  "/:shortCode/stats",
  requireAuth,
  getLimiter,
  getSpecificUrlAnalytics
);

// --- User's URLs and Analytics ---
router.get("/home", requireAuth, getLimiter, getUserUrlAnalytics);

// --- Shorten URL ---
router.post("/shorten", requireAuth, createUrlLimiter, shorten);

// --- Redirect ---
router.get("/:shortCode", getLimiter, codeRedirect);

export default router;
