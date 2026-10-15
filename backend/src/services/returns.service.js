import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { badRequest, conflict, notFound } from "../utils/ApiError.js";
import { buildMeta } from "../utils/pagination.js";
import {
  insertTrackingEvent,
  restockOrderItems,
} from "./orders.service.js";
import { syncPaymentStatusForOrder } from "./payments.service.js";

export const RETURN_TYPES = ["cancellation", "return"];
export const RETURN_STATUSES = ["requested", "approved", "rejected", "completed"];

const OPEN_STATUSES = ["requested", "approved"];

const RETURN_COLUMNS = `
  id, order_id, user_id, type, reason, status, admin_note, resolved_by,
  created_at, updated_at
`;

async function findOpenReturn(client, orderId) {
  const result = await client.query(
    `SELECT id FROM public.order_returns
     WHERE order_id = $1 AND status IN ('requested','approved')`,
    [orderId]
  );

  return result.rows[0] || null;
}

async function getOrderForUpdate(client, orderId) {
  const result = await client.query(
    `SELECT id, order_number, status, payment_status, delivered_at, updated_at,
            user_id, is_demo
     FROM public.orders
     WHERE id = $1
     FOR UPDATE`,
    [orderId]
  );

  return result.rows[0] || null;
}

export async function requestCancellation({ orderId, userId = null, reason, isDemo = false }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const order = await getOrderForUpdate(client, orderId);

    if (!order) {
      throw notFound("Order not found");
    }

    if (!["pending", "processing"].includes(order.status)) {
      throw badRequest(
        "This order can no longer be cancelled. You can request a return after delivery instead."
      );
    }

    if (await findOpenReturn(client, orderId)) {
      throw conflict("There is already an open request for this order");
    }

    const result = await client.query(
      `INSERT INTO public.order_returns (order_id, user_id, type, reason, status, is_demo)
       VALUES ($1,$2,'cancellation',$3,'requested',$4)
       RETURNING ${RETURN_COLUMNS}`,
      [orderId, userId, reason, Boolean(isDemo)]
    );

    await client.query(
      `INSERT INTO public.order_status_history (order_id, status, previous_status, admin_user_id, note)
       VALUES ($1,$2,$2,NULL,$3)`,
      [orderId, order.status, "Cancellation requested by customer"]
    );

    await insertTrackingEvent(client, orderId, {
      status: order.status,
      message: "Cancellation requested",
    });

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestReturn({ orderId, userId = null, reason, isDemo = false }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const order = await getOrderForUpdate(client, orderId);

    if (!order) {
      throw notFound("Order not found");
    }

    if (order.status !== "delivered") {
      throw badRequest("Only delivered orders can be returned");
    }

    const deliveredAt = order.delivered_at || order.updated_at;
    const deadline = new Date(deliveredAt).getTime() +
      env.returnWindowDays * 24 * 60 * 60 * 1000;

    if (Date.now() > deadline) {
      throw badRequest(
        `The return window of ${env.returnWindowDays} days has passed`
      );
    }

    if (await findOpenReturn(client, orderId)) {
      throw conflict("There is already an open request for this order");
    }

    const result = await client.query(
      `INSERT INTO public.order_returns (order_id, user_id, type, reason, status, is_demo)
       VALUES ($1,$2,'return',$3,'requested',$4)
       RETURNING ${RETURN_COLUMNS}`,
      [orderId, userId, reason, Boolean(isDemo)]
    );

    await client.query(
      `UPDATE public.orders SET status = 'return_requested', updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    await client.query(
      `INSERT INTO public.order_status_history (order_id, status, previous_status, admin_user_id, note)
       VALUES ($1,'return_requested','delivered',NULL,$2)`,
      [orderId, "Return requested by customer"]
    );

    await insertTrackingEvent(client, orderId, {
      status: "return_requested",
      message: "Return requested",
    });

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listReturnsForUser(userId) {
  const result = await pool.query(
    `SELECT r.id, r.order_id, r.type, r.reason, r.status, r.admin_note,
            r.created_at, r.updated_at, o.order_number, o.total, o.currency
     FROM public.order_returns r
     JOIN public.orders o ON o.id = r.order_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function listReturnsForOrder(orderId) {
  const result = await pool.query(
    `SELECT ${RETURN_COLUMNS}
     FROM public.order_returns
     WHERE order_id = $1
     ORDER BY created_at DESC`,
    [orderId]
  );

  return result.rows;
}

export async function listAdminReturns({ status = "", isDemo, page, limit, offset }) {
  const params = [isDemo];
  const conditions = ["r.is_demo = $1"];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.order_returns r ${where}`,
    params
  );

  const listParams = [...params, limit, offset];

  const result = await pool.query(
    `SELECT r.id, r.order_id, r.user_id, r.type, r.reason, r.status,
            r.admin_note, r.created_at, r.updated_at,
            o.order_number, o.customer_name, o.customer_email, o.total, o.currency
     FROM public.order_returns r
     JOIN public.orders o ON o.id = r.order_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    rows: result.rows,
    meta: buildMeta({ page, limit, total: countResult.rows[0].total }),
  };
}

export async function getReturnById(id, isDemo) {
  const result = await pool.query(
    `SELECT r.id, r.order_id, r.user_id, r.type, r.reason, r.status,
            r.admin_note, r.created_at, r.updated_at,
            o.order_number, o.customer_name, o.customer_email, o.status AS order_status
     FROM public.order_returns r
     JOIN public.orders o ON o.id = r.order_id
     WHERE r.id = $1 AND r.is_demo = $2`,
    [id, Boolean(isDemo)]
  );

  return result.rows[0] || null;
}

export async function updateReturnStatus(
  id,
  { status, adminNote = null },
  adminUserId,
  isDemo
) {
  if (!["approved", "rejected"].includes(status)) {
    throw badRequest("Status must be approved or rejected");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const returnResult = await client.query(
      `SELECT ${RETURN_COLUMNS} FROM public.order_returns WHERE id = $1 AND is_demo = $2 FOR UPDATE`,
      [id, Boolean(isDemo)]
    );

    const record = returnResult.rows[0];

    if (!record) {
      throw notFound("Return request not found");
    }

    if (record.status !== "requested") {
      throw badRequest(`This request has already been ${record.status}`);
    }

    const order = await getOrderForUpdate(client, record.order_id);

    if (!order) {
      throw notFound("Order not found");
    }

    if (status === "rejected") {
      // Reverting a return request puts the order back to delivered.
      if (record.type === "return" && order.status === "return_requested") {
        await client.query(
          "UPDATE public.orders SET status = 'delivered', updated_at = NOW() WHERE id = $1",
          [order.id]
        );

        await client.query(
          `INSERT INTO public.order_status_history (order_id, status, previous_status, admin_user_id, note)
           VALUES ($1,'delivered','return_requested',$2,$3)`,
          [order.id, adminUserId, adminNote || "Return request rejected"]
        );

        await insertTrackingEvent(client, order.id, {
          status: "delivered",
          message: adminNote || "Return request rejected",
        });
      } else {
        await client.query(
          `INSERT INTO public.order_status_history (order_id, status, previous_status, admin_user_id, note)
           VALUES ($1,$2,$2,$3,$4)`,
          [order.id, order.status, adminUserId, adminNote || "Cancellation request rejected"]
        );
      }
    } else {
      // Approved: perform the cancellation / return.
      const targetStatus = record.type === "cancellation" ? "cancelled" : "returned";
      const reason = record.type === "cancellation" ? "order_cancelled" : "order_returned";

      await client.query(
        "UPDATE public.orders SET status = $2, updated_at = NOW() WHERE id = $1",
        [order.id, targetStatus]
      );

      await restockOrderItems(client, order, adminUserId, reason);

      if (targetStatus === "returned" && order.payment_status === "paid") {
        await client.query(
          "UPDATE public.orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1",
          [order.id]
        );
        await syncPaymentStatusForOrder(client, order.id, "refunded");
      }

      await client.query(
        `INSERT INTO public.order_status_history (order_id, status, previous_status, admin_user_id, note)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          order.id,
          targetStatus,
          order.status,
          adminUserId,
          adminNote || `${record.type === "cancellation" ? "Cancellation" : "Return"} approved`,
        ]
      );

      await insertTrackingEvent(client, order.id, {
        status: targetStatus,
        message:
          adminNote ||
          (record.type === "cancellation"
            ? "Cancellation approved"
            : "Return approved and refund initiated"),
      });
    }

    const updated = await client.query(
      `UPDATE public.order_returns SET
         status = $2,
         admin_note = $3,
         resolved_by = $4,
         updated_at = NOW()
       WHERE id = $1
       RETURNING ${RETURN_COLUMNS}`,
      [id, status, adminNote, adminUserId]
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
