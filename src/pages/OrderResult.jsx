import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiInfo,
  FiArrowRight,
  FiCopy,
  FiRefreshCw,
} from "react-icons/fi";
import { ordersApi } from "../api/orders.js";
import { paymentsApi } from "../api/payments.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../admin/components/Toast.jsx";
import { getGuestToken } from "../utils/guestOrders.js";
import OrderSummaryView from "../components/OrderSummaryView.jsx";
import { LoadingBlock } from "./account/accountUi.jsx";

const BANNERS = {
  success: {
    icon: FiCheckCircle,
    tone: "emerald",
    title: "Payment successful",
    message: "Your payment was received and your order is confirmed.",
  },
  placed: {
    icon: FiCheckCircle,
    tone: "indigo",
    title: "Order placed",
    message: "We have received your order and it is now pending confirmation.",
  },
  failed: {
    icon: FiAlertTriangle,
    tone: "rose",
    title: "Payment failed",
    message:
      "Your order was saved, but the payment did not go through. You can retry the payment below.",
  },
  cancelled: {
    icon: FiInfo,
    tone: "amber",
    title: "Payment cancelled",
    message:
      "You cancelled the payment. Your order is saved as unpaid and can be paid later.",
  },
};

const TONE_STYLES = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-600",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-600",
  rose: "border-rose-200 bg-rose-50 text-rose-600",
  amber: "border-amber-200 bg-amber-50 text-amber-600",
};

export default function OrderResult() {
  const [params] = useSearchParams();
  const status = params.get("status") || "placed";
  const orderNumber = params.get("order");
  const { user } = useAuth();
  const toast = useToast();

  const banner = BANNERS[status] || BANNERS.placed;
  const BannerIcon = banner.icon;

  const [state, setState] = useState({ loading: true, order: null, error: "" });
  const [retrying, setRetrying] = useState(false);

  const token = getGuestToken(orderNumber);

  const load = useCallback(async () => {
    if (!orderNumber) {
      setState({ loading: false, order: null, error: "Missing order number." });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    try {
      const response = await ordersApi.track(orderNumber, token);
      setState({ loading: false, order: response.data, error: "" });
    } catch (error) {
      setState({ loading: false, order: null, error: error.message });
    }
  }, [orderNumber, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopyTrackingLink = async () => {
    if (!token || !orderNumber) return;
    const link = `${window.location.origin}/track-order?order=${encodeURIComponent(
      orderNumber
    )}&token=${encodeURIComponent(token)}`;

    try {
      await navigator.clipboard.writeText(link);
      toast?.success("Tracking link copied");
    } catch {
      toast?.info(link);
    }
  };

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const response = await paymentsApi.initiate(orderNumber, token);
      window.location.href = response.data.gateway_page_url;
    } catch (error) {
      toast?.error(error.message);
      setRetrying(false);
    }
  };

  const order = state.order;
  const canRetry =
    order &&
    order.payment_method === "sslcommerz" &&
    order.payment_status !== "paid" &&
    ["failed", "cancelled"].includes(status);

  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e5ebf8] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-white/80 bg-[#f8faff] px-6 py-10 text-center shadow-xl shadow-[#172554]/10 sm:px-10">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border ${TONE_STYLES[banner.tone]}`}
          >
            <BannerIcon size={38} />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-[#172554] sm:text-3xl">
            {banner.title}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {banner.message}
          </p>

          {orderNumber && (
            <p className="mt-4 text-sm text-slate-500">
              Order{" "}
              <span className="font-bold text-[#172554]">{orderNumber}</span>
            </p>
          )}

          {!user && token && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-left">
              <p className="text-xs font-semibold text-indigo-900">
                Save your tracking link — you will need it to view this order
                again.
              </p>
              <button
                type="button"
                onClick={handleCopyTrackingLink}
                className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
              >
                <FiCopy size={15} /> Copy tracking link
              </button>
            </div>
          )}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {canRetry && (
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retrying}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <FiRefreshCw size={18} />
                {retrying ? "Redirecting…" : "Retry payment"}
              </button>
            )}

            <Link
              to="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cbd5e8] px-6 py-3 text-sm font-bold text-[#263968] transition hover:bg-indigo-50"
            >
              Continue Shopping
              <FiArrowRight size={18} />
            </Link>

            {user && (
              <Link
                to="/account/orders"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cbd5e8] px-6 py-3 text-sm font-bold text-[#263968] transition hover:bg-indigo-50"
              >
                View my orders
              </Link>
            )}
          </div>
        </section>

        <div className="mt-8">
          {state.loading ? (
            <LoadingBlock label="Loading your order…" />
          ) : state.error ? (
            <p className="text-center text-sm text-slate-500">{state.error}</p>
          ) : (
            <OrderSummaryView order={order} />
          )}
        </div>
      </div>
    </main>
  );
}
