import { pool } from "../config/db.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { hashPassword, verifyPassword } from "./auth.service.js";
import { getPublicUserById } from "./users.service.js";

export async function getProfile(userId) {
  const user = await getPublicUserById(userId);

  if (!user) {
    throw notFound("Account not found");
  }

  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM public.customer_addresses WHERE user_id = $1) AS address_count,
       (SELECT COUNT(*)::int FROM public.orders WHERE user_id = $1) AS order_count`,
    [userId]
  );

  return { ...user, ...result.rows[0] };
}

export async function updateProfile(userId, { name, phone }) {
  const result = await pool.query(
    `UPDATE public.users
     SET name = COALESCE($2, name),
         phone = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, role, phone, is_active, created_at, updated_at`,
    [userId, name ?? null, phone === undefined ? null : phone]
  );

  if (!result.rows[0]) {
    throw notFound("Account not found");
  }

  return result.rows[0];
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const result = await pool.query(
    "SELECT password_hash FROM public.users WHERE id = $1",
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    throw notFound("Account not found");
  }

  const matches = await verifyPassword(currentPassword, user.password_hash);

  if (!matches) {
    throw badRequest("Your current password is incorrect", {
      field: "current_password",
    });
  }

  const passwordHash = await hashPassword(newPassword);

  await pool.query(
    "UPDATE public.users SET password_hash = $2, updated_at = NOW() WHERE id = $1",
    [userId, passwordHash]
  );

  return true;
}
