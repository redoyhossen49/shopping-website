import {
  createProduct,
  deleteProduct,
  getAdminProductById,
  getProductById,
  listAdminProducts,
  listPublicProducts,
  updateProduct,
} from "../services/products.service.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  optionalBoolean,
  optionalEnum,
  optionalSearch,
  optionalString,
  optionalUrl,
  requireIdParam,
  requireNonNegativeInt,
  requirePositiveNumber,
  requireString,
} from "../utils/validate.js";
import { parsePagination, parseSort } from "../utils/pagination.js";
import { badRequest } from "../utils/ApiError.js";
import { adminScope, publicScope } from "../utils/scope.js";

const PUBLIC_PRODUCT_SORT_MAP = {
  id: "id",
  title: "title",
  price: "price",
  created_at: "created_at",
};

export const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 6);
  const { column, direction } = parseSort(
    req.query,
    PUBLIC_PRODUCT_SORT_MAP,
    "id",
    "asc"
  );

  const search = optionalSearch(req.query.search);
  const availability = optionalEnum(req.query.availability, "availability", [
    "in",
    "out",
  ]);
  const categoryId = req.query.category_id
    ? requireIdParam(req.query.category_id, "category_id")
    : null;
  const categorySlug =
    typeof req.query.category === "string" ? req.query.category : null;

  const { rows, meta } = await listPublicProducts({
    isDemo: publicScope(),
    search,
    categoryId,
    categorySlug,
    availability,
    page,
    limit,
    offset,
    sortColumn: column,
    direction,
  });

  res.status(200).json({
    success: true,
    meta,
    data: rows,
  });
});

export const getProductByIdController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);

  const product = await getProductById(id, publicScope());

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: product,
  });
});

const PRODUCT_SORT_MAP = {
  id: "id",
  title: "title",
  price: "price",
  stock: "stock",
  created_at: "created_at",
  updated_at: "updated_at",
};

export const listProductsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { column, direction } = parseSort(req.query, PRODUCT_SORT_MAP, "id");

  const published = optionalEnum(req.query.published, "published", [
    "true",
    "false",
  ]);
  const isPublished = published === "" ? null : published === "true";

  let categoryId = null;

  if (req.query.category_id) {
    categoryId = requireIdParam(req.query.category_id, "category_id");
  }

  const search = optionalSearch(req.query.search);
  const stockStatus = optionalEnum(req.query.stock_status, "stock_status", [
    "in",
    "low",
    "out",
  ]);

  const { rows, meta } = await listAdminProducts({
    search,
    categoryId,
    stockStatus,
    isPublished,
    isDemo: adminScope(req),
    page,
    limit,
    offset,
    sortColumn: column,
    direction,
  });

  return res.status(200).json({
    success: true,
    meta,
    data: rows,
  });
});

export const getProductAdmin = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const product = await getAdminProductById(id, adminScope(req));

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  return res.status(200).json({ success: true, data: product });
});

export const createProductController = asyncHandler(async (req, res) => {
  const title = requireString(req.body?.title, "Product title", {
    min: 1,
    max: 200,
  });
  const categoryInput = optionalString(req.body?.category, "Category", {
    max: 120,
  });
  const categoryId = req.body?.category_id
    ? requireIdParam(req.body.category_id, "category_id")
    : null;
  const price = requirePositiveNumber(req.body?.price, "Price");
  const stock = requireNonNegativeInt(req.body?.stock, "Stock");
  const description = optionalString(req.body?.description, "Description", {
    max: 8000,
  });
  const image_url = optionalUrl(req.body?.image_url, "Image URL");
  const sku = optionalString(req.body?.sku, "SKU", { max: 80 });
  const is_published = optionalBoolean(req.body?.is_published, "Published") ?? true;
  const low_stock_threshold = req.body?.low_stock_threshold
    ? requireNonNegativeInt(req.body.low_stock_threshold, "Low stock threshold")
    : null;

  if (!categoryInput && !categoryId) {
    throw badRequest("Category is required", { field: "category" });
  }

  const product = await createProduct(
    {
      title,
      description,
      price,
      category: categoryInput,
      categoryId,
      image_url,
      stock,
      sku,
      is_published,
      low_stock_threshold,
    },
    req.admin?.id ?? null,
    adminScope(req)
  );

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const updateProductController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);

  const title = req.body?.title
    ? requireString(req.body.title, "Product title", { min: 1, max: 200 })
    : undefined;
  const categoryInput = optionalString(req.body?.category, "Category", {
    max: 120,
  });
  const categoryId = req.body?.category_id
    ? requireIdParam(req.body.category_id, "category_id")
    : req.body?.category_id === null
    ? null
    : undefined;
  const price = req.body?.price
    ? requirePositiveNumber(req.body.price, "Price")
    : undefined;
  const stock = req.body?.stock
    ? requireNonNegativeInt(req.body.stock, "Stock")
    : undefined;
  const description =
    req.body?.description === undefined
      ? undefined
      : optionalString(req.body.description, "Description", { max: 8000 });
  const image_url =
    req.body?.image_url === undefined
      ? undefined
      : optionalUrl(req.body.image_url, "Image URL");
  const sku =
    req.body?.sku === undefined
      ? undefined
      : optionalString(req.body.sku, "SKU", { max: 80 });
  const is_published = optionalBoolean(req.body?.is_published, "Published");
  const low_stock_threshold =
    req.body?.low_stock_threshold === undefined || req.body?.low_stock_threshold === null
      ? null
      : requireNonNegativeInt(req.body.low_stock_threshold, "Low stock threshold");

  const product = await updateProduct(
    id,
    {
      title,
      description,
      price,
      category: categoryInput,
      categoryId,
      image_url,
      stock,
      sku,
      is_published,
      low_stock_threshold,
    },
    req.admin?.id ?? null,
    adminScope(req)
  );

  return res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProductController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const result = await deleteProduct(id, adminScope(req));

  return res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});
