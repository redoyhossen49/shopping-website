import express from "express";
import { attachUser } from "../middlewares/auth.js";
import { orderLimiter } from "../middlewares/rateLimit.js";
import {
  initiatePaymentController,
  paymentConfigController,
  sslcommerzCancelController,
  sslcommerzFailController,
  sslcommerzIpnController,
  sslcommerzSuccessController,
} from "../controllers/payments.controller.js";

const router = express.Router();

// Public configuration (tells the storefront whether online payment is live).
router.get("/config", paymentConfigController);

// Starts an online payment for an existing order. Access is checked against
// the logged-in customer or the order's guest tracking token.
router.post("/initiate", orderLimiter, attachUser, initiatePaymentController);

// SSLCOMMERZ redirects the shopper's browser to these endpoints. They are
// verified server-side before any payment is marked as paid.
router.post("/sslcommerz/success", attachUser, sslcommerzSuccessController);
router.get("/sslcommerz/success", attachUser, sslcommerzSuccessController);
router.post("/sslcommerz/fail", sslcommerzFailController);
router.get("/sslcommerz/fail", sslcommerzFailController);
router.post("/sslcommerz/cancel", sslcommerzCancelController);
router.get("/sslcommerz/cancel", sslcommerzCancelController);

// Server-to-server IPN.
router.post("/sslcommerz/ipn", sslcommerzIpnController);

export default router;
