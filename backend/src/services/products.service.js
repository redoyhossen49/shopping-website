import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { badRequest, conflict, notFound } from "../utils/ApiError.js";
import { buildMeta } from "../utils/pagination.js";
import { slugify } from "../utils/validate.js";

const ADMIN_SELECT = `
  SELECT
    p.*,
    c.name AS category_name
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
`;

const PUBLIC_SELECT = `
  SELECT
    p.*,
    c.name AS category_name
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
`;

export async function getAllProducts(isDemo = false) {
  const result = await pool.query(
    `${PUBLIC_SELECT}
     WHERE p.is_published = TRUE AND p.is_demo = $1
     ORDER BY p.id ASC`,
    [isDemo]
  );

  return result.rows;
}

/**
 * Paginated public catalog. The storefront only ever sees its own scope
 * (owner data, or demo data when the deployment runs in demo mode).
 */
export async function listPublicProducts({
  isDemo,
  search = "",
  categoryId = null,
  categorySlug = null,
  availability = "",
  page,
  limit,
  offset,
  sortColumn,
  direction,
}) {
  const params = [isDemo];
  const conditions = ["p.is_published = TRUE", "p.is_demo = $1"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(p.title ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.category ILIKE $${params.length})`
    );
  }

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  if (categorySlug) {
    const slugParam = String(categorySlug);
    const realCategory = await pool.query(
      "SELECT 1 FROM public.categories WHERE is_demo = $1 AND slug = $2",
      [isDemo, slugParam]
    );

    if (realCategory.rows[0]) {
      params.push(slugParam);
      conditions.push(`c.slug = $${params.length}`);
    } else {
      // The slug does not point at a stored category (categories were never
      // created for this deployment). Map the slug back to the product's own
      // text label so filtering still works - read-only, no writes.
      const labels = await pool.query(
        `SELECT DISTINCT COALESCE(TRIM(category), '') AS label
         FROM public.products
         WHERE is_demo = $1
           AND COALESCE(TRIM(category), '') <> ''`,
        [isDemo]
      );
      const label = labels.rows
        .map((row) => row.label)
        .find((name) => slugify(name) === slugParam.toLowerCase());

      params.push(label ?? slugParam);
      conditions.push(
        `p.category_id IS NULL
         AND LOWER(TRIM(p.category)) = LOWER($${params.length})`
      );
    }
  }

  if (availability === "in") {
    conditions.push("p.stock > 0");
  } else if (availability === "out") {
    conditions.push("p.stock = 0");
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM public.products p
     LEFT JOIN public.categories c ON c.id = p.category_id
     ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  // The sort column alone is not a total order (e.g. many rows share the same
  // created_at / price / title), so append the unique id as a tie-breaker.
  // Without it LIMIT/OFFSET pages overlap and skip rows.
  const result = await pool.query(
    `${PUBLIC_SELECT}
     ${where}
     ORDER BY p.${sortColumn} ${direction}, p.id ${direction}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

export async function getProductById(id, isDemo = false) {
  const result = await pool.query(
    `SELECT
       p.*,
       c.name AS category_name
     FROM public.products p
     LEFT JOIN public.categories c ON c.id = p.category_id
     WHERE p.id = $1 AND p.is_published = TRUE AND p.is_demo = $2`,
    [id, isDemo]
  );

  return result.rows[0] || null;
}

export async function getAdminProductById(id, isDemo) {
  const result = await pool.query(
    `${ADMIN_SELECT} WHERE p.id = $1 AND p.is_demo = $2`,
    [id, isDemo]
  );

  return result.rows[0] || null;
}

export async function listAdminProducts({
  search = "",
  categoryId = null,
  stockStatus = "",
  isPublished = null,
  isDemo,
  page,
  limit,
  offset,
  sortColumn,
  direction,
}) {
  const params = [isDemo];
  const conditions = ["p.is_demo = $1"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(p.title ILIKE $${params.length} OR p.sku ILIKE $${params.length})`
    );
  }

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  if (isPublished === true || isPublished === false) {
    params.push(isPublished);
    conditions.push(`p.is_published = $${params.length}`);
  }

  if (stockStatus === "out") {
    conditions.push("p.stock = 0");
  } else if (stockStatus === "low") {
    conditions.push("p.stock > 0 AND p.stock <= p.low_stock_threshold");
  } else if (stockStatus === "in") {
    conditions.push("p.stock > p.low_stock_threshold");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.products p ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  const result = await pool.query(
    `${ADMIN_SELECT}
     ${where}
     ORDER BY p.${sortColumn} ${direction}, p.id ${direction}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

async function resolveCategory(client, { categoryId, category, isDemo }) {
  if (categoryId) {
    const found = await client.query(
      "SELECT id, name FROM public.categories WHERE id = $1 AND is_demo = $2",
      [categoryId, Boolean(isDemo)]
    );

    if (!found.rows[0]) {
      throw badRequest("Selected category does not exist", {
        field: "category_id",
      });
    }

    return { id: found.rows[0].id, name: found.rows[0].name };
  }

  if (category) {
    const found = await client.query(
      "SELECT id, name FROM public.categories WHERE LOWER(name) = LOWER($1) AND is_demo = $2",
      [category, Boolean(isDemo)]
    );

    if (found.rows[0]) {
      return { id: found.rows[0].id, name: found.rows[0].name };
    }

    return { id: null, name: category };
  }

  return { id: null, name: null };
}

export async function createProduct(input, adminUserId = null, isDemo = false) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const category = await resolveCategory(client, { ...input, isDemo });

    const result = await client.query(
      `INSERT INTO public.products (
         title, description, price, category, category_id,
         image_url, stock, sku, is_published, low_stock_threshold,
         rating_rate, rating_count, is_demo
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11)
       RETURNING *`,
      [
        input.title,
        input.description,
        input.price,
        category.name,
        category.id,
        input.image_url,
        input.stock,
        input.sku,
        input.is_published,
        input.low_stock_threshold ?? env.defaultLowStockThreshold,
        Boolean(isDemo),
      ]
    );

    const product = result.rows[0];

    if (input.stock > 0) {
      await recordMovement(client, {
        productId: product.id,
        change: input.stock,
        previousStock: 0,
        newStock: input.stock,
        reason: "initial",
        note: "Initial stock on product creation",
        adminUserId,
        isDemo,
      });
    }

    await client.query("COMMIT");

    return getAdminProductById(product.id, isDemo);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw conflict("A product with this SKU already exists");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function updateProduct(id, input, adminUserId = null, isDemo = false) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT * FROM public.products WHERE id = $1 AND is_demo = $2 FOR UPDATE",
      [id, Boolean(isDemo)]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw notFound("Product not found");
    }

    const category = await resolveCategory(client, { ...input, isDemo });

    const nextStock =
      input.stock === undefined ? existing.stock : input.stock;

    const result = await client.query(
      `UPDATE public.products
       SET
         title = COALESCE($2, title),
         description = $3,
         price = COALESCE($4, price),
         category = $5,
         category_id = $6,
         image_url = $7,
         stock = $8,
         sku = $9,
         is_published = COALESCE($10, is_published),
         low_stock_threshold = COALESCE($11, low_stock_threshold),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.title ?? null,
        input.description === undefined ? existing.description : input.description,
        input.price ?? null,
        category.name ?? existing.category,
        category.id ?? existing.category_id,
        input.image_url === undefined ? existing.image_url : input.image_url,
        nextStock,
        input.sku === undefined ? existing.sku : input.sku,
        input.is_published,
        input.low_stock_threshold,
      ]
    );

    if (nextStock !== existing.stock) {
      await recordMovement(client, {
        productId: id,
        change: nextStock - existing.stock,
        previousStock: existing.stock,
        newStock: nextStock,
        reason: "product_update",
        note: "Stock changed while editing product",
        adminUserId,
        isDemo,
      });
    }

    await client.query("COMMIT");

    return getAdminProductById(result.rows[0].id, isDemo);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw conflict("A product with this SKU already exists");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProduct(id, isDemo = false) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id, title FROM public.products WHERE id = $1 AND is_demo = $2 FOR UPDATE",
      [id, Boolean(isDemo)]
    );

    if (!existing.rows[0]) {
      throw notFound("Product not found");
    }

    const referenced = await client.query(
      "SELECT COUNT(*)::int AS total FROM public.order_items WHERE product_id = $1",
      [id]
    );

    // order_items keeps a price/title snapshot and its product_id is set to NULL,
    // so deleting a product never removes order history.
    await client.query("DELETE FROM public.products WHERE id = $1", [id]);

    await client.query("COMMIT");

    return {
      id,
      title: existing.rows[0].title,
      orderedIn: referenced.rows[0].total,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordMovement(
  client,
  { productId, change, previousStock, newStock, reason, note, adminUserId, isDemo }
) {
  await client.query(
    `INSERT INTO public.inventory_movements (
       product_id, change, previous_stock, new_stock,
       reason, note, admin_user_id, is_demo
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [productId, change, previousStock, newStock, reason, note, adminUserId, Boolean(isDemo)]
  );
}

export async function countProducts(isDemo) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.products WHERE is_demo = $1",
    [isDemo]
  );

  return result.rows[0].total;
}
