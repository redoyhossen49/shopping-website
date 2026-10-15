import { pool } from "../config/db.js";
import { buildMeta } from "../utils/pagination.js";

const PUBLIC_USER_COLUMNS =
  "id, name, email, role, phone, is_active, created_at, updated_at";

export async function getAuthUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, is_demo
     FROM public.users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, is_active, is_demo
     FROM public.users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  return result.rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role, isDemo }) {
  const result = await pool.query(
    `INSERT INTO public.users (name, email, password_hash, role, is_demo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [name, email, passwordHash, role, Boolean(isDemo)]
  );

  return result.rows[0];
}

export async function getPublicUserById(id) {
  const result = await pool.query(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM public.users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

export async function listCustomers({
  search = "",
  isDemo,
  page,
  limit,
  offset,
}) {
  const params = [isDemo];
  let where = "WHERE role = 'customer' AND is_demo = $1";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.users ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.is_active,
       u.created_at,
       COALESCE((
         SELECT COUNT(*) FROM public.orders o
         WHERE o.user_id = u.id AND o.status <> 'cancelled'
       ), 0)::int AS order_count,
       COALESCE((
         SELECT SUM(o.total) FROM public.orders o
         WHERE o.user_id = u.id
           AND o.payment_status = 'paid'
           AND o.status <> 'cancelled'
       ), 0)::numeric(12,2) AS total_spent
     FROM public.users u
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

export async function getCustomerById(id, isDemo) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.is_active,
       u.created_at,
       COALESCE((
         SELECT COUNT(*) FROM public.orders o
         WHERE o.user_id = u.id AND o.status <> 'cancelled'
       ), 0)::int AS order_count,
       COALESCE((
         SELECT SUM(o.total) FROM public.orders o
         WHERE o.user_id = u.id
           AND o.payment_status = 'paid'
           AND o.status <> 'cancelled'
       ), 0)::numeric(12,2) AS total_spent
     FROM public.users u
     WHERE u.id = $1 AND u.role = 'customer' AND u.is_demo = $2`,
    [id, isDemo]
  );

  return result.rows[0] || null;
}

export async function getCustomerOrders(customerId, isDemo) {
  const result = await pool.query(
    `SELECT
       id,
       order_number,
       status,
       payment_status,
       total,
       currency,
       created_at
     FROM public.orders
     WHERE user_id = $1 AND is_demo = $2
     ORDER BY created_at DESC`,
    [customerId, isDemo]
  );

  return result.rows;
}

export async function setCustomerActive(id, isActive, isDemo) {
  const result = await pool.query(
    `UPDATE public.users
     SET is_active = $2, updated_at = NOW()
     WHERE id = $1 AND role = 'customer' AND is_demo = $3
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [id, isActive, isDemo]
  );

  return result.rows[0] || null;
}

export async function countCustomers(isDemo) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.users WHERE role = 'customer' AND is_demo = $1",
    [isDemo]
  );

  return result.rows[0].total;
}
