import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiSearch, FiPackage } from "react-icons/fi";
import { ordersApi } from "../api/orders.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../admin/components/Toast.jsx";
import { getGuestToken } from "../utils/guestOrders.js";
import OrderSummaryView from "../components/OrderSummaryView.jsx";
import { LoadingBlock } from "./account/accountUi.jsx";

const inputClass =
  "w-full rounded-xl border border-[#d7dff2] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "mb-2 block text-sm font-semibold text-[#263968]";

export default function TrackOrder() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    order: params.get("order") || "",
    token: params.get("token") || "",
  });
  const [state, setState] = useState({ loading: false, order: null, error: "" });

  const lookup = useCallback(
    async (orderNumber, token) => {
      if (!orderNumber?.trim()) {
        toast?.error("Please enter your order number");
        return;
      }

      const effectiveToken = token?.trim() || getGuestToken(orderNumber.trim());
      setState({ loading: true, order: null, error: "" });

      try {
        const response = await ordersApi.track(orderNumber.trim(), effectiveToken);
        setState({ loading: false, order: response.data, error: "" });
      } catch (error) {
        setState({ loading: false, order: null, error: error.message });
      }
    },
    [toast]
  );

  // Auto-load when the page is opened with a link (?order=...&token=...).
  useEffect(() => {
    const orderNumber = params.get("order");
    if (!orderNumber) return;
    lookup(orderNumber, params.get("token") || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setParams(
      {
        ...(form.order.trim() ? { order: form.order.trim() } : {}),
        ...(form.token.trim() ? { token: form.token.trim() } : {}),
      },
      { replace: true }
    );
    lookup(form.order, form.token);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e5ebf8] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FiPackage size={30} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#172554]">
            Track your order
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
            {user
              ? "Enter an order number, or open this page from your account orders."
              : "Enter your order number and tracking token to see its current status."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-sm sm:p-7"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="order" className={labelClass}>
                Order number *
              </label>
              <input
                id="order"
                className={inputClass}
                placeholder="NV-XXXXXX-XXXX"
                value={form.order}
                onChange={(event) =>
                  setForm((f) => ({ ...f, order: event.target.value }))
                }
              />
            </div>

            <div>
              <label htmlFor="token" className={labelClass}>
                Tracking token {user ? "(if you have one)" : "*"}
              </label>
              <input
                id="token"
                className={inputClass}
                placeholder="From your confirmation"
                value={form.token}
                onChange={(event) =>
                  setForm((f) => ({ ...f, token: event.target.value }))
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={state.loading}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <FiSearch size={17} />
            {state.loading ? "Looking up…" : "Track order"}
          </button>
        </form>

        <div className="mt-8">
          {state.loading ? (
            <LoadingBlock label="Looking up your order…" />
          ) : state.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-center text-sm text-rose-700">
              {state.error}
            </div>
          ) : (
            state.order && <OrderSummaryView order={state.order} />
          )}
        </div>
      </div>
    </main>
  );
}
