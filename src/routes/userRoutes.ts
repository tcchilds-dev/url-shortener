import { Router } from "express";
import { authLimiter } from "#middleware/rateLimiter.js";
import { register, logIn } from "#controllers/userController.js";

const router: Router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, logIn);

export default router;
