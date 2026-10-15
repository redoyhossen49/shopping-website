import { env } from "../config/env.js";

// SSLCOMMERZ is the approved aggregator used for bKash, Nagad and card
// payments. Merchant credentials live only in the backend environment and are
// never sent to the browser or written to logs.

export const PAYMENT_CHANNELS = ["bkash", "nagad", "card"];

export function isConfigured() {
  return env.sslcommerz.enabled;
}

function gatewayBase() {
  return env.sslcommerz.sandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";
}

function credentials() {
  return {
    storeId: env.sslcommerz.storeId,
    storePassword: env.sslcommerz.storePassword,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function redact(value) {
  // Never leak the store password inside thrown error messages.
  const text = String(value ?? "");
  const { storePassword } = credentials();
  return storePassword ? text.split(storePassword).join("***") : text;
}

export async function initPayment({
  amount,
  currency,
  tranId,
  customer,
  items,
  successUrl,
  failUrl,
  cancelUrl,
  ipnUrl,
}) {
  if (!isConfigured()) {
    throw new Error("SSLCOMMERZ is not configured");
  }

  const { storeId, storePassword } = credentials();

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: Number(amount).toFixed(2),
    currency,
    tran_id: tranId,
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,
    cus_name: customer.name,
    cus_email: customer.email,
    cus_add1: customer.address,
    cus_city: customer.city,
    cus_postcode: customer.postalCode,
    cus_country: customer.country,
    cus_phone: customer.phone,
    shipping_method: "NO",
    product_name: items.map((item) => item.title).join(", ").slice(0, 250),
    product_category: "ecommerce",
    product_profile: "general",
    num_of_item: String(
      items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
    ),
  });

  const response = await fetchWithTimeout(
    `${gatewayBase()}/gwprocess/v4/api.php`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Unexpected response from the payment gateway");
  }

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(
      redact(data.failedreason) || "The payment gateway rejected the request"
    );
  }

  return {
    gatewayPageUrl: data.GatewayPageURL,
    sessionKey: data.sessionkey || null,
  };
}

export async function validatePayment(valId) {
  if (!isConfigured()) {
    throw new Error("SSLCOMMERZ is not configured");
  }

  const { storeId, storePassword } = credentials();

  const url = new URL(`${gatewayBase()}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", storeId);
  url.searchParams.set("store_passwd", storePassword);
  url.searchParams.set("format", "json");
  url.searchParams.set("v", "1");

  const response = await fetchWithTimeout(url.toString(), { method: "GET" });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Unexpected response from the payment validator");
  }

  // The validator returns status VALID / VALIDATED for verified transactions.
  const valid = data.status === "VALID" || data.status === "VALIDATED";

  return {
    valid,
    status: data.status || "UNKNOWN",
    tranId: data.tran_id || null,
    amount: data.amount !== undefined ? Number(data.amount) : null,
    currency: data.currency || null,
    bankTranId: data.bank_tran_id || null,
    cardType: data.card_type || null,
    storeAmount:
      data.store_amount !== undefined ? Number(data.store_amount) : null,
    raw: data,
  };
}
