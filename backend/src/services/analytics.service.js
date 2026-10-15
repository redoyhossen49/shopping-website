import { pool } from "../config/db.js";
import { env } from "../config/env.js";

/**
 * Revenue rule (documented once, used everywhere):
 * collected revenue = SUM(orders.total)
 *   WHERE payment_status = 'paid' AND status <> 'cancelled'
 * Unpaid, refunded, failed, and cancelled orders are excluded.
 *
 * Every query is additionally scoped by is_demo so a demo dashboard never
 * mixes in real store data and vice versa.
 */

const REVENUE_FILTER = "payment_status = 'paid' AND status <> 'cancelled'";

export const RANGE_PRESETS = {
  "7d": { days: 7, bucket: "day" },
  "30d": { days: 30, bucket: "day" },
  "90d": { days: 90, bucket: "day" },
  "12m": { days: 365, bucket: "month" },
};

export function resolveRange(range = "30d", fromParam, toParam) {
  const now = new Date();
  const to = toParam ? new Date(toParam) : now;

  let from;
  let bucket = "day";

  if (fromParam) {
    from = new Date(fromParam);
  } else {
    const preset = RANGE_PRESETS[range] || RANGE_PRESETS["30d"];
    bucket = preset.bucket;
    from = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const preset = RANGE_PRESETS["30d"];
    from = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
  }

  const spanMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime());
  const previousFrom = new Date(from.getTime() - spanMs);

  return { from, to, previousFrom, previousTo, bucket };
}

function percentChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;

  if (p === 0) {
    return c === 0 ? 0 : null;
  }

  return Math.round(((c - p) / p) * 1000) / 10;
}

async function scalar(sql, params = []) {
  const result = await pool.query(sql, params);

  return result.rows[0] || {};
}

export async function getDashboardKpis(isDemo) {
  const scope = Boolean(isDemo);

  const totals = await scalar(
    `
    SELECT
      (SELECT COALESCE(SUM(total), 0) FROM public.orders
        WHERE ${REVENUE_FILTER} AND is_demo = $1) AS paid_revenue,
      (SELECT COUNT(*)::int FROM public.orders WHERE is_demo = $1) AS total_orders,
      (SELECT COUNT(*)::int FROM public.orders WHERE status = 'pending' AND is_demo = $1) AS pending_orders,
      (SELECT COUNT(*)::int FROM public.products WHERE is_demo = $1) AS total_products,
      (SELECT COUNT(*)::int FROM public.products
        WHERE stock = 0 AND is_demo = $1) AS out_of_stock,
      (SELECT COUNT(*)::int FROM public.products
        WHERE stock > 0 AND stock <= low_stock_threshold AND is_demo = $1) AS low_stock,
      (SELECT COUNT(*)::int FROM public.users WHERE role = 'customer' AND is_demo = $1) AS total_customers
  `,
    [scope]
  );

  const range = resolveRange("30d");

  const windowTotals = await scalar(
    `SELECT
       COALESCE(SUM(total) FILTER (
         WHERE ${REVENUE_FILTER} AND created_at >= $2 AND created_at < $3
       ), 0) AS revenue_current,
       COUNT(*) FILTER (
         WHERE created_at >= $2 AND created_at < $3
       ) AS orders_current,
       COALESCE(SUM(total) FILTER (
         WHERE ${REVENUE_FILTER} AND created_at >= $4 AND created_at < $5
       ), 0) AS revenue_previous,
       COUNT(*) FILTER (
         WHERE created_at >= $4 AND created_at < $5
       ) AS orders_previous
     FROM public.orders
     WHERE is_demo = $1`,
    [scope, range.from, range.to, range.previousFrom, range.previousTo]
  );

  return {
    currency: env.currency,
    totals: {
      paidRevenue: Number(totals.paid_revenue),
      totalOrders: totals.total_orders,
      pendingOrders: totals.pending_orders,
      totalProducts: totals.total_products,
      outOfStock: totals.out_of_stock,
      lowStock: totals.low_stock,
      totalCustomers: totals.total_customers,
    },
    comparison: {
      range: "30d",
      revenueChange: percentChange(
        windowTotals.revenue_current,
        windowTotals.revenue_previous
      ),
      ordersChange: percentChange(
        windowTotals.orders_current,
        windowTotals.orders_previous
      ),
    },
  };
}

