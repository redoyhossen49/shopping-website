import crypto from "crypto";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { env } from "../config/env.js";
import { badRequest, conflict, forbidden, notFound, ApiError } from "../utils/ApiError.js";
import { requireString } from "../utils/validate.js";
import {
  getOrderByNumber,
  getOrderNumberById,
  getOrderRecordLite,
  hashGuestToken,
} from "../services/orders.service.js";
import {
  buildTranId,
  createPayment,
  getPaymentByTranId,
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentPending,
  verifyAndMarkPaid,
} from "../services/payments.service.js";
import { initPayment, isConfigured } from "../services/sslcommerz.service.js";

function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  return (
    bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)
  );
}

async function resolveOrderAccess(req, orderNumber, token) {
  const order = await getOrderRecordLite(orderNumber);

  if (!order) {
    throw notFound("Order not found");
  }

  if (order.user_id) {
    if (!req.user || Number(req.user.id) !== Number(order.user_id)) {
      throw notFound("Order not found");
    }
  } else {
    if (!token) {
      throw badRequest("A tracking token is required for this order", {
        field: "token",
      });
    }

    if (!safeEqualHex(hashGuestToken(token), order.guest_token_hash)) {
      throw forbidden("This tracking link is not valid");
    }
  }

  return order;
}

export const initiatePaymentController = asyncHandler(async (req, res) => {
  const orderNumber = requireString(
    req.body?.order_number ?? req.body?.orderNumber,
    "Order number",
    { max: 50 }
  );
  const token = req.body?.token ? String(req.body.token) : null;

  const record = await resolveOrderAccess(req, orderNumber, token);

  if (record.payment_status === "paid") {
    throw conflict("This order has already been paid");
  }

  if (record.payment_method !== "sslcommerz") {
    throw badRequest("This order is not set up for online payment");
  }

  if (!isConfigured()) {
    throw new ApiError(
      503,
      "Online payment is temporarily unavailable. Please choose Cash on Delivery."
    );
  }

  const order = await getOrderByNumber(orderNumber);

  if (!order) {
    throw notFound("Order not found");
  }

  const tranId = buildTranId();

  await createPayment({
    orderId: record.id,
    provider: "sslcommerz",
    channel: record.payment_channel,
    amount: record.total,
    currency: record.currency,
    tranId,
  });

  const callbackBase = `${env.apiPublicUrl}/api/payments/sslcommerz`;

  try {
    const { gatewayPageUrl } = await initPayment({
      amount: record.total,
      currency: record.currency,
      tranId,
      customer: {
        name: record.customer_name,
        email: record.customer_email,
        phone: record.customer_phone,
        address: record.shipping_address,
        city: record.shipping_city,
        postalCode: record.shipping_postal_code,
        country: record.shipping_country,
      },
      items: order.items,
      successUrl: `${callbackBase}/success`,
      failUrl: `${callbackBase}/fail`,
      cancelUrl: `${callbackBase}/cancel`,
      ipnUrl: `${callbackBase}/ipn`,
    });

    await markPaymentPending(tranId);

    return res.status(200).json({
      success: true,
      message: "Redirecting to the secure payment gateway",
      data: { gateway_page_url: gatewayPageUrl, tran_id: tranId },
    });
  } catch (error) {
    await markPaymentFailed(tranId, error.message).catch(() => {});

    throw new ApiError(
      502,
      "We could not start the payment. Please try again or use Cash on Delivery."
    );
  }
});

function frontendRedirect(res, { status, orderNumber }) {
  const url = new URL("/order/result", env.frontendUrl);
  url.searchParams.set("status", status);

  if (orderNumber) {
    url.searchParams.set("order", orderNumber);
  }

  return res.redirect(303, url.toString());
}

function readGatewayPayload(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

export const sslcommerzSuccessController = asyncHandler(async (req, res) => {
  const payload = readGatewayPayload(req);
  const tranId = payload.tran_id ? String(payload.tran_id) : null;

  if (!tranId) {
    return frontendRedirect(res, { status: "failed" });
  }

  const payment = await getPaymentByTranId(tranId);

  if (!payment) {
    return frontendRedirect(res, { status: "failed" });
  }

  const orderNumber = await getOrderNumberById(payment.order_id);

  if (payment.status === "paid") {
    return frontendRedirect(res, { status: "success", orderNumber });
  }

  try {
    const result = await verifyAndMarkPaid({
      tranId,
      valId: payload.val_id ? String(payload.val_id) : null,
      raw: payload,
    });

    return frontendRedirect(res, {
      status: result.paid || result.alreadyPaid ? "success" : "failed",
      orderNumber,
    });
  } catch {
    return frontendRedirect(res, { status: "failed", orderNumber });
  }
});

export const sslcommerzFailController = asyncHandler(async (req, res) => {
  const payload = readGatewayPayload(req);
  const tranId = payload.tran_id ? String(payload.tran_id) : null;
  let orderNumber = null;

  if (tranId) {
    const payment = await getPaymentByTranId(tranId);

    if (payment) {
      orderNumber = await getOrderNumberById(payment.order_id);
      await markPaymentFailed(
        tranId,
        payload.error || "The payment was declined",
        payload
      );
    }
  }

  return frontendRedirect(res, { status: "failed", orderNumber });
});

export const sslcommerzCancelController = asyncHandler(async (req, res) => {
  const payload = readGatewayPayload(req);
  const tranId = payload.tran_id ? String(payload.tran_id) : null;
  let orderNumber = null;

  if (tranId) {
    const payment = await getPaymentByTranId(tranId);

    if (payment) {
      orderNumber = await getOrderNumberById(payment.order_id);
      await markPaymentCancelled(tranId, payload);
    }
  }

  return frontendRedirect(res, { status: "cancelled", orderNumber });
});

export const sslcommerzIpnController = asyncHandler(async (req, res) => {
  const payload = readGatewayPayload(req);
  const tranId = payload.tran_id ? String(payload.tran_id) : null;
  const statusValue = String(payload.status || "").toUpperCase();

  if (!tranId) {
    return res.status(200).json({ success: false, message: "Missing tran_id" });
  }

  const payment = await getPaymentByTranId(tranId);

  if (!payment) {
    return res.status(200).json({ success: false, message: "Unknown transaction" });
  }

  try {
    if (["VALID", "VALIDATED", "SUCCESS"].includes(statusValue) && payload.val_id) {
      await verifyAndMarkPaid({
        tranId,
        valId: String(payload.val_id),
        raw: payload,
      });
    } else if (statusValue === "FAILED") {
      await markPaymentFailed(tranId, payload.error || "Payment failed", payload);
    } else if (statusValue === "CANCELLED") {
      await markPaymentCancelled(tranId, payload);
    }
  } catch {
    // IPN is best-effort; always acknowledge to avoid gateway retries storms.
  }

  return res.status(200).json({ success: true });
});

export const paymentConfigController = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      onlinePaymentsEnabled: isConfigured(),
      channels: isConfigured() ? ["bkash", "nagad", "card"] : [],
      codEnabled: true,
    },
  });
});
