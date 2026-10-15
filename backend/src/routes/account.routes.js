import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  cancelAccountOrderController,
  changePasswordController,
  createAddressController,
  deleteAddressController,
  getAccountOrderController,
  getProfileController,
  listAccountOrdersController,
  listAccountReturnsController,
  listAddressesController,
  returnAccountOrderController,
  setDefaultAddressController,
  updateAddressController,
  updateProfileController,
} from "../controllers/account.controller.js";

const router = express.Router();

router.use(requireAuth);

// Profile
router.get("/profile", getProfileController);
router.patch("/profile", updateProfileController);
router.patch("/password", changePasswordController);

// Addresses
router.get("/addresses", listAddressesController);
router.post("/addresses", createAddressController);
router.patch("/addresses/:id/default", setDefaultAddressController);
router.patch("/addresses/:id", updateAddressController);
router.delete("/addresses/:id", deleteAddressController);

// Orders
router.get("/orders", listAccountOrdersController);
router.get("/orders/:orderNumber", getAccountOrderController);
router.post("/orders/:orderNumber/cancel", cancelAccountOrderController);
router.post("/orders/:orderNumber/return", returnAccountOrderController);

// Returns / cancellations
router.get("/returns", listAccountReturnsController);

export default router;
