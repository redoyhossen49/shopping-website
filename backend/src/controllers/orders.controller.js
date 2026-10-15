import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  createOrder,
  getAdminOrderById,
  getGuestOrder,
  getOrderForUser,
  listAdminOrders,
  updateOrderStatus,
  updateOrderTracking,
  updatePaymentStatus,
} from "../services/orders.service.js";
import { parsePagination, parseSort } from "../utils/pagination.js";
import {
  optionalEnum,
  optionalSearch,
  requireEmail,
  requireIdParam,
  requireNonNegativeInt,
  requireString,
} from "../utils/validate.js";
import { badRequest } from "../utils/ApiError.js";
import { assertPaymentMethod } from "../services/payments.service.js";
import { isConfigured } from "../services/sslcommerz.service.js";
import { adminScope, shopperScope } from "../utils/scope.js";

const ORDER_SORT_MAP = {
  id: "id",
  order_number: "order_number",
  created_at: "created_at",
  total: "total",
  status: "status",
};

export const createOrderController = asyncHandler(async (req, res) => {
  const customerName = requireString(req.body?.customer_name, "Full name", {
    min: 2,
    max: 120,
  });
  const customerEmail = requireEmail(req.body?.customer_email);
  const customerPhone = requireString(req.body?.customer_phone, "Phone", {
    min: 3,
    max: 40,
  });
  const shippingAddress = requireString(req.body?.shipping_address, "Address", {
    min: 5,
    max: 250,
  });
  const shippingCity = requireString(req.body?.shipping_city, "City", {
    min: 1,
    max: 120,
  });
  const shippingCountry = requireString(req.body?.shipping_country, "Country", {
    min: 1,
    max: 120,
  });
  const shippingPostalCode = requireString(
    req.body?.shipping_postal_code,
    "Postal code",
    { min: 2, max: 20 }
  );

  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (items.length === 0) {
    throw badRequest("Your cart is empty");
  }

  const normalizedItems = items.map((item) => ({
    productId: requireIdParam(item.productId ?? item.product_id, "productId"),
    quantity: requireNonNegativeInt(item.quantity, "quantity"),
  }));

  for (const item of normalizedItems) {
    if (item.quantity < 1) {
      throw badRequest("Quantity must be at least 1");
    }
  }

  const requestedMethod = String(req.body?.payment_method || "cod")
    .trim()
    .toLowerCase();
  const requestedChannel = req.body?.payment_channel
    ? String(req.body.payment_channel).trim().toLowerCase()
    : null;

  const payment = assertPaymentMethod(requestedMethod, requestedChannel);

  if (payment.method === "sslcommerz" && !isConfigured()) {
    throw badRequest(
      "Online payment is currently unavailable. Please choose Cash on Delivery."
    );
  }

  const order = await createOrder({
    userId: req.user?.id ?? null,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingCity,
    shippingCountry,
    shippingPostalCode,
    items: normalizedItems,
    notes: req.body?.notes ? String(req.body.notes).slice(0, 500) : null,
    paymentMethod: payment.method,
    paymentChannel: payment.channel,
    isDemo: shopperScope(req),
  });

  return res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: order,
  });
});

export const trackOrderController = asyncHandler(async (req, res) => {
  const orderNumber = requireString(
    req.params.orderNumber || req.query.order || req.query.order_number,
    "Order number",
    { max: 50 }
  );
  const token = req.query.token
    ? String(req.query.token)
    : req.body?.token
      ? String(req.body.token)
      : null;

  let order = null;

  if (req.user) {
    order = await getOrderForUser(req.user.id, orderNumber);
  }

  if (!order && token) {
    order = await getGuestOrder(orderNumber, token);
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "We could not find an order with those details",
    });
  }

  return res.status(200).json({ success: true, data: order });
});

export const listAdminOrdersController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { column, direction } = parseSort(req.query, ORDER_SORT_MAP, "created_at");

  const search = optionalSearch(req.query.search);
  const status = optionalEnum(req.query.status, "status", ORDER_STATUSES);
  const paymentStatus = optionalEnum(
    req.query.payment_status,
    "payment_status",
    PAYMENT_STATUSES
  );

  const { rows, meta } = await listAdminOrders({
    search,
    status,
    paymentStatus,
    isDemo: adminScope(req),
    page,
    limit,
    offset,
    sortColumn: column,
    direction,
  });

  return res.status(200).json({ success: true, meta, data: rows });
});

export const getAdminOrderController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const order = await getAdminOrderById(id, adminScope(req));

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  return res.status(200).json({ success: true, data: order });
});

export const updateOrderStatusController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const nextStatus = requireString(req.body?.status, "Status", { max: 40 });

  const order = await updateOrderStatus(
    id,
    nextStatus.toLowerCase(),
    req.admin.id,
    adminScope(req)
  );

  return res.status(200).json({
    success: true,
    message: "Order status updated",
    data: order,
  });
});

export const updateOrderPaymentController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const paymentStatus = requireString(req.body?.payment_status, "Payment status", {
    max: 40,
  });

  const order = await updatePaymentStatus(
    id,
    paymentStatus.toLowerCase(),
    req.admin.id,
    adminScope(req)
  );

  return res.status(200).json({
    success: true,
    message: "Payment status updated",
    data: order,
  });
});

export const updateOrderTrackingController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);

  const carrier = req.body?.carrier
    ? requireString(req.body.carrier, "Carrier", { max: 80 })
    : null;
  const trackingNumber = req.body?.tracking_number
    ? requireString(req.body.tracking_number, "Tracking number", { max: 80 })
    : null;
  const trackingUrl = req.body?.tracking_url
    ? requireString(req.body.tracking_url, "Tracking URL", { max: 500 })
    : null;
  const note = req.body?.note
    ? requireString(req.body.note, "Note", { max: 500 })
    : null;

  const order = await updateOrderTracking(
    id,
    { carrier, trackingNumber, trackingUrl, note },
    req.admin.id,
    adminScope(req)
  );

  return res.status(200).json({
    success: true,
    message: "Tracking information updated",
    data: order,
  });
});
