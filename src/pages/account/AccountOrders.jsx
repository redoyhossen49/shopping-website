import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { formatCurrency, formatDate } from "../../utils/format.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { paymentMethodLabel } from "../../utils/orderStatus.js";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "./accountUi.jsx";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "return_requested", label: "Returns" },
];

export default function AccountOrders() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    meta: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await accountApi.listOrders({ page, status });
      setState({
        loading: false,
        error: "",
        items: response.data || [],
        meta: response.meta || null,
      });
    } catch (error) {
      setState({ loading: false, error: error.message, items: [], meta: null });
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = state.meta?.totalPages || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
        My Orders
      </h1>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              status === filter.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-[#cbd5e8] bg-white text-[#263968] hover:bg-indigo-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <SectionCard>
        {state.loading ? (
          <LoadingBlock label="Loading your orders…" />
        ) : state.error ? (
          <ErrorBlock message={state.error} onRetry={load} />
        ) : state.items.length === 0 ? (
          <EmptyBlock
            title="No orders found"
            description={
              status
                ? "No orders match this filter."
                : "When you place an order it will appear here."
            }
            action={
              <Link
                to="/products"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Start shopping
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-[#dfe6f5]">
            {state.items.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.order_number}`}
                  className="group flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-bold text-[#172554]">
                        {order.order_number}
                      </p>
                      <StatusBadge status={order.status} kind="order" />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {formatDate(order.created_at)} · {order.item_count} item
                      {order.item_count === 1 ? "" : "s"} ·{" "}
                      {paymentMethodLabel(order)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#172554]">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                    <FiChevronRight
                      className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                      size={20}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[#dfe6f5] pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-[#cbd5e8] px-4 py-2 text-sm font-bold text-[#263968] transition hover:bg-indigo-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[#cbd5e8] px-4 py-2 text-sm font-bold text-[#263968] transition hover:bg-indigo-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
