import crypto from "crypto";
import { pool } from "../config/db.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { validatePayment } from "./sslcommerz.service.js";

export const PAYMENT_PROVIDER_SSLCOMMERZ = "sslcommerz";
export const PAYMENT_PROVIDER_COD = "cod";

const PAYMENT_COLUMNS = `
  id, order_id, provider, channel, status, amount, currency,
  provider_tran_id, val_id, bank_tran_id, card_type, store_amount,
  failure_reason, initiated_at, paid_at, updated_at
`;

export function buildTranId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase();

  return `NV${stamp}${rand}`;
}

export async function createPayment({
  orderId,
  provider,
  channel = null,
  amount,
  currency,
  tranId,
}) {
  const result = await pool.query(
    `INSERT INTO public.payments (
       order_id, provider, channel, status, amount, currency, provider_tran_id
     )
     VALUES ($1,$2,$3,'initiated',$4,$5,$6)
     RETURNING ${PAYMENT_COLUMNS}`,
    [orderId, provider, channel, amount, currency, tranId]
  );

  return result.rows[0];
}

export async function getPaymentByTranId(tranId) {
  const result = await pool.query(
    `SELECT ${PAYMENT_COLUMNS}
     FROM public.payments
     WHERE provider_tran_id = $1`,
    [tranId]
  );

  return result.rows[0] || null;
}

export async function listPaymentsByOrderId(orderId) {
  const result = await pool.query(
    `SELECT ${PAYMENT_COLUMNS}
     FROM public.payments
     WHERE order_id = $1
     ORDER BY initiated_at DESC, id DESC`,
    [orderId]
  );

  return result.rows;
}

async function setPaymentStatus(client, tranId, status, extra = {}) {
  const fields = ["status = $2", "updated_at = NOW()"];
  const params = [tranId, status];

  const optional = {
    val_id: extra.valId,
    bank_tran_id: extra.bankTranId,
    card_type: extra.cardType,
    store_amount: extra.storeAmount,
    failure_reason: extra.failureReason,
    raw_response: extra.raw ? JSON.stringify(extra.raw) : undefined,
  };

  for (const [column, value] of Object.entries(optional)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }

  if (status === "paid") {
    fields.push("paid_at = NOW()");
  }

  const result = await client.query(
    `UPDATE public.payments SET ${fields.join(", ")}
     WHERE provider_tran_id = $1
     RETURNING ${PAYMENT_COLUMNS}`,
    params
  );

  return result.rows[0] || null;
}

export async function markPaymentPending(tranId) {
  const client = await pool.connect();

  try {
    return await setPaymentStatus(client, tranId, "pending");
  } finally {
    client.release();
  }
}

export async function markPaymentFailed(tranId, reason, raw = null) {
  const client = await pool.connect();

  try {
    return await setPaymentStatus(client, tranId, "failed", {
      failureReason: reason || "Payment failed",
      raw,
    });
  } finally {
    client.release();
  }
}

export async function markPaymentCancelled(tranId, raw = null) {
  const client = await pool.connect();

  try {
    return await setPaymentStatus(client, tranId, "cancelled", { raw });
  } finally {
    client.release();
  }
}

async function addPaymentHistory(client, orderId, status, note) {
  await client.query(
    `INSERT INTO public.order_status_history (
       order_id, status, previous_status, admin_user_id, note
     )
     SELECT id, status, status, NULL, $2 FROM public.orders WHERE id = $1`,
    [orderId, note]
  );
}

/**
 * Verifies a gateway success callback server-side before trusting it.
 * The browser result is never trusted: the transaction is validated directly
 * against SSLCOMMERZ and the amount/currency/tran_id must all match.
 */
