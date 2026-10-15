import { useCallback, useEffect, useState } from "react";
import { FiDownloadCloud, FiRefreshCw } from "react-icons/fi";
import { adminApi, downloadAnalyticsCsv } from "../../api/admin.js";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Skeleton,
} from "../components/ui.jsx";
import { formatCurrency, formatNumber } from "../../utils/format.js";

const RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
];

export default function AdminAnalytics() {
  const toast = useToast();

  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getAnalytics({ range });
      setData(response.data);
    } catch (err) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAnalyticsCsv({ range });
      toast.success("Report downloaded.");
    } catch (err) {
      toast.error(err.message || "Could not export the report.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  const totals = data.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Revenue, best sellers, and category performance."
        breadcrumb={[{ label: "Analytics" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Select range"
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="w-auto"
            >
              {RANGES.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={load}>
              <FiRefreshCw size={16} /> Refresh
            </Button>
            <Button onClick={exportCsv} loading={exporting}>
              <FiDownloadCloud size={16} /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Collected revenue</p>
          <p className="mt-2 text-2xl font-extrabold text-[#172554]">
            {formatCurrency(totals.revenue, data.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Paid orders</p>
          <p className="mt-2 text-2xl font-extrabold text-[#172554]">
            {formatNumber(totals.paid_orders)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Total orders</p>
          <p className="mt-2 text-2xl font-extrabold text-[#172554]">
            {formatNumber(totals.total_orders)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Cancelled orders</p>
          <p className="mt-2 text-2xl font-extrabold text-[#172554]">
            {formatNumber(totals.cancelled_orders)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Best selling products" />
          {data.bestSelling?.length ? (
            <ul className="divide-y divide-slate-100">
              {data.bestSelling.map((product, index) => (
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
                      {formatCurrency(product.revenue, data.currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.units_sold} sold
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No sales in this range" description="Best sellers will appear once paid orders exist." />
          )}
        </Card>

        <Card>
          <CardHeader title="Category performance" />
          {data.categories?.length ? (
            <ul className="divide-y divide-slate-100">
              {data.categories.map((category) => (
                <li
                  key={category.category}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <span className="font-medium text-[#172554]">
                    {category.category}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">
                      {formatNumber(category.units_sold)} units
                    </span>
                    <span className="font-semibold text-[#172554]">
                      {formatCurrency(category.revenue, data.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No data" description="Category revenue will appear once paid orders exist." />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Order status distribution" />
        {data.statusDistribution?.length ? (
          <div className="flex flex-wrap gap-3 p-5">
            {data.statusDistribution.map((entry) => (
              <Badge key={entry.status} tone="neutral" className="capitalize">
                {entry.status}: {entry.total}
              </Badge>
            ))}
          </div>
        ) : (
          <EmptyState title="No orders" description="Order statuses will appear as orders are placed." />
        )}
      </Card>
    </div>
  );
}
