import { Router } from "express";
import {
  redirectToURL,
  generateShortURL,
  getSpecificUrlAnalytics,
  getUserUrlAnalytics,
} from "#controllers/urlController.js";
import { createUrlLimiter, getLimiter } from "#middleware/rateLimiter.js";
import { requireAuth } from "#middleware/authentication.js";

const router: Router = Router();

// Retrieve a specific URL's analytics.
router.get(
  "/api/v1/users/urls/:shortCode/stats",
  requireAuth,
  getLimiter,
  getSpecificUrlAnalytics
);

// Retrieve general data on all of a user's URLs.
router.get("/api/v1/users/urls", requireAuth, getLimiter, getUserUrlAnalytics);

// Generate a short link from a long one.
router.post("/api/v1/urls", requireAuth, createUrlLimiter, generateShortURL);

// Redirect a user that clicked on a short link.
router.get("/:shortCode", getLimiter, redirectToURL);

export default router;
