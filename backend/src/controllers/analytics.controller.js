import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  getBestSellingProducts,
  getCategoryPerformance,
  getDashboardKpis,
  getLowStockProducts,
  getRevenueSeries,
  getSalesTotals,
  getStatusDistribution,
  resolveRange,
} from "../services/analytics.service.js";
import { sendCsv, toCsv } from "../utils/csv.js";
import { env } from "../config/env.js";
import { adminScope } from "../utils/scope.js";

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const d = new Date(value);

  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export const getDashboardController = asyncHandler(async (req, res) => {
  const kpis = await getDashboardKpis(adminScope(req));
  return res.status(200).json({ success: true, data: kpis });
});

export const getAnalyticsController = asyncHandler(async (req, res) => {
  const isDemo = adminScope(req);
  const rangeKey = typeof req.query.range === "string" ? req.query.range : "30d";
  const { from, to, bucket } = resolveRange(
    rangeKey,
    parseDate(req.query.from),
    parseDate(req.query.to)
  );

  const [revenue, statusDistribution, bestSelling, categories, lowStock, totals] =
    await Promise.all([
      getRevenueSeries({ from, to, bucket, isDemo }),
      getStatusDistribution(isDemo),
      getBestSellingProducts({ from, to, limit: 5, isDemo }),
      getCategoryPerformance({ from, to, isDemo }),
      getLowStockProducts(10, isDemo),
      getSalesTotals({ from, to, isDemo }),
    ]);

  return res.status(200).json({
    success: true,
    data: {
      currency: env.currency,
      range: { from: from.toISOString(), to: to.toISOString(), bucket },
      revenue,
      statusDistribution,
      bestSelling,
      categories,
      lowStock,
      totals,
    },
  });
});

export const exportCsvController = asyncHandler(async (req, res) => {
  const rangeKey = typeof req.query.range === "string" ? req.query.range : "30d";
  const { from, to } = resolveRange(
    rangeKey,
    parseDate(req.query.from),
    parseDate(req.query.to)
  );

  const bestSelling = await getBestSellingProducts({
    from,
    to,
    limit: 100,
    isDemo: adminScope(req),
  });

  const columns = [
    { label: "Product ID", key: "product_id" },
    { label: "Product Title", key: "product_title" },
    { label: "Units Sold", key: "units_sold" },
    { label: "Revenue", key: "revenue" },
    { label: "Currency", key: "currency" },
  ];

  const rows = bestSelling.map((item) => ({
    ...item,
    revenue: Number(item.revenue).toFixed(2),
    currency: env.currency,
  }));

  const csv = toCsv(columns, rows);
  const filename = `nova-shop-best-selling-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;

  sendCsv(res, filename, csv);
});
