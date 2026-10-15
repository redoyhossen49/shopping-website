import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/categories.service.js";
import {
  optionalString,
  optionalUrl,
  requireIdParam,
  requireString,
  slugify,
} from "../utils/validate.js";
import { badRequest } from "../utils/ApiError.js";
import { adminScope, publicScope } from "../utils/scope.js";

export const listCategoriesController = asyncHandler(async (req, res) => {
  const isDemo = req.admin ? adminScope(req) : publicScope();
  const categories = await listCategories(isDemo);

  return res.status(200).json({ success: true, data: categories });
});

export const createCategoryController = asyncHandler(async (req, res) => {
  const name = requireString(req.body?.name, "Category name", {
    min: 1,
    max: 120,
  });
  const slug =
    optionalString(req.body?.slug, "Slug", { max: 160 }) ||
    slugify(name);
  const description = optionalString(req.body?.description, "Description", {
    max: 2000,
  });
  const image_url = optionalUrl(req.body?.image_url, "Image URL");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw badRequest("Slug can only contain lowercase letters, numbers, and dashes", {
      field: "slug",
    });
  }

  const category = await createCategory({
    name,
    slug,
    description,
    image_url,
    isDemo: adminScope(req),
  });

  return res.status(201).json({ success: true, data: category });
});

export const updateCategoryController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);

  const name = req.body?.name
    ? requireString(req.body.name, "Category name", { min: 1, max: 120 })
    : undefined;

  let slug = optionalString(req.body?.slug, "Slug", { max: 160 });

  if (slug === undefined && name) {
    slug = slugify(name);
  }

  if (slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw badRequest("Slug can only contain lowercase letters, numbers, and dashes", {
        field: "slug",
      });
    }
  }

  const description =
    req.body?.description === undefined
      ? undefined
      : optionalString(req.body.description, "Description", { max: 2000 });

  const image_url =
    req.body?.image_url === undefined
      ? undefined
      : optionalUrl(req.body.image_url, "Image URL");

  const category = await updateCategory(id, {
    name,
    slug,
    description,
    image_url,
  }, adminScope(req));

  return res.status(200).json({ success: true, data: category });
});

export const deleteCategoryController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const result = await deleteCategory(id, adminScope(req));

  return res.status(200).json({ success: true, data: result });
});
