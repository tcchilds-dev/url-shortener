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

router.get(
  "/:shortCode/stats",
  requireAuth,
  getLimiter,
  getSpecificUrlAnalytics
);
router.get("/home", requireAuth, getLimiter, getUserUrlAnalytics);
router.post("/shorten", requireAuth, createUrlLimiter, shorten);
router.get("/:shortCode", getLimiter, codeRedirect);

export default router;
