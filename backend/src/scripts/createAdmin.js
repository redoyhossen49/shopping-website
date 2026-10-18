import "dotenv/config";
import pg from "pg";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { getDatabaseConfig } from "../config/database.js";

const { Pool } = pg;

const pool = new Pool(getDatabaseConfig());

function prompt() {
  if (process.argv.length < 5) {
    console.error(
      "Usage: node src/scripts/createAdmin.js <name> <email> <password>"
    );
    process.exit(1);
  }

  return {
    name: process.argv[2],
    email: process.argv[3],
    password: process.argv[4],
  };
}

async function createAdmin() {
  const { name, email, password } = prompt();

  if (password.length < 8) {
    console.error("Admin password must be at least 8 characters.");
    process.exit(1);
  }

  try {
    const emailLower = email.trim().toLowerCase();
    const hash = await bcrypt.hash(password, env.bcryptRounds || 12);

    const result = await pool.query(
      `INSERT INTO public.users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE)
       ON CONFLICT (LOWER(email)) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'admin',
             is_active = TRUE,
             updated_at = NOW()
       RETURNING id, name, email, role`,
      [name.trim(), emailLower, hash]
    );

    console.log("Admin account ready:");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
