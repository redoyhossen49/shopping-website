import dotenv from "dotenv";

dotenv.config();

/**
 * Single source of truth for the PostgreSQL connection used by the API and by
 * the maintenance scripts (migrations, product import, admin creation).
 *
 * A connection string wins when one is present so that the running API and the
 * migration runner can never target different databases:
 *   - RENDER_DATABASE_URL: connection string injected by Render.
 *   - DATABASE_URL: generic fallback (Heroku-style, local overrides).
 * When neither is set we fall back to the discrete DB_* variables used for
 * local development, which do not require TLS.
 *
 * Never log the returned value: it contains credentials.
 */
export function getDatabaseConfig() {
  const connectionString = (
    process.env.RENDER_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();

  if (connectionString) {
    let ssl = { rejectUnauthorized: false };
    try {
      const hostname = new URL(connectionString).hostname;
      const isLocal = ["localhost", "127.0.0.1", "::1"].includes(hostname);
      if (isLocal) ssl = false;
    } catch {
      // Unparseable string: keep TLS-on (safe default for managed hosts).
    }
    return {
      connectionString,
      ssl,
    };
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}
