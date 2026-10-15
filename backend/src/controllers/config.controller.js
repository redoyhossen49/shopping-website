import { env } from "../config/env.js";
import { pool } from "../config/db.js";

/**
 * Public, unauthenticated runtime configuration for the client.
 * Never exposes secrets; only flags the UI needs to adapt its behaviour.
 */
export async function getPublicConfig(req, res) {
  let storeName = "NovaShop";

  try {
    const result = await pool.query(
      "SELECT store_name FROM public.store_settings WHERE id = 1"
    );

    if (result.rows[0]?.store_name) {
      storeName = result.rows[0].store_name;
    }
  } catch {
    // Config must still respond if the settings row/table is unavailable.
  }

  res.status(200).json({
    success: true,
    data: {
      demoMode: env.demoMode,
      storeName,
      currency: env.currency,
      onlinePaymentsEnabled: env.sslcommerz.enabled,
    },
  });
}
