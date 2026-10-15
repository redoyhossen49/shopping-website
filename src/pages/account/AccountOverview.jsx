import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiPackage,
  FiMapPin,
  FiRefreshCw,
  FiArrowRight,
  FiUser,
} from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { formatCurrency, formatDate } from "../../utils/format.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "./accountUi.jsx";

export default function AccountOverview() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", orders: [] });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await accountApi.listOrders({ limit: 3 });
      setState({ loading: false, error: "", orders: response.data || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, orders: [] });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
          Welcome back, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Track your orders, manage addresses and keep your details up to date.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { to: "/account/orders", label: "Orders", icon: FiPackage },
          { to: "/account/addresses", label: "Addresses", icon: FiMapPin },
          { to: "/account/returns", label: "Returns", icon: FiRefreshCw },
          { to: "/account/profile", label: "Profile", icon: FiUser },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#d7dff2] bg-[#f8faff] px-3 py-5 text-center text-sm font-bold text-[#263968] shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon size={19} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <SectionCard
        title="Recent orders"
        action={
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-900"
          >
            View all <FiArrowRight size={15} />
          </Link>
        }
      >
        {state.loading ? (
          <LoadingBlock label="Loading your orders…" />
        ) : state.error ? (
          <ErrorBlock message={state.error} onRetry={load} />
        ) : state.orders.length === 0 ? (
          <EmptyBlock
            title="No orders yet"
            description="When you place an order it will appear here."
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
            {state.orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.order_number}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 transition hover:text-indigo-700"
                >
                  <div>
                    <p className="font-bold text-[#172554]">
                      {order.order_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(order.created_at)} · {order.item_count} item
                      {order.item_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} kind="order" />
                    <span className="font-bold text-[#172554]">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
