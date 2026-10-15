import { pool } from "../config/db.js";
import { conflict, notFound } from "../utils/ApiError.js";

const SELECT = `
  SELECT
    c.*,
    COUNT(p.id)::int AS product_count
  FROM public.categories c
  LEFT JOIN public.products p ON p.category_id = c.id AND p.is_demo = c.is_demo
`;

export async function listCategories(isDemo) {
  const result = await pool.query(
    `${SELECT}
     WHERE c.is_demo = $1
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [isDemo]
  );

  return result.rows;
}

export async function getCategoryById(id, isDemo) {
  const result = await pool.query(
    `${SELECT} WHERE c.id = $1 AND c.is_demo = $2 GROUP BY c.id`,
    [id, isDemo]
  );

  return result.rows[0] || null;
}

export async function createCategory({ name, slug, description, image_url, isDemo }) {
  try {
    const result = await pool.query(
      `INSERT INTO public.categories (name, slug, description, image_url, is_demo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, slug, description, image_url, Boolean(isDemo)]
    );

    return getCategoryById(result.rows[0].id, isDemo);
  } catch (error) {
    if (error.code === "23505") {
      throw conflict("A category with this name or slug already exists");
    }

    throw error;
  }
}

export async function updateCategory(id, patch, isDemo) {
  const existing = await getCategoryById(id, isDemo);

  if (!existing) {
    throw notFound("Category not found");
  }

  try {
    await pool.query(
      `UPDATE public.categories
       SET
         name = COALESCE($2, name),
         slug = COALESCE($3, slug),
         description = $4,
         image_url = $5,
         updated_at = NOW()
       WHERE id = $1 AND is_demo = $6`,
      [
        id,
        patch.name ?? null,
        patch.slug ?? null,
        patch.description === undefined ? existing.description : patch.description,
        patch.image_url === undefined ? existing.image_url : patch.image_url,
        Boolean(isDemo),
      ]
    );

    // Keep the denormalized text column on products in sync for the storefront.
    if (patch.name) {
      await pool.query(
        "UPDATE public.products SET category = $2 WHERE category_id = $1 AND is_demo = $3",
        [id, patch.name, Boolean(isDemo)]
      );
    }

    return getCategoryById(id, isDemo);
  } catch (error) {
    if (error.code === "23505") {
      throw conflict("A category with this name or slug already exists");
    }

    throw error;
  }
}

export async function deleteCategory(id, isDemo) {
  const existing = await getCategoryById(id, isDemo);

  if (!existing) {
    throw notFound("Category not found");
  }

  const referenced = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.products WHERE category_id = $1 AND is_demo = $2",
    [id, Boolean(isDemo)]
  );

  if (referenced.rows[0].total > 0) {
    throw conflict(
      `This category is used by ${referenced.rows[0].total} product(s). Reassign them before deleting.`
    );
  }

  await pool.query("DELETE FROM public.categories WHERE id = $1 AND is_demo = $2", [
    id,
    Boolean(isDemo),
  ]);

  return { id };
}

export async function countCategories(isDemo) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.categories WHERE is_demo = $1",
    [isDemo]
  );

  return result.rows[0].total;
}
