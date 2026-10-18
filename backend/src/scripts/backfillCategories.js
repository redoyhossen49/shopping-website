import "dotenv/config";
import pg from "pg";
import { getDatabaseConfig } from "../config/database.js";
import { slugify } from "../utils/validate.js";

const { Pool } = pg;

/**
 * One-shot maintenance script: repairs deployments whose products were
 * imported with a category label but no rows in public.categories.
 *
 * The storefront category filter is driven by public.categories
 * (GET /api/categories) and products are filtered by p.category_id. When the
 * import script was run without creating categories (the production database
 * turned out to be in this state), the catalog serves fine but the category
 * chips disappear and filtering by category cannot work.
 *
 * The script is idempotent and never deletes anything:
 *   1. Inserts one is_demo=false category per distinct products.category
 *      text that has no matching category row (case-insensitive on name).
 *   2. Backfills products.category_id (same is_demo scope) when it is NULL
 *      or points at a different/missing category.
 *
 * Usage (point the connection at the target database):
 *   DATABASE_URL=postgres://... npm run backfill:categories
 *   DATABASE_URL=postgres://... npm run backfill:categories -- --dry-run
 */

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const pool = new Pool(getDatabaseConfig());
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    console.log(
      `\n[backfill:categories] target database: ${
        DRY_RUN ? "(dry run) " : ""
      }connected`
    );

    await client.query("BEGIN");
    transactionStarted = true;

    // 1. Distinct category labels used by real products that lack a matching
    //    category row. Matching is done on the lowercased trimmed name so a
    //    category created with different casing is reused, not duplicated.
    const missing = await client.query(
      `
      SELECT DISTINCT ON (LOWER(TRIM(p.category)))
        LOWER(TRIM(p.category)) AS key,
        TRIM(p.category) AS label
      FROM public.products p
      WHERE p.is_demo = FALSE
        AND COALESCE(TRIM(p.category), '') <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM public.categories c
          WHERE LOWER(c.name) = LOWER(TRIM(p.category))
            AND c.is_demo = FALSE
        )
      ORDER BY LOWER(TRIM(p.category))
    `
    );

    let created = 0;
    for (const row of missing.rows) {
      const slug = slugify(row.label);
      console.log(
        `  creating category: name="${row.label}" slug="${slug}"`
      );

      if (DRY_RUN) {
        created++;
        continue;
      }

      await client.query(
        `INSERT INTO public.categories (name, slug, is_demo)
         VALUES ($1, $2, FALSE)`,
        [row.label, slug]
      );
      created++;
    }

    // 2. Backfill category_id for real products whose link is missing or
    //    inconsistent with their category label.
    const linked = await client.query(
      `
      UPDATE public.products p
      SET category_id = c.id, updated_at = NOW()
      FROM public.categories c
      WHERE p.is_demo = FALSE
        AND c.is_demo = FALSE
        AND LOWER(TRIM(p.category)) = LOWER(c.name)
        AND (p.category_id IS NULL OR p.category_id <> c.id)
    `
    );

    console.log(
      `\n[backfill:categories] created categories: ${created}, ` +
        `products linked: ${DRY_RUN ? "(dry run)" : linked.rowCount}`
    );

    if (DRY_RUN) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      console.log("[backfill:categories] dry run — nothing was written.");
    } else {
      await client.query("COMMIT");
      transactionStarted = false;
      console.log("[backfill:categories] done.");
    }
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("[backfill:categories] Failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