export async function getRevenueSeries({ from, to, bucket, isDemo }) {
  const step = bucket === "month" ? "1 month" : "1 day";
  const filter =
    bucket === "month"
      ? "date_trunc('month', created_at)"
      : "date_trunc('day', created_at)";
  const series =
    bucket === "month"
      ? "date_trunc('month', created_at)"
      : "date_trunc('day', created_at)";
  const truncFrom =
    bucket === "month"
      ? "date_trunc('month', $1::timestamptz)"
      : "date_trunc('day', $1::timestamptz)";
  const truncTo =
    bucket === "month"
      ? "date_trunc('month', $2::timestamptz)"
      : "date_trunc('day', $2::timestamptz)";

  const result = await pool.query(
    `WITH buckets AS (
       SELECT generate_series(
         ${truncFrom},
         ${truncTo},
         INTERVAL '${step}'
       ) AS bucket
     ),
     revenue AS (
       SELECT
         ${filter} AS bucket,
         COALESCE(SUM(total), 0) AS revenue,
         COUNT(*) AS orders
       FROM public.orders
       WHERE created_at >= $1 AND created_at < $2
         AND is_demo = $3
         AND ${REVENUE_FILTER}
       GROUP BY 1
     ),
     order_counts AS (
       SELECT
         ${series} AS bucket,
         COUNT(*) AS orders
       FROM public.orders
       WHERE created_at >= $1 AND created_at < $2
         AND is_demo = $3
       GROUP BY 1
     )
     SELECT
       b.bucket,
       COALESCE(r.revenue, 0)::numeric(12,2) AS revenue,
       COALESCE(o.orders, 0)::int AS orders
     FROM buckets b
     LEFT JOIN revenue r ON r.bucket = b.bucket
     LEFT JOIN order_counts o ON o.bucket = b.bucket
     ORDER BY b.bucket ASC`,
    [from, to, Boolean(isDemo)]
  );

  return result.rows.map((row) => ({
    bucket: row.bucket,
    revenue: Number(row.revenue),
    orders: row.orders,
  }));
}

export async function getStatusDistribution(isDemo) {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS total
     FROM public.orders
     WHERE is_demo = $1
     GROUP BY status
     ORDER BY status ASC`,
    [Boolean(isDemo)]
  );

  return result.rows;
}

export async function getBestSellingProducts({ from, to, limit = 5, isDemo }) {
  const result = await pool.query(
    `SELECT
       oi.product_id,
       oi.product_title,
       SUM(oi.quantity)::int AS units_sold,
       COALESCE(SUM(oi.line_total), 0)::numeric(12,2) AS revenue
     FROM public.order_items oi
     JOIN public.orders o ON o.id = oi.order_id
     WHERE o.created_at >= $1 AND o.created_at < $2
       AND o.is_demo = $4
       AND o.${REVENUE_FILTER}
     GROUP BY oi.product_id, oi.product_title
     ORDER BY units_sold DESC
     LIMIT $3`,
    [from, to, limit, Boolean(isDemo)]
  );

  return result.rows;
}

export async function getCategoryPerformance({ from, to, isDemo }) {
  const result = await pool.query(
    `SELECT
       COALESCE(c.name, p.category, 'Uncategorized') AS category,
       COUNT(oi.id)::int AS units_sold,
       COALESCE(SUM(oi.line_total), 0)::numeric(12,2) AS revenue
     FROM public.order_items oi
     JOIN public.orders o ON o.id = oi.order_id
     LEFT JOIN public.products p ON p.id = oi.product_id
     LEFT JOIN public.categories c ON c.id = p.category_id
     WHERE o.created_at >= $1 AND o.created_at < $2
       AND o.is_demo = $3
       AND o.${REVENUE_FILTER}
     GROUP BY 1
     ORDER BY revenue DESC`,
    [from, to, Boolean(isDemo)]
  );

  return result.rows;
}

export async function getLowStockProducts(limit = 10, isDemo) {
  const result = await pool.query(
    `SELECT id, title, category, stock, low_stock_threshold
     FROM public.products
     WHERE stock <= low_stock_threshold AND is_demo = $2
     ORDER BY stock ASC, title ASC
     LIMIT $1`,
    [limit, Boolean(isDemo)]
  );

  return result.rows;
}

export async function getSalesTotals({ from, to, isDemo }) {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(total) FILTER (WHERE ${REVENUE_FILTER}), 0)::numeric(12,2) AS revenue,
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE ${REVENUE_FILTER})::int AS paid_orders,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders,
       COUNT(*) FILTER (WHERE payment_status = 'unpaid')::int AS unpaid_orders
     FROM public.orders
     WHERE created_at >= $1 AND created_at < $2
       AND is_demo = $3`,
    [from, to, Boolean(isDemo)]
  );

  return result.rows[0];
}
