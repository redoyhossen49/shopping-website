import express from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";
import {
  getDashboardController,
  getAnalyticsController,
  exportCsvController,
} from "../controllers/analytics.controller.js";
import {
  listProductsAdmin,
  getProductAdmin,
  createProductController,
  updateProductController,
  deleteProductController,
} from "../controllers/products.controller.js";
import {
  listCategoriesController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "../controllers/categories.controller.js";
import {
  listAdminOrdersController,
  getAdminOrderController,
  updateOrderStatusController,
  updateOrderPaymentController,
  updateOrderTrackingController,
} from "../controllers/orders.controller.js";
import {
  listAdminReturnsController,
  getAdminReturnController,
  updateAdminReturnController,
} from "../controllers/returns.controller.js";
import {
  listCustomersController,
  getCustomerController,
  updateCustomerStatusController,
} from "../controllers/customers.controller.js";
import {
  listInventoryController,
  adjustStockController,
  getInventoryMovementsController,
} from "../controllers/inventory.controller.js";
import {
  getSettingsController,
  updateSettingsController,
} from "../controllers/settings.controller.js";
import { requireAdminSession } from "../controllers/auth.controller.js";
import {
  getDemoStatusController,
  resetDemoController,
} from "../controllers/demo.controller.js";
import { demoResetLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/me", requireAdminSession);
router.get("/dashboard", getDashboardController);
router.get("/analytics", getAnalyticsController);
router.get("/analytics/export", exportCsvController);

// Demo sandbox (only enabled when DEMO_MODE=true, otherwise 403)
router.get("/demo/status", getDemoStatusController);
router.post("/demo/reset", demoResetLimiter, resetDemoController);

// Products
router.get("/products", listProductsAdmin);
router.post("/products", createProductController);
router.get("/products/:id", getProductAdmin);
router.patch("/products/:id", updateProductController);
router.delete("/products/:id", deleteProductController);

// Categories
router.get("/categories", listCategoriesController);
router.post("/categories", createCategoryController);
router.patch("/categories/:id", updateCategoryController);
router.delete("/categories/:id", deleteCategoryController);

// Orders
router.get("/orders", listAdminOrdersController);
router.get("/orders/:id", getAdminOrderController);
router.patch("/orders/:id/status", updateOrderStatusController);
router.patch("/orders/:id/payment", updateOrderPaymentController);
router.patch("/orders/:id/tracking", updateOrderTrackingController);

// Returns & cancellations
router.get("/returns", listAdminReturnsController);
router.get("/returns/:id", getAdminReturnController);
router.patch("/returns/:id", updateAdminReturnController);

// Customers
router.get("/customers", listCustomersController);
router.get("/customers/:id", getCustomerController);
router.patch("/customers/:id/status", updateCustomerStatusController);

// Inventory
router.get("/inventory", listInventoryController);
router.patch("/inventory/:productId", adjustStockController);
router.get("/inventory/:productId/movements", getInventoryMovementsController);

// Settings
router.get("/settings", getSettingsController);
router.patch("/settings", updateSettingsController);

export default router;
