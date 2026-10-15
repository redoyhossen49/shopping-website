import crypto from "crypto";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { badRequest, conflict, notFound } from "../utils/ApiError.js";
import { buildMeta } from "../utils/pagination.js";
import { recordMovement } from "./products.service.js";
import { syncPaymentStatusForOrder } from "./payments.service.js";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"];

const TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: [],
  cancelled: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function randomOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");

  return `NV-${stamp}-${rand}`;
}

export function generateGuestToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashGuestToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function getShippingFee(client) {
  const result = await client.query(
    "SELECT default_shipping_fee FROM public.store_settings WHERE id = 1"
  );

  return result.rows[0]
    ? Number(result.rows[0].default_shipping_fee)
    : env.defaultShippingFee;
}

function withoutTokenHash(row) {
  if (!row) {
    return row;
  }

  const { guest_token_hash: _guestTokenHash, ...rest } = row;
  return rest;
}

export async function createOrder({
  userId = null,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  shippingCity,
  shippingCountry,
  shippingPostalCode,
  items,
  notes = null,
  paymentMethod = "cod",
  paymentChannel = null,
  isDemo = false,
}) {
  const client = await pool.connect();
  const guestToken = userId ? null : generateGuestToken();
  const guestTokenHash = guestToken ? hashGuestToken(guestToken) : null;

  try {
    await client.query("BEGIN");

    const productIds = [...new Set(items.map((item) => item.productId))].sort(
      (a, b) => a - b
    );

    const productsResult = await client.query(
      `SELECT id, title, price, stock
       FROM public.products
       WHERE id = ANY($1::bigint[]) AND is_demo = $2
       ORDER BY id
       FOR UPDATE`,
      [productIds, Boolean(isDemo)]
    );

    const productMap = new Map(
      productsResult.rows.map((product) => [String(product.id), product])
    );

    const remainingStock = new Map(
      productsResult.rows.map((product) => [String(product.id), product.stock])
    );

    const lineItems = [];

    for (const item of items) {
      const key = String(item.productId);
      const product = productMap.get(key);

      if (!product) {
        throw badRequest(`Product ${item.productId} is not available`, {
          field: "items",
        });
      }

      const available = remainingStock.get(key);

      if (available < item.quantity) {
        throw conflict(
          `Not enough stock for "${product.title}". Only ${available} left.`,
          { field: "items", productId: product.id }
        );
      }

      remainingStock.set(key, available - item.quantity);

      const unitPrice = Number(product.price);

      lineItems.push({
        productId: product.id,
        title: product.title,
        unitPrice,
        quantity: item.quantity,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      });
    }

    const subtotal =
      Math.round(
        lineItems.reduce((sum, line) => sum + line.lineTotal, 0) * 100
      ) / 100;

    const shippingFee = await getShippingFee(client);
    const total = Math.round((subtotal + shippingFee) * 100) / 100;

    let order;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const result = await client.query(
          `INSERT INTO public.orders (
             order_number, user_id, customer_name, customer_email,
             customer_phone, shipping_address, shipping_city,
             shipping_country, shipping_postal_code, subtotal,
             shipping_fee, total, currency, notes,
             payment_method, payment_channel, guest_token_hash, is_demo
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           RETURNING *`,
          [
            randomOrderNumber(),
            userId,
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress,
            shippingCity,
            shippingCountry,
            shippingPostalCode,
            subtotal,
            shippingFee,
            total,
            env.currency,
            notes,
            paymentMethod,
            paymentChannel,
            guestTokenHash,
            Boolean(isDemo),
          ]
        );

        order = result.rows[0];
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 4) {
          continue;
        }

        throw error;
      }
    }

    const orderItemValues = [];
    const orderItemParams = [];

    lineItems.forEach((line, index) => {
      const base = index * 6;
      orderItemParams.push(
        order.id,
        line.productId,
        line.title,
        line.unitPrice,
        line.quantity,
        line.lineTotal
      );
      orderItemValues.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`
      );
    });

    await client.query(
      `INSERT INTO public.order_items (
         order_id, product_id, product_title, unit_price, quantity, line_total
       )
       VALUES ${orderItemValues.join(", ")}`,
      orderItemParams
    );

    // The products were locked with SELECT ... FOR UPDATE above, so stock can be
    // decremented from the in-memory snapshot without re-reading each row.
    const stockToWrite = new Map(
      productsResult.rows.map((product) => [String(product.id), product.stock])
    );

    for (const line of lineItems) {
      const key = String(line.productId);
      const previousStock = stockToWrite.get(key);
      const newStock = previousStock - line.quantity;

      stockToWrite.set(key, newStock);

      await client.query(
        "UPDATE public.products SET stock = $2, updated_at = NOW() WHERE id = $1",
        [line.productId, newStock]
      );

      await recordMovement(client, {
        productId: line.productId,
        change: -line.quantity,
        previousStock,
        newStock,
        reason: "order",
        note: `Order ${order.order_number}`,
        adminUserId: null,
        isDemo,
      });
    }

    await client.query(
      `INSERT INTO public.order_status_history (order_id, status, previous_status, note)
       VALUES ($1, $2, $3, $4)`,
      [order.id, "pending", null, "Order placed"]
    );

    await client.query(
      `INSERT INTO public.order_tracking_events (order_id, status, message)
       VALUES ($1, $2, $3)`,
      [order.id, "pending", "Order placed successfully"]
    );

    // Cash on delivery is recorded immediately as a pending payment so admins
    // have a full payment history. Online payments are created when the
    // customer is redirected to the SSLCOMMERZ gateway.
    if (paymentMethod === "cod") {
      await client.query(
        `INSERT INTO public.payments (
           order_id, provider, channel, status, amount, currency, provider_tran_id
         )
         VALUES ($1,'cod',NULL,'pending',$2,$3,$4)`,
        [order.id, total, env.currency, `COD-${order.order_number}`]
      );
    }

    await client.query("COMMIT");

    const fullOrder = await getOrderByNumber(order.order_number);

    if (guestToken) {
      fullOrder.tracking_token = guestToken;
    }

    return fullOrder;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function insertTrackingEvent(
  client,
  orderId,
  { status = null, message, location = null, occurredAt = null }
) {
  const executor = client || pool;

  await executor.query(
    `INSERT INTO public.order_tracking_events (order_id, status, message, location, occurred_at)
     VALUES ($1,$2,$3,$4,COALESCE($5, NOW()))`,
    [orderId, status, message, location, occurredAt]
  );
}

export async function getTrackingEvents(orderId) {
  const result = await pool.query(
    `SELECT id, status, message, location, occurred_at
     FROM public.order_tracking_events
     WHERE order_id = $1
     ORDER BY occurred_at ASC, id ASC`,
    [orderId]
  );

  return result.rows;
}

export async function getOrderByNumber(orderNumber) {
  const orderResult = await pool.query(
    "SELECT * FROM public.orders WHERE order_number = $1",
    [orderNumber]
  );

  if (!orderResult.rows[0]) {
    return null;
  }

  const items = await getOrderItems(orderResult.rows[0].id);

  return { ...withoutTokenHash(orderResult.rows[0]), items };
}

async function getOrderItems(orderId) {
  const result = await pool.query(
    `SELECT id, product_id, product_title, unit_price, quantity, line_total
     FROM public.order_items
     WHERE order_id = $1
     ORDER BY id ASC`,
    [orderId]
  );

  return result.rows;
}

export async function listAdminOrders({
  search = "",
  status = "",
  paymentStatus = "",
  isDemo,
  page,
  limit,
  offset,
  sortColumn,
  direction,
}) {
  const params = [isDemo];
  const conditions = ["is_demo = $1"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(order_number ILIKE $${params.length} OR customer_email ILIKE $${params.length} OR customer_name ILIKE $${params.length})`
    );
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (paymentStatus) {
    params.push(paymentStatus);
    conditions.push(`payment_status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.orders ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  const result = await pool.query(
    `SELECT
       o.id, o.order_number, o.user_id, o.customer_name, o.customer_email,
       o.status, o.payment_status, o.payment_method, o.payment_channel,
       o.tracking_number, o.carrier, o.subtotal, o.shipping_fee, o.total,
       o.currency, o.created_at,
       COALESCE((
         SELECT SUM(oi.quantity)
         FROM public.order_items oi
         WHERE oi.order_id = o.id
       ), 0)::int AS item_count
     FROM public.orders o
     ${where}
     ORDER BY o.${sortColumn} ${direction}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

export async function getOrderReturns(orderId) {
  const result = await pool.query(
    `SELECT r.id, r.order_id, r.user_id, r.type, r.reason, r.status,
            r.admin_note, r.created_at, r.updated_at, u.name AS resolved_by_name
     FROM public.order_returns r
     LEFT JOIN public.users u ON u.id = r.resolved_by
     WHERE r.order_id = $1
     ORDER BY r.created_at DESC`,
    [orderId]
  );

  return result.rows;
}

export async function getAdminOrderById(id, isDemo) {
  const orderResult = await pool.query(
    "SELECT * FROM public.orders WHERE id = $1 AND is_demo = $2",
    [id, Boolean(isDemo)]
  );

  const order = orderResult.rows[0];

  if (!order) {
    return null;
  }

  const items = await getOrderItems(order.id);

  const history = await pool.query(
    `SELECT h.id, h.status, h.previous_status, h.note, h.created_at,
            u.name AS admin_name
     FROM public.order_status_history h
     LEFT JOIN public.users u ON u.id = h.admin_user_id
     WHERE h.order_id = $1
     ORDER BY h.created_at ASC, h.id ASC`,
    [order.id]
  );

  const payments = await pool.query(
    `SELECT id, order_id, provider, channel, status, amount, currency,
            provider_tran_id, val_id, bank_tran_id, card_type, store_amount,
            failure_reason, initiated_at, paid_at, updated_at
     FROM public.payments
     WHERE order_id = $1
     ORDER BY initiated_at DESC, id DESC`,
    [order.id]
  );

  const [tracking, returns] = await Promise.all([
    getTrackingEvents(order.id),
    getOrderReturns(order.id),
  ]);

  return {
    ...withoutTokenHash(order),
    items,
    history: history.rows,
    payments: payments.rows,
    tracking,
    returns,
  };
}

export async function restockOrderItems(client, order, adminUserId, reason) {
  const items = await client.query(
    `SELECT product_id, quantity
     FROM public.order_items
     WHERE order_id = $1 AND product_id IS NOT NULL`,
    [order.id]
  );

  for (const item of items.rows) {
    const stockResult = await client.query(
      "SELECT stock FROM public.products WHERE id = $1 FOR UPDATE",
      [item.product_id]
    );

    if (!stockResult.rows[0]) {
      continue;
    }

    const previousStock = stockResult.rows[0].stock;
    const newStock = previousStock + item.quantity;

    await client.query(
      "UPDATE public.products SET stock = $2, updated_at = NOW() WHERE id = $1",
      [item.product_id, newStock]
    );

    await recordMovement(client, {
      productId: item.product_id,
      change: item.quantity,
      previousStock,
      newStock,
      reason,
      note: `Order ${order.order_number} ${reason === "order_returned" ? "returned" : "cancelled"}`,
      adminUserId,
      isDemo: order.is_demo,
    });
  }
}

const FULFILMENT_TIMESTAMP = {
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

export async function updateOrderStatus(
  id,
  nextStatus,
  adminUserId,
  isDemo
) {
  const orderResult = await pool.query(
    "SELECT id, status, order_number, is_demo FROM public.orders WHERE id = $1 AND is_demo = $2",
    [id, Boolean(isDemo)]
  );

  const order = orderResult.rows[0];

  if (!order) {
    throw notFound("Order not found");
  }

  if (order.status === nextStatus) {
    throw badRequest(`Order is already ${nextStatus}`);
  }

  if (!canTransition(order.status, nextStatus)) {
    throw badRequest(
      `Cannot change status from ${order.status} to ${nextStatus}`
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const timestampColumn = FULFILMENT_TIMESTAMP[nextStatus];
    const sets = ["status = $2", "updated_at = NOW()"];

    if (timestampColumn) {
      sets.push(`${timestampColumn} = NOW()`);
    }

    await client.query(
      `UPDATE public.orders SET ${sets.join(", ")} WHERE id = $1`,
      [id, nextStatus]
    );

    const historyNote = `Status changed from ${order.status} to ${nextStatus}`;

    await client.query(
      `INSERT INTO public.order_status_history (
         order_id, status, previous_status, admin_user_id, note
       )
       VALUES ($1,$2,$3,$4,$5)`,
      [id, nextStatus, order.status, adminUserId, historyNote]
    );

    await insertTrackingEvent(client, id, {
      status: nextStatus,
      message: trackingMessageForStatus(nextStatus),
    });

    // Cancelling (or returning) an order restocks the reserved items.
    if (nextStatus === "cancelled") {
      await restockOrderItems(client, order, adminUserId, "order_cancelled");
    }

    await client.query("COMMIT");

    return getAdminOrderById(id, isDemo);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function trackingMessageForStatus(status) {
  const messages = {
    processing: "Your order is being prepared",
    shipped: "Your order has been shipped",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
    return_requested: "A return has been requested",
    returned: "Your order has been returned",
  };

  return messages[status] || `Order status updated to ${status}`;
}

export async function updateOrderTracking(
  id,
  { carrier = null, trackingNumber = null, trackingUrl = null, note = null },
  adminUserId,
  isDemo
) {
  const orderResult = await pool.query(
    "SELECT id, status FROM public.orders WHERE id = $1 AND is_demo = $2",
    [id, Boolean(isDemo)]
  );

  if (!orderResult.rows[0]) {
    throw notFound("Order not found");
  }

  await pool.query(
    `UPDATE public.orders SET
       carrier = $2,
       tracking_number = $3,
       tracking_url = $4,
       updated_at = NOW()
     WHERE id = $1`,
    [id, carrier, trackingNumber, trackingUrl]
  );

  const message =
    note ||
    (trackingNumber
      ? `Tracking number ${trackingNumber}${carrier ? ` (${carrier})` : ""} added`
      : "Shipment details updated");

  await pool.query(
    `INSERT INTO public.order_status_history (
       order_id, status, previous_status, admin_user_id, note
     )
     SELECT id, status, status, $2, $3 FROM public.orders WHERE id = $1`,
    [id, adminUserId, message]
  );

  await insertTrackingEvent(null, id, {
    status: orderResult.rows[0].status,
    message,
    location: carrier,
  });

  return getAdminOrderById(id, isDemo);
}

export async function updatePaymentStatus(id, paymentStatus, adminUserId, isDemo) {
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    throw badRequest(`Invalid payment status: ${paymentStatus}`);
  }

  const orderResult = await pool.query(
    "SELECT id FROM public.orders WHERE id = $1 AND is_demo = $2",
    [id, Boolean(isDemo)]
  );

  if (!orderResult.rows[0]) {
    throw notFound("Order not found");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE public.orders SET payment_status = $2, updated_at = NOW() WHERE id = $1",
      [id, paymentStatus]
    );

    await syncPaymentStatusForOrder(client, id, paymentStatus);

    await client.query(
      `INSERT INTO public.order_status_history (
         order_id, status, previous_status, admin_user_id, note
       )
       SELECT id, status, status, $2, $3 FROM public.orders WHERE id = $1`,
      [id, adminUserId, `Payment marked as ${paymentStatus}`]
    );

    await client.query("COMMIT");

    return getAdminOrderById(id, isDemo);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function countOrders(isDemo) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.orders WHERE is_demo = $1",
    [isDemo]
  );

  return result.rows[0].total;
}

export async function countOrdersByStatus(isDemo) {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS total
     FROM public.orders
     WHERE is_demo = $1
     GROUP BY status`,
    [isDemo]
  );

  return result.rows;
}

export async function getRecentOrders(limit = 5, isDemo) {
  const result = await pool.query(
    `SELECT id, order_number, customer_name, customer_email,
            status, payment_status, total, currency, created_at
     FROM public.orders
     WHERE is_demo = $2
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit, isDemo]
  );

  return result.rows;
}

async function buildAccountOrder(order) {
  const [items, payments, tracking, returns] = await Promise.all([
    getOrderItems(order.id),
    pool.query(
      `SELECT id, provider, channel, status, amount, currency, card_type,
              bank_tran_id, failure_reason, initiated_at, paid_at
       FROM public.payments
       WHERE order_id = $1
       ORDER BY initiated_at DESC, id DESC`,
      [order.id]
    ),
    getTrackingEvents(order.id),
    getOrderReturns(order.id),
  ]);

  return {
    ...withoutTokenHash(order),
    items,
    payments: payments.rows,
    tracking,
    returns,
  };
}

export async function listOrdersForUser(userId, { page, limit, offset, status }) {
  const params = [userId];
  let where = "WHERE user_id = $1";

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.orders ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  const result = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
            o.payment_channel, o.subtotal, o.shipping_fee, o.total, o.currency,
            o.tracking_number, o.carrier, o.created_at,
            COALESCE((
              SELECT SUM(oi.quantity)
              FROM public.order_items oi
              WHERE oi.order_id = o.id
            ), 0)::int AS item_count
     FROM public.orders o
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

export async function getOrderForUser(userId, orderNumber) {
  const result = await pool.query(
    "SELECT * FROM public.orders WHERE user_id = $1 AND order_number = $2",
    [userId, orderNumber]
  );

  if (!result.rows[0]) {
    return null;
  }

  return buildAccountOrder(result.rows[0]);
}

export async function getOrderNumberById(id) {
  const result = await pool.query(
    "SELECT order_number FROM public.orders WHERE id = $1",
    [id]
  );

  return result.rows[0]?.order_number || null;
}

export async function getOrderRecordLite(orderNumber) {
  const result = await pool.query(
    `SELECT id, order_number, user_id, total, currency, payment_method,
            payment_channel, payment_status, status, customer_name,
            customer_email, customer_phone, shipping_address, shipping_city,
            shipping_country, shipping_postal_code, guest_token_hash, created_at
     FROM public.orders
     WHERE order_number = $1`,
    [orderNumber]
  );

  return result.rows[0] || null;
}

/**
 * Guest order access is gated behind a high-entropy tracking token that is
 * shown once at checkout and stored only as a SHA-256 hash.
 */
export async function getGuestOrder(orderNumber, token) {
  const order = await getOrderRecordLite(orderNumber);

  if (!order) {
    return null;
  }

  if (!token || !order.guest_token_hash) {
    return null;
  }

  const providedHash = hashGuestToken(token);

  const expected = Buffer.from(order.guest_token_hash, "hex");
  const actual = Buffer.from(providedHash, "hex");

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  return buildAccountOrder(order);
}
