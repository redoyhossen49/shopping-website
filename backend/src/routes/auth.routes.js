import express from "express";
import {
  login,
  logout,
  me,
  register,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", me);

export default router;
