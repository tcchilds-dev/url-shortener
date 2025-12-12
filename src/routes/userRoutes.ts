import { Router } from "express";
import { authLimiter } from "#middleware/rateLimiter.js";
import { register, logIn } from "#controllers/userController.js";

const router: Router = Router();

router.post("/api/v1/users/register", authLimiter, register);
router.post("/api/v1/users/login", authLimiter, logIn);

export default router;
