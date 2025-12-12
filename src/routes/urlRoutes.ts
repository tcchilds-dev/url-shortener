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
  "/api/v1/users/urls/:shortCode/stats",
  requireAuth,
  getLimiter,
  getSpecificUrlAnalytics
);

// --- User's URLs ---
router.get("/api/v1/users/urls", requireAuth, getLimiter, getUserUrlAnalytics);

// --- Shorten URL ---
router.post("/api/v1/urls", requireAuth, createUrlLimiter, shorten);

// --- Redirect ---
router.get("/:shortCode", getLimiter, codeRedirect);

export default router;
