import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  getCustomerById,
  getCustomerOrders,
  listCustomers,
  setCustomerActive,
} from "../services/users.service.js";
import { parsePagination } from "../utils/pagination.js";
import { requireIdParam } from "../utils/validate.js";
import { optionalBoolean } from "../utils/validate.js";
import { adminScope } from "../utils/scope.js";

export const listCustomersController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const search = typeof req.query.search === "string" ? req.query.search : "";

  const result = await listCustomers({
    search,
    isDemo: adminScope(req),
    page,
    limit,
    offset,
  });

  return res.status(200).json({ success: true, meta: result.meta, data: result.rows });
});

export const getCustomerController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const isDemo = adminScope(req);
  const customer = await getCustomerById(id, isDemo);

  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  const orders = await getCustomerOrders(id, isDemo);

  return res.status(200).json({
    success: true,
    data: { ...customer, orders },
  });
});

export const updateCustomerStatusController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const isActive = optionalBoolean(req.body?.is_active, "is_active");

  if (isActive === undefined) {
    return res.status(400).json({ success: false, message: "is_active is required" });
  }

  const customer = await setCustomerActive(id, isActive, adminScope(req));

  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Customer status updated",
    data: customer,
  });
});