export async function verifyAndMarkPaid({ tranId, valId, raw = null }) {
  const payment = await getPaymentByTranId(tranId);

  if (!payment) {
    throw notFound("Payment attempt not found");
  }

  if (payment.status === "paid") {
    return { alreadyPaid: true, payment };
  }

  if (!valId) {
    await markPaymentFailed(tranId, "Missing gateway validation id", raw);
    return { paid: false, reason: "missing_val_id" };
  }

  let validation;

  try {
    validation = await validatePayment(valId);
  } catch {
    await markPaymentFailed(tranId, "Payment validation failed", raw);
    return { paid: false, reason: "validation_error" };
  }

  const expectedAmount = Math.round(Number(payment.amount) * 100);
  const validatedAmount =
    validation.amount === null ? null : Math.round(validation.amount * 100);

  const matches =
    validation.valid &&
    validation.tranId === tranId &&
    validatedAmount !== null &&
    validatedAmount === expectedAmount &&
    (!validation.currency || validation.currency === payment.currency);

  if (!matches) {
    await markPaymentFailed(
      tranId,
      `Gateway validation mismatch (${validation.status})`,
      validation.raw
    );
    return { paid: false, reason: "mismatch" };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const locked = await client.query(
      `SELECT id, status, order_id FROM public.payments
       WHERE provider_tran_id = $1 FOR UPDATE`,
      [tranId]
    );

    if (!locked.rows[0]) {
      await client.query("ROLLBACK");
      throw notFound("Payment attempt not found");
    }

    if (locked.rows[0].status === "paid") {
      await client.query("ROLLBACK");
      return { alreadyPaid: true, payment };
    }

    const updated = await setPaymentStatus(client, tranId, "paid", {
      valId,
      bankTranId: validation.bankTranId,
      cardType: validation.cardType,
      storeAmount: validation.storeAmount,
      raw: validation.raw || raw,
      failureReason: null,
    });

    await client.query(
      `UPDATE public.orders
       SET payment_status = 'paid', updated_at = NOW()
       WHERE id = $1 AND payment_status <> 'paid'`,
      [payment.order_id]
    );

    await addPaymentHistory(
      client,
      payment.order_id,
      "paid",
      "Payment received and verified"
    );

    await client.query(
      `INSERT INTO public.order_tracking_events (order_id, status, message)
       VALUES ($1, $2, $3)`,
      [payment.order_id, "payment", "Payment received and verified"]
    );

    await client.query("COMMIT");

    return { paid: true, payment: updated };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Keeps the payments table in sync when an admin manually changes the order
 * payment status (for example marking a Cash on Delivery order as paid).
 */
export async function syncPaymentStatusForOrder(client, orderId, paymentStatus) {
  const map = {
    unpaid: "pending",
    paid: "paid",
    refunded: "refunded",
    failed: "failed",
  };

  const target = map[paymentStatus];

  if (!target) {
    return;
  }

  const params = [orderId, target];
  const sets = ["status = $2", "updated_at = NOW()"];

  if (target === "paid") {
    sets.push("paid_at = COALESCE(paid_at, NOW())");
  }

  const result = await client.query(
    `UPDATE public.payments SET ${sets.join(", ")}
     WHERE order_id = $1
       AND status NOT IN ('paid')
     RETURNING id`,
    params
  );

  // If there is no payment row at all (legacy orders) create a COD record so
  // the payment history is never empty.
  if (result.rowCount === 0 && paymentStatus === "paid") {
    const order = await client.query(
      "SELECT total, currency, payment_method FROM public.orders WHERE id = $1",
      [orderId]
    );

    if (order.rows[0]) {
      await client.query(
        `INSERT INTO public.payments (
           order_id, provider, channel, status, amount, currency, provider_tran_id, paid_at
         )
         VALUES ($1,$2,$3,'paid',$4,$5,$6,NOW())`,
        [
          orderId,
          order.rows[0].payment_method === "cod" ? "cod" : "manual",
          null,
          order.rows[0].total,
          order.rows[0].currency,
          `MANUAL-${orderId}-${Date.now().toString(36).toUpperCase()}`,
        ]
      );
    }
  }
}

export async function countPaymentsByStatus() {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS total
     FROM public.payments
     GROUP BY status`
  );

  return result.rows;
}

export function assertPaymentMethod(method, channel) {
  if (method === PAYMENT_PROVIDER_COD) {
    return { method, channel: null };
  }

  if (method === PAYMENT_PROVIDER_SSLCOMMERZ) {
    if (!["bkash", "nagad", "card"].includes(channel)) {
      throw badRequest("Choose a valid online payment option");
    }

    return { method, channel };
  }

  throw badRequest("Unsupported payment method");
}
