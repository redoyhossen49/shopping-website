import { asyncHandler } from "../middlewares/asyncHandler.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { parsePagination } from "../utils/pagination.js";
import {
  optionalEnum,
  optionalString,
  requireIdParam,
  requireString,
} from "../utils/validate.js";
import {
  changePassword,
  getProfile,
  updateProfile,
} from "../services/account.service.js";
import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../services/addresses.service.js";
import {
  ORDER_STATUSES,
  getOrderForUser,
  listOrdersForUser,
} from "../services/orders.service.js";
import {
  listReturnsForUser,
  requestCancellation,
  requestReturn,
} from "../services/returns.service.js";

// API field name -> { column key, max length }
const ADDRESS_FIELDS = {
  label: { key: "label", max: 60 },
  recipient_name: { key: "recipientName", max: 120 },
  phone: { key: "phone", max: 40 },
  address_line1: { key: "addressLine1", max: 250 },
  address_line2: { key: "addressLine2", max: 250 },
  city: { key: "city", max: 120 },
  state: { key: "state", max: 120 },
  postal_code: { key: "postalCode", max: 20 },
  country: { key: "country", max: 120 },
};

function parseAddress(body, { partial = false } = {}) {
  const result = {};

  for (const [field, { key, max }] of Object.entries(ADDRESS_FIELDS)) {
    const value = body?.[field];

    if (partial && value === undefined) {
      result[key] = undefined;
      continue;
    }

    const required = !partial && key !== "label" && key !== "state" && key !== "addressLine2" && key !== "country";

    result[key] = required
      ? requireString(value, field, { max })
      : optionalString(value, field, { max });
  }

  if (!partial) {
    result.label = result.label ?? "Home";
    result.country = result.country ?? "Bangladesh";
  }

  result.isDefault = body?.is_default === true;

  return result;
}

export const getProfileController = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user.id);

  return res.status(200).json({ success: true, data: profile });
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const name =
    req.body?.name === undefined
      ? undefined
      : requireString(req.body.name, "Name", { min: 2, max: 120 });
  const phone =
    req.body?.phone === undefined
      ? undefined
      : optionalString(req.body.phone, "Phone", { max: 40 });

  const profile = await updateProfile(req.user.id, { name, phone });

  return res.status(200).json({
    success: true,
    message: "Profile updated",
    data: profile,
  });
});

export const changePasswordController = asyncHandler(async (req, res) => {
  const currentPassword = requireString(
    req.body?.current_password,
    "Current password",
    { max: 200 }
  );
  const newPassword = requireString(req.body?.new_password, "New password", {
    min: 8,
    max: 72,
  });

  if (currentPassword === newPassword) {
    throw badRequest("Your new password must be different", {
      field: "new_password",
    });
  }

  await changePassword(req.user.id, { currentPassword, newPassword });

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

export const listAddressesController = asyncHandler(async (req, res) => {
  const addresses = await listAddresses(req.user.id);

  return res.status(200).json({ success: true, data: addresses });
});

export const createAddressController = asyncHandler(async (req, res) => {
  const data = parseAddress(req.body);
  const address = await createAddress(req.user.id, data);

  return res.status(201).json({
    success: true,
    message: "Address saved",
    data: address,
  });
});

export const updateAddressController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const data = parseAddress(req.body, { partial: true });

  const address = await updateAddress(req.user.id, id, data);

  if (!address) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Address updated",
    data: address,
  });
});

export const setDefaultAddressController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const address = await setDefaultAddress(req.user.id, id);

  if (!address) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Default address updated",
    data: address,
  });
});

export const deleteAddressController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const removed = await deleteAddress(req.user.id, id);

  if (!removed) {
    return res.status(404).json({ success: false, message: "Address not found" });
  }

  return res.status(200).json({ success: true, message: "Address removed" });
});

export const listAccountOrdersController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const status = optionalEnum(req.query.status, "status", ORDER_STATUSES);

  const { rows, meta } = await listOrdersForUser(req.user.id, {
    page,
    limit,
    offset,
    status,
  });

  return res.status(200).json({ success: true, meta, data: rows });
});

export const getAccountOrderController = asyncHandler(async (req, res) => {
  const order = await getOrderForUser(req.user.id, req.params.orderNumber);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  return res.status(200).json({ success: true, data: order });
});

export const cancelAccountOrderController = asyncHandler(async (req, res) => {
  const order = await getOrderForUser(req.user.id, req.params.orderNumber);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  const reason = requireString(req.body?.reason, "Reason", {
    min: 3,
    max: 1000,
  });

  const request = await requestCancellation({
    orderId: order.id,
    userId: req.user.id,
    reason,
    isDemo: Boolean(req.user.isDemo),
  });

  return res.status(201).json({
    success: true,
    message: "Cancellation request submitted",
    data: request,
  });
});

export const returnAccountOrderController = asyncHandler(async (req, res) => {
  const order = await getOrderForUser(req.user.id, req.params.orderNumber);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  const reason = requireString(req.body?.reason, "Reason", {
    min: 3,
    max: 1000,
  });

  const request = await requestReturn({
    orderId: order.id,
    userId: req.user.id,
    reason,
    isDemo: Boolean(req.user.isDemo),
  });

  return res.status(201).json({
    success: true,
    message: "Return request submitted",
    data: request,
  });
});

export const listAccountReturnsController = asyncHandler(async (req, res) => {
  const returns = await listReturnsForUser(req.user.id);

  return res.status(200).json({ success: true, data: returns });
});

export const getAddressController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const address = await getAddress(req.user.id, id);

  if (!address) {
    throw notFound("Address not found");
  }

  return res.status(200).json({ success: true, data: address });
});
