import { pool } from "../config/db.js";

const ADDRESS_COLUMNS = `
  id, user_id, label, recipient_name, phone, address_line1, address_line2,
  city, state, postal_code, country, is_default, created_at, updated_at
`;

export async function listAddresses(userId) {
  const result = await pool.query(
    `SELECT ${ADDRESS_COLUMNS}
     FROM public.customer_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getAddress(userId, id) {
  const result = await pool.query(
    `SELECT ${ADDRESS_COLUMNS}
     FROM public.customer_addresses
     WHERE user_id = $1 AND id = $2`,
    [userId, id]
  );

  return result.rows[0] || null;
}

export async function countAddresses(userId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.customer_addresses WHERE user_id = $1",
    [userId]
  );

  return result.rows[0].total;
}

async function clearDefault(client, userId) {
  await client.query(
    "UPDATE public.customer_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_default = TRUE",
    [userId]
  );
}

export async function createAddress(userId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS total FROM public.customer_addresses WHERE user_id = $1",
      [userId]
    );

    // The first address a customer saves becomes their default automatically.
    const isDefault = data.isDefault === true || countResult.rows[0].total === 0;

    if (isDefault) {
      await clearDefault(client, userId);
    }

    const result = await client.query(
      `INSERT INTO public.customer_addresses (
         user_id, label, recipient_name, phone, address_line1, address_line2,
         city, state, postal_code, country, is_default
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING ${ADDRESS_COLUMNS}`,
      [
        userId,
        data.label,
        data.recipientName,
        data.phone,
        data.addressLine1,
        data.addressLine2,
        data.city,
        data.state,
        data.postalCode,
        data.country,
        isDefault,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAddress(userId, id, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id, is_default FROM public.customer_addresses WHERE user_id = $1 AND id = $2 FOR UPDATE",
      [userId, id]
    );

    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const makeDefault = data.isDefault === true;

    if (makeDefault) {
      await clearDefault(client, userId);
    }

    const result = await client.query(
      `UPDATE public.customer_addresses SET
         label = COALESCE($3, label),
         recipient_name = COALESCE($4, recipient_name),
         phone = COALESCE($5, phone),
         address_line1 = COALESCE($6, address_line1),
         address_line2 = COALESCE($7, address_line2),
         city = COALESCE($8, city),
         state = COALESCE($9, state),
         postal_code = COALESCE($10, postal_code),
         country = COALESCE($11, country),
         is_default = CASE WHEN $12 THEN TRUE ELSE is_default END,
         updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING ${ADDRESS_COLUMNS}`,
      [
        userId,
        id,
        data.label ?? null,
        data.recipientName ?? null,
        data.phone ?? null,
        data.addressLine1 ?? null,
        data.addressLine2 === undefined ? null : data.addressLine2,
        data.city ?? null,
        data.state === undefined ? null : data.state,
        data.postalCode ?? null,
        data.country ?? null,
        makeDefault,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setDefaultAddress(userId, id) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM public.customer_addresses WHERE user_id = $1 AND id = $2",
      [userId, id]
    );

    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await clearDefault(client, userId);

    const result = await client.query(
      `UPDATE public.customer_addresses
       SET is_default = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING ${ADDRESS_COLUMNS}`,
      [userId, id]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAddress(userId, id) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `DELETE FROM public.customer_addresses
       WHERE user_id = $1 AND id = $2
       RETURNING id, is_default`,
      [userId, id]
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }

    // Promote another address to default if we removed the default one.
    if (result.rows[0].is_default) {
      await client.query(
        `UPDATE public.customer_addresses
         SET is_default = TRUE, updated_at = NOW()
         WHERE id = (
           SELECT id FROM public.customer_addresses
           WHERE user_id = $1
           ORDER BY created_at ASC
           LIMIT 1
         )`,
        [userId]
      );
    }

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
