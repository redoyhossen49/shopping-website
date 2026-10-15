import { pool } from "../config/db.js";
import { env } from "../config/env.js";

async function ensureRow(client = pool) {
  await client.query(
    `INSERT INTO public.store_settings (
       id, store_name, currency, support_email,
       default_low_stock_threshold, default_shipping_fee
     )
     VALUES (1, $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [
      "NovaShop",
      env.currency,
      "support@novashop.example",
      env.defaultLowStockThreshold,
      env.defaultShippingFee,
    ]
  );
}

export async function getSettings() {
  await ensureRow();

  const result = await pool.query(
    "SELECT * FROM public.store_settings WHERE id = 1"
  );

  return result.rows[0];
}

export async function updateSettings(patch) {
  await ensureRow();

  const result = await pool.query(
    `UPDATE public.store_settings
     SET
       store_name = COALESCE($1, store_name),
       currency = COALESCE($2, currency),
       support_email = COALESCE($3, support_email),
       default_low_stock_threshold = COALESCE($4, default_low_stock_threshold),
       default_shipping_fee = COALESCE($5, default_shipping_fee),
       updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      patch.store_name ?? null,
      patch.currency ?? null,
      patch.support_email ?? null,
      patch.default_low_stock_threshold ?? null,
      patch.default_shipping_fee ?? null,
    ]
  );

  return result.rows[0];
}
