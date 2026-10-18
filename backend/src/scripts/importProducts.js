import "dotenv/config";
import pg from "pg";
import { getDatabaseConfig } from "../config/database.js";

const { Pool } = pg;

const pool = new Pool(getDatabaseConfig());

async function importProducts() {
  // A single checked-out client is required so BEGIN/COMMIT and every query in
  // between run on the same connection. Using pool.query() here would hand out
  // a different connection per call and break the transaction.
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    console.log("Fetching products from Fake Store API...");

    const response = await fetch(
      "https://fakestoreapi.com/products"
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const products = await response.json();

    if (!Array.isArray(products)) {
      throw new Error("Invalid product data received from API");
    }

    console.log(`Found ${products.length} products.`);

    await client.query("BEGIN");
    transactionStarted = true;

    let importedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const existing = await client.query(
        `SELECT id
         FROM public.products
         WHERE title = $1
           AND category = $2
           AND image_url = $3
         LIMIT 1`,
        [product.title, product.category, product.image]
      );

      if (existing.rowCount > 0) {
        skippedCount++;
        continue;
      }

      await client.query(
        `INSERT INTO public.products (
          title,
          description,
          price,
          category,
          image_url,
          stock,
          rating_rate,
          rating_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          product.title,
          product.description,
          product.price,
          product.category,
          product.image,
          10,
          product.rating?.rate ?? null,
          product.rating?.count ?? null,
        ]
      );

      importedCount++;
    }

    // Keep the identity sequence synchronized with existing IDs.
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('public.products', 'id'),
        COALESCE((SELECT MAX(id) FROM public.products), 1),
        EXISTS (SELECT 1 FROM public.products)
      )
    `);

    await client.query("COMMIT");
    transactionStarted = false;

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS total FROM public.products"
    );

    console.log("Import completed successfully.");
    console.log(`Imported: ${importedCount}`);
    console.log(`Skipped existing products: ${skippedCount}`);
    console.log(
      `Total products in database: ${countResult.rows[0].total}`
    );
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
    }

    console.error("Product import failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

importProducts();
