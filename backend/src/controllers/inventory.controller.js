import { asyncHandler } from "../middlewares/asyncHandler.js";
import { getAdminProductById } from "../services/products.service.js";
import { getLowStockProducts } from "../services/analytics.service.js";
import { pool } from "../config/db.js";
import { requireIdParam, requireNonNegativeInt } from "../utils/validate.js";
import { recordMovement } from "../services/products.service.js";
import { notFound } from "../utils/ApiError.js";
import { adminScope } from "../utils/scope.js";

export const listInventoryController = asyncHandler(async (req, res) => {
  const products = await getLowStockProducts(50, adminScope(req));

  return res.status(200).json({ success: true, data: products });
});

export const adjustStockController = asyncHandler(async (req, res) => {
  const productId = requireIdParam(req.params.productId);
  const quantity = requireNonNegativeInt(req.body?.quantity, "quantity");
  const action = typeof req.body?.action === "string" ? req.body.action : "";

  const allowed = new Set(["set", "increase", "decrease"]);
  if (!allowed.has(action)) {
    return res.status(400).json({
      success: false,
      message: "action must be set, increase, or decrease",
    });
  }

  const client = await pool.connect();
  const isDemo = adminScope(req);

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT id, stock, title FROM public.products WHERE id = $1 AND is_demo = $2 FOR UPDATE",
      [productId, isDemo]
    );

    if (!result.rows[0]) {
      throw notFound("Product not found");
    }

    const product = result.rows[0];
    let newStock = product.stock;

    if (action === "set") {
      newStock = quantity;
    } else if (action === "increase") {
      newStock = product.stock + quantity;
    } else if (action === "decrease") {
      newStock = product.stock - quantity;
      if (newStock < 0) {
        newStock = 0;
      }
    }

    await client.query(
      "UPDATE public.products SET stock = $2, updated_at = NOW() WHERE id = $1",
      [productId, newStock]
    );

    await recordMovement(client, {
      productId,
      change: newStock - product.stock,
      previousStock: product.stock,
      newStock,
      reason: "stock_adjustment",
      note: `Manual stock adjustment (${action})`,
      adminUserId: req.admin.id,
      isDemo,
    });

    await client.query("COMMIT");

    const updated = await getAdminProductById(productId, isDemo);

    return res.status(200).json({
      success: true,
      message: "Stock adjusted",
      data: updated,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const getInventoryMovementsController = asyncHandler(async (req, res) => {
  const productId = requireIdParam(req.params.productId);

  const result = await pool.query(
    `SELECT m.id, m.change, m.previous_stock, m.new_stock,
            m.reason, m.note, m.created_at,
            u.name AS admin_name
     FROM public.inventory_movements m
     LEFT JOIN public.users u ON u.id = m.admin_user_id
     WHERE m.product_id = $1 AND m.is_demo = $2
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [productId, adminScope(req)]
  );

  return res.status(200).json({ success: true, data: result.rows });
});
