import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { getDatabaseConfig } from "../config/database.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same target as the running API (connection string when present, otherwise
// the discrete DB_* variables used locally).
const pool = new Pool(getDatabaseConfig());

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecuted(client) {
  const result = await client.query(
    "SELECT name FROM public.schema_migrations ORDER BY id"
  );

  return new Set(result.rows.map((row) => row.name));
}

async function runMigrations() {
  let client;

  try {
    client = await pool.connect();
    await ensureMigrationsTable(client);
    const executed = await getExecuted(client);

    const migrationsDir = path.join(__dirname, "../../database/migrations");
    const files = await fs.readdir(migrationsDir);
    const sorted = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sorted) {
      if (executed.has(file)) {
        console.log(`Skipping already executed: ${file}`);
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");

      console.log(`Applying migration: ${file}`);
      try {
        // Each migration file manages its own BEGIN/COMMIT.
        await client.query(sql);
        await client.query(
          "INSERT INTO public.schema_migrations (name) VALUES ($1)",
          [file]
        );
        console.log(`Applied: ${file}`);
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Ignore rollback errors; report the original failure.
        }
        throw err;
      }
    }

    console.log("Migrations completed.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

runMigrations();
