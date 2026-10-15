import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiTruck,
  FiMapPin,
  FiCreditCard,
  FiPackage,
  FiRotateCcw,
  FiXCircle,
} from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { formatCurrency, formatDateTime } from "../../utils/format.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import {
  canCancelOrder,
  canReturnOrder,
  hasOpenRequest,
  paymentMethodLabel,
  RETURN_TYPE_LABELS,
} from "../../utils/orderStatus.js";
import { useToast } from "../../admin/components/Toast.jsx";
import {
  ErrorBlock,
  LoadingBlock,
  SectionCard,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "./accountUi.jsx";

function RequestModal({ type, onClose, onSubmitted }) {
  const toast = useToast();
  const isCancel = type === "cancellation";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 3) {
      toast?.error("Please tell us why (at least 3 characters)");
      return;
    }

    setBusy(true);
    try {
      await onSubmitted(reason.trim());
      onClose();
    } catch (error) {
      toast?.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#d7dff2] bg-white p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-[#172554]">
          {isCancel ? "Request cancellation" : "Request a return"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isCancel
            ? "Your order will only be cancelled once our team approves the request."
            : "Tell us what went wrong. Our team will review your return request."}
        </p>

        <div className="mt-4">
          <label className={labelClass}>Reason</label>
          <textarea
            className={`${inputClass} min-h-[110px] resize-y`}
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
            placeholder={isCancel ? "Why do you want to cancel?" : "What is wrong with the order?"}
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Close
          </button>
          <button type="button" className={primaryButton} disabled={busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountOrderDetail() {
  const { orderNumber } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState({ loading: true, error: "", order: null });
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await accountApi.getOrder(orderNumber);
      setState({ loading: false, error: "", order: response.data });
    } catch (error) {
      setState({ loading: false, error: error.message, order: null });
    }
  }, [orderNumber]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return <LoadingBlock label="Loading your order…" />;
  }

  if (state.error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/account/orders")}
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
        >
          <FiArrowLeft size={16} /> Back to orders
        </button>
        <ErrorBlock message={state.error} onRetry={load} />
      </div>
    );
  }

  const order = state.order;
  const openRequest = hasOpenRequest(order);
  const latestReturn = (order.returns || [])[0];

  const submitRequest = async (reason) => {
    if (modal === "cancellation") {
      await accountApi.cancelOrder(order.order_number, reason);
      toast?.success("Cancellation request submitted");
    } else {
      await accountApi.returnOrder(order.order_number, reason);
      toast?.success("Return request submitted");
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/account/orders")}
        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
      >
        <FiArrowLeft size={16} /> Back to orders
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
              {order.order_number}
            </h1>
            <StatusBadge status={order.status} kind="order" />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canCancelOrder(order) && !openRequest && (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setModal("cancellation")}
            >
              <FiXCircle size={17} /> Request cancellation
            </button>
          )}
          {canReturnOrder(order) && !openRequest && (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setModal("return")}
            >
              <FiRotateCcw size={17} /> Request return
            </button>
          )}
        </div>
      </div>

      {latestReturn && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-indigo-900">
              {RETURN_TYPE_LABELS[latestReturn.type] || "Request"} ·{" "}
              {latestReturn.reason}
            </p>
            <StatusBadge status={latestReturn.status} kind="return" />
          </div>
          {latestReturn.admin_note && (
            <p className="mt-2 text-sm text-indigo-800">
              Store note: {latestReturn.admin_note}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {order.tracking?.length > 0 && (
            <SectionCard title="Tracking">
              <ol className="relative space-y-5 border-l border-[#d7dff2] pl-6">
                {[...order.tracking].reverse().map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[31px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                    <p className="text-sm font-bold text-[#172554]">
                      {event.message}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(event.occurred_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          <SectionCard title="Items">
            <ul className="divide-y divide-[#dfe6f5]">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FiPackage size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-[#172554]">
                        {item.product_title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(item.unit_price, order.currency)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-[#172554]">
                    {formatCurrency(item.line_total, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-[#dfe6f5] pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-semibold text-[#172554]">
                  {formatCurrency(order.subtotal, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Shipping</dt>
                <dd className="font-semibold text-[#172554]">
                  {formatCurrency(order.shipping_fee, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[#dfe6f5] pt-2 text-base">
                <dt className="font-bold text-[#172554]">Total</dt>
                <dd className="font-extrabold text-[#172554]">
                  {formatCurrency(order.total, order.currency)}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Shipping">
            <div className="flex gap-3 text-sm text-slate-600">
              <FiMapPin className="mt-0.5 shrink-0 text-indigo-600" size={17} />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#263968]">
                  {order.customer_name}
                </p>
                <p>{order.customer_phone}</p>
                <p>{order.shipping_address}</p>
                <p>
                  {[order.shipping_city, order.shipping_postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p>{order.shipping_country}</p>
              </div>
            </div>

            {order.tracking_number && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                <FiTruck size={17} />
                <span>
                  {order.carrier ? `${order.carrier} · ` : ""}
                  {order.tracking_number}
                </span>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Payment">
            <div className="flex items-start gap-3 text-sm">
              <FiCreditCard className="mt-0.5 text-indigo-600" size={17} />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">
                    {paymentMethodLabel(order)}
                  </span>
                  <StatusBadge status={order.payment_status} kind="payment" />
                </div>
                <p className="font-bold text-[#172554]">
                  {formatCurrency(order.total, order.currency)}
                </p>

                {(order.payments || [])
                  .filter((payment) => payment.provider !== "cod")
                  .slice(0, 3)
                  .map((payment) => (
                    <p key={payment.id} className="text-xs text-slate-500">
                      {payment.bank_tran_id || payment.channel || payment.provider}{" "}
                      · {payment.status}
                    </p>
                  ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Need help?{" "}
        <Link to="/contact" className="font-bold text-indigo-700 hover:text-indigo-900">
          Contact support
        </Link>
      </p>

      {modal && (
        <RequestModal
          type={modal}
          onClose={() => setModal(null)}
          onSubmitted={submitRequest}
        />
      )}
    </div>
  );
}
