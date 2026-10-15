import express from "express";
import { startDemoSessionController } from "../controllers/demo.controller.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

// Public entry point for the recruiter sandbox. Returns 403 unless DEMO_MODE
// is enabled; otherwise issues a scoped demo-admin session cookie.
router.post("/session", authLimiter, startDemoSessionController);

export default router;
