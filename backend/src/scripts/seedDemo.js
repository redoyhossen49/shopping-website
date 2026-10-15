import "dotenv/config";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import {
  seedDemoIfEmpty,
  resetAndSeedDemo,
  demoStatus,
} from "../services/demo.service.js";

/**
 * Seeds a realistic, synthetic demo dataset (products, customers, orders,
 * payments, returns and tracking) used to showcase the admin dashboard.
 *
 * Usage:
 *   npm run seed:demo          # seed only if no demo data exists
 *   npm run seed:demo:reset    # wipe demo rows and re-seed the baseline
 *
 * Only is_demo rows are ever deleted, so real data is never touched.
 */
async function main() {
  const reset = process.argv.includes("--reset");

  console.log(
    `[seed:demo] DEMO_MODE=${env.demoMode} — ${
      reset ? "resetting and re-seeding" : "seeding if empty"
    }`
  );

  const result = reset ? await resetAndSeedDemo() : await seedDemoIfEmpty();

  if (result.seeded === false) {
    console.log(`[seed:demo] ${result.reason}. Nothing to do.`);
  } else {
    console.log("[seed:demo] Done.");
    console.log(
      `  categories=${result.categories} products=${result.products} ` +
        `customers=${result.customers} orders=${result.orders}`
    );
  }

  const status = await demoStatus();
  console.log(
    `[seed:demo] Demo rows now: users=${status.demo_users} ` +
      `products=${status.demo_products} orders=${status.demo_orders}`
  );

  console.log("\nDemo credentials (only valid on this demo database):");
  console.log(`  Admin    : ${env.demo.adminEmail} / ${env.demo.adminPassword}`);
  console.log(`  Customer : demo.customer01@novashop.dev / ${env.demo.customerPassword}`);

  if (!env.demoMode) {
    console.log(
      "\nNote: DEMO_MODE is false, so the in-app reset button is disabled. " +
        "Set DEMO_MODE=true to enable the sandbox reset endpoint."
    );
  }
}

main()
  .catch((error) => {
    console.error("[seed:demo] Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
