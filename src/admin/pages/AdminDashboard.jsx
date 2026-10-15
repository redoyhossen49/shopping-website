import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiDollarSign,
  FiShoppingBag,
  FiClock,
  FiPackage,
  FiAlertTriangle,
  FiUsers,
  FiArrowRight,
} from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useToast } from "../components/Toast.jsx";
import StatCard from "../components/StatCard.jsx";
import { BarChart, DonutChart } from "../components/Chart.jsx";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LinkButton,
  OrderStatusBadge,
  PageHeader,
  Skeleton,
  cx,
} from "../components/ui.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

function bucketLabel(bucket, kind) {
  const date = new Date(bucket);
  return kind === "month"
    ? date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function AdminDashboard() {
  const toast = useToast();
  const [range, setRange] = useState("30d");
  const [kpis, setKpis] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const rangeRef = useRef(range);

  const loadBasics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboard, analyticsResponse, ordersResponse] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getAnalytics({ range: rangeRef.current }),
        adminApi.listOrders({ limit: 5, page: 1 }),
      ]);

      setKpis(dashboard.data);
      setAnalytics(analyticsResponse.data);
      setRecentOrders(ordersResponse.data || []);
    } catch (err) {
      setError(err.message || "Failed to load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBasics();
  }, [loadBasics]);

  // Only the analytics endpoint depends on the range, so refetch just that.
  // loadBasics keeps a ref to the current range and no longer reruns on range
  // change, which previously fired a second, duplicate analytics request.
  const changeRange = async (nextRange) => {
    if (nextRange === range) return;
    rangeRef.current = nextRange;
    setRange(nextRange);
    setChartLoading(true);
    try {
      const response = await adminApi.getAnalytics({ range: nextRange });
      setAnalytics(response.data);
    } catch (err) {
      toast.error(err.message || "Could not load analytics.");
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Loading store metrics…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={loadBasics} />
      </Card>
    );
  }

  const totals = kpis.totals;
  const comparison = kpis.comparison;
  const revenueData = (analytics?.revenue || []).map((point) => ({
    label: bucketLabel(point.bucket, analytics.range.bucket),
    value: point.revenue,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="A live summary of sales, orders, and inventory."
        actions={
          <LinkButton to="/admin/products/new" variant="primary">
            <FiPackage size={16} /> Add product
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Collected revenue"
          value={formatCurrency(totals.paidRevenue, kpis.currency)}
          icon={FiDollarSign}
          tone="green"
          change={comparison.revenueChange}
        />
        <StatCard
          label="Total orders"
          value={totals.totalOrders}
          icon={FiShoppingBag}
          tone="indigo"
          change={comparison.ordersChange}
        />
        <StatCard
          label="Pending orders"
          value={totals.pendingOrders}
          icon={FiClock}
          tone="amber"
        />
        <StatCard
          label="Products"
          value={totals.totalProducts}
          icon={FiPackage}
          tone="violet"
        />
        <StatCard
          label="Low / out of stock"
          value={`${totals.lowStock} / ${totals.outOfStock}`}
          icon={FiAlertTriangle}
          tone="rose"
        />
        <StatCard
          label="Customers"
          value={totals.totalCustomers}
          icon={FiUsers}
          tone="blue"
        />
      </div>

      <Card>
        <CardHeader
          title="Revenue"
          description="Collected revenue from paid, non-cancelled orders."
          actions={
            <div className="flex flex-wrap gap-1">
              {RANGES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => changeRange(entry.key)}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    range === entry.key
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-indigo-50"
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="p-5">
          {chartLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <BarChart
              data={revenueData}
              valueFormatter={(value) => formatCurrency(value, kpis.currency)}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Order status" />
          <div className="p-5">
            <DonutChart data={analytics?.statusDistribution || []} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent orders"
            actions={
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all <FiArrowRight size={15} />
              </Link>
            }
          />
          {recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Orders placed through checkout will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-indigo-50/40">
                      <td className="px-5 py-3">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {order.customer_name}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#172554]">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Best selling products" description={`Top products in the selected range.`} />
          {analytics?.bestSelling?.length ? (
            <ul className="divide-y divide-slate-100">
              {analytics.bestSelling.map((product, index) => (
                <li
                  key={`${product.product_id}-${index}`}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-[#172554]">
                      {product.product_title}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#172554]">
                      {formatCurrency(product.revenue, kpis.currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.units_sold} sold
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No sales data" description="Best sellers appear once paid orders exist." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Low stock alerts"
            actions={
              <Link
                to="/admin/inventory"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Manage <FiArrowRight size={15} />
              </Link>
            }
          />
          {analytics?.lowStock?.length ? (
            <ul className="divide-y divide-slate-100">
              {analytics.lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <span className="truncate text-sm font-medium text-[#172554]">
                    {product.title}
                  </span>
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      Number(product.stock) === 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {product.stock} left
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Stock levels healthy" description="No products are low on stock." />
          )}
        </Card>
      </div>
    </div>
  );
}
