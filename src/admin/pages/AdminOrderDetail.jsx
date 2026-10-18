import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiClock,
  FiCheck,
  FiCreditCard,
  FiTruck,
  FiRefreshCw,
} from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  ReadOnlyNotice,
  Select,
  Skeleton,
  cx,
  Input,
  Textarea,
  Field,
} from "../components/ui.jsx";
import { formatCurrency, formatDateTime, titleCase } from "../../utils/format.js";

const TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: [],
  cancelled: [],
};

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { isReadOnly } = useAdminAuth();
  const { to } = useAdminBase();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTarget, setStatusTarget] = useState("");
  const [paymentTarget, setPaymentTarget] = useState("");
  const [tracking, setTracking] = useState({
    carrier: "",
    tracking_number: "",
    tracking_url: "",
    note: "",
  });
  const [savingTracking, setSavingTracking] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getOrder(id);
      const data = response.data;
      setOrder(data);
      setPaymentTarget(data.payment_status);
      setTracking({
        carrier: data.carrier || "",
        tracking_number: data.tracking_number || "",
        tracking_url: data.tracking_url || "",
        note: "",
      });
    } catch (err) {
      setError(err.message || "Failed to load this order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const applyStatus = async () => {
    if (!statusTarget) return;
    setBusy(true);
    try {
      const response = await adminApi.updateOrderStatus(id, statusTarget);
      setOrder(response.data);
      setPaymentTarget(response.data.payment_status);
      setStatusTarget("");
      toast.success(`Order marked as ${statusTarget}.`);
    } catch (err) {
      toast.error(err.message || "Could not update the order status.");
    } finally {
      setBusy(false);
    }
  };

  const applyPayment = async () => {
    if (!paymentTarget || paymentTarget === order.payment_status) return;
    setBusy(true);
    try {
      const response = await adminApi.updateOrderPayment(id, paymentTarget);
      setOrder(response.data);
      toast.success(`Payment marked as ${paymentTarget}.`);
    } catch (err) {
      toast.error(err.message || "Could not update the payment status.");
      setPaymentTarget(order.payment_status);
    } finally {
      setBusy(false);
    }
  };

  const saveTracking = async () => {
    setSavingTracking(true);
    try {
      const body = {
        carrier: tracking.carrier.trim() || undefined,
        tracking_number: tracking.tracking_number.trim() || undefined,
        tracking_url: tracking.tracking_url.trim() || undefined,
        note: tracking.note.trim() || undefined,
      };
      const response = await adminApi.updateOrderTracking(id, body);
      setOrder(response.data);
      setTracking((t) => ({ ...t, note: "" }));
      toast.success("Tracking information updated.");
    } catch (err) {
      toast.error(err.message || "Could not update tracking.");
    } finally {
      setSavingTracking(false);
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

  const nextStatuses = TRANSITIONS[order.status] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        description={`Placed ${formatDateTime(order.created_at)}`}
        breadcrumb={[
          { label: "Orders", to: "/orders" },
          { label: order.order_number },
        ]}
        actions={
          <Link
            to={to("/orders")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
          >
            <FiArrowLeft size={16} /> Back to orders
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.payment_status} />
        {order.currency && <Badge tone="neutral">{order.currency}</Badge>}
      </div>

      {isReadOnly && <ReadOnlyNotice />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Items" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Unit price</th>
                  <th className="px-5 py-3 font-semibold">Qty</th>
                  <th className="px-5 py-3 text-right font-semibold">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      {item.product_id ? (
                        <Link
                          to={to(`/products/${item.product_id}/edit`)}
                          className="font-medium text-indigo-700 hover:underline"
                        >
                          {item.product_title}
                        </Link>
                      ) : (
                        <span className="font-medium text-[#172554]">
                          {item.product_title}
                        </span>
                      )}
                      {!item.product_id && (
                        <span className="ml-2 text-xs text-slate-400">
                          (removed)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatCurrency(item.unit_price, order.currency)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#172554]">
                      {formatCurrency(item.line_total, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#E3E9F7] px-5 py-4">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shipping_fee, order.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-[#E3E9F7] pt-2 text-base font-bold text-[#172554]">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Customer" />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-2 text-[#172554]">
                <FiUser className="text-slate-400" size={16} />
                <span className="font-semibold">{order.customer_name}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <FiMail className="text-slate-400" size={16} />
                <a
                  href={`mailto:${order.customer_email}`}
                  className="hover:text-indigo-600"
                >
                  {order.customer_email}
                </a>
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <FiPhone className="text-slate-400" size={16} />
                {order.customer_phone}
              </p>
              <div className="flex items-start gap-2 border-t border-[#E3E9F7] pt-3 text-slate-600">
                <FiMapPin className="mt-0.5 text-slate-400" size={16} />
                <address className="not-italic leading-6">
                  {order.shipping_address}
                  <br />
                  {order.shipping_city}, {order.shipping_postal_code}
                  <br />
                  {order.shipping_country}
                </address>
              </div>
              {order.notes && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> {order.notes}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Fulfilment" />
            <div className="space-y-5 p-5">
              {isReadOnly ? (
                <p className="text-sm text-slate-600">
                  This order is{" "}
                  <span className="font-semibold">
                    {titleCase(order.status)}
                  </span>{" "}
                  with payment{" "}
                  <span className="font-semibold">
                    {titleCase(order.payment_status)}
                  </span>
                  . Order and payment updates are disabled in the read-only
                  demo.
                </p>
              ) : (
                <>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#263968]">
                  Order status
                </label>
                {nextStatuses.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No further transitions from{" "}
                    <span className="font-semibold">{order.status}</span>.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={statusTarget}
                      onChange={(event) => setStatusTarget(event.target.value)}
                    >
                      <option value="">Choose next status…</option>
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      onClick={applyStatus}
                      loading={busy}
                      disabled={!statusTarget}
                    >
                      <FiCheck size={16} />
                    </Button>
                  </div>
                )}
                {nextStatuses.includes("cancelled") && (
                  <p className="mt-2 text-xs text-slate-400">
                    Cancelling restocks all items automatically.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#263968]">
                  Payment status
                </label>
                <div className="flex gap-2">
                  <Select
                    value={paymentTarget}
                    onChange={(event) => setPaymentTarget(event.target.value)}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={applyPayment}
                    loading={busy}
                    disabled={paymentTarget === order.payment_status}
                  >
                    <FiCreditCard size={16} />
                  </Button>
                </div>
              </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Shipping & Tracking" />
            <div className="space-y-4 p-5">
              <fieldset disabled={isReadOnly} className="contents">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Carrier">
                  <Input
                    value={tracking.carrier}
                    onChange={(e) =>
                      setTracking((t) => ({ ...t, carrier: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Tracking number">
                  <Input
                    value={tracking.tracking_number}
                    onChange={(e) =>
                      setTracking((t) => ({ ...t, tracking_number: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Tracking URL" className="sm:col-span-2">
                  <Input
                    value={tracking.tracking_url}
                    onChange={(e) =>
                      setTracking((t) => ({ ...t, tracking_url: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Note (internal)" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={tracking.note}
                    onChange={(e) =>
                      setTracking((t) => ({ ...t, note: e.target.value }))
                    }
                  />
                </Field>
              </div>
              </fieldset>
              {!isReadOnly && (
                <Button onClick={saveTracking} loading={savingTracking}>
                  <FiTruck size={16} /> Save tracking details
                </Button>
              )}

              {order.tracking?.length > 0 && (
                <div className="border-t border-[#E3E9F7] pt-4">
                  <p className="mb-3 text-sm font-semibold text-[#263968]">
                    Tracking timeline
                  </p>
                  <ol className="space-y-4 border-l border-slate-200 pl-6">
                    {[...order.tracking].reverse().map((event) => (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[31px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                        <p className="text-sm font-medium text-[#172554]">
                          {event.message}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.occurred_at)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Transaction</th>
                    <th className="px-5 py-3 font-semibold">Channel</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Paid at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.payments?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">
                        No payment records.
                      </td>
                    </tr>
                  ) : (
                    order.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-[#172554]">
                            {payment.provider_tran_id}
                          </p>
                          {payment.bank_tran_id && (
                            <p className="text-xs text-slate-500">
                              Bank: {payment.bank_tran_id}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {payment.channel || payment.provider}
                        </td>
                        <td className="px-5 py-3 font-medium text-[#172554]">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-5 py-3">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {payment.paid_at ? formatDateTime(payment.paid_at) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Returns & Cancellations" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Reason</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Admin note</th>
                    <th className="px-5 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.returns?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">
                        No requests.
                      </td>
                    </tr>
                  ) : (
                    order.returns.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 font-medium text-[#172554]">
                          {titleCase(item.type)}
                        </td>
                        <td className="max-w-[260px] px-5 py-3 text-slate-600">
                          <span className="line-clamp-2">{item.reason}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={item.status === "requested" ? "amber" : item.status === "rejected" ? "red" : item.status === "approved" ? "green" : "neutral"}>
                            {titleCase(item.status)}
                          </Badge>
                        </td>
                        <td className="max-w-[260px] px-5 py-3 text-slate-600">
                          {item.admin_note || "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {formatDateTime(item.updated_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Timeline" />
        <ol className="space-y-0 p-5">
          {order.history.map((entry, index) => (
            <li key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    index === order.history.length - 1
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  <FiClock size={15} />
                </span>
                {index < order.history.length - 1 && (
                  <span className="w-px flex-1 bg-slate-200" />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-semibold text-[#172554]">
                  {titleCase(entry.status)}
                  {entry.previous_status &&
                    entry.previous_status !== entry.status &&
                    ` (from ${entry.previous_status})`}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(entry.created_at)}
                  {entry.admin_name ? ` · by ${entry.admin_name}` : ""}
                </p>
                {entry.note && (
                  <p className="mt-1 text-xs text-slate-500">{entry.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
