import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiRefreshCw, FiShoppingBag } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  Select,
  TableSkeleton,
} from "../components/ui.jsx";
import { formatCurrency, formatDateTime } from "../../utils/format.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "total:desc", label: "Highest total" },
  { value: "total:asc", label: "Lowest total" },
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const { to } = useAdminBase();

  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
    payment_status: "",
    sort: "created_at:desc",
  });

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");

    const [sortColumn, order] = query.sort.split(":");

    try {
      const response = await adminApi.listOrders({
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        payment_status: query.payment_status,
        sort: sortColumn,
        order,
      });

      if (requestId.current !== id) return;

      setOrders(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      if (requestId.current !== id) return;
      setError(err.message || "Failed to load orders.");
    } finally {
      if (requestId.current === id) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const debouncedSearch = useDebouncedValue(searchInput.trim());

  useEffect(() => {
    setQuery((previous) =>
      previous.search === debouncedSearch
        ? previous
        : { ...previous, page: 1, search: debouncedSearch }
    );
  }, [debouncedSearch]);

  const updateQuery = (patch) =>
    setQuery((previous) => ({ ...previous, page: 1, ...patch }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track, fulfil, and update customer orders."
        breadcrumb={[{ label: "Orders" }]}
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <form
            className="flex gap-2 lg:col-span-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateQuery({ search: searchInput.trim() });
            }}
          >
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search order number, name, or email"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <Select
            aria-label="Filter by status"
            value={query.status}
            onChange={(event) => updateQuery({ status: event.target.value })}
            className="lg:col-span-3"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by payment"
            value={query.payment_status}
            onChange={(event) =>
              updateQuery({ payment_status: event.target.value })
            }
            className="lg:col-span-2"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="lg:col-span-2">
            <Button variant="secondary" className="w-full" onClick={load}>
              <FiRefreshCw size={16} /> Refresh
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <Select
            aria-label="Sort orders"
            value={query.sort}
            onChange={(event) => updateQuery({ sort: event.target.value })}
            className="max-w-xs"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={FiShoppingBag}
            title="No orders found"
            description="Orders placed through the storefront will appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Items</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-indigo-50/40"
                      onClick={() => navigate(to(`/orders/${order.id}`))}
                    >
                      <td className="px-5 py-3 font-semibold text-indigo-700">
                        {order.order_number}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#172554]">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.customer_email}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {order.item_count}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#172554]">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>
                      <td className="px-5 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${order.order_number}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(to(`/orders/${order.id}`));
                            }}
                          >
                            <FiEye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={meta}
              onPageChange={(page) =>
                setQuery((previous) => ({ ...previous, page }))
              }
              onPageSizeChange={(limit) =>
                setQuery((previous) => ({ ...previous, page: 1, limit }))
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}
