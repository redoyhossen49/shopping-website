import express from "express";
import {
  createOrderController,
  trackOrderController,
} from "../controllers/orders.controller.js";
import { orderLimiter } from "../middlewares/rateLimit.js";
import { attachUser } from "../middlewares/auth.js";

const router = express.Router();

// Public checkout endpoint. Totals and prices are always recomputed server-side.
router.post("/", orderLimiter, attachUser, createOrderController);

// Order tracking for guests (token required) and signed-in customers.
router.get("/track", attachUser, trackOrderController);
router.get("/track/:orderNumber", attachUser, trackOrderController);

export default router;
