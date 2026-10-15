import {
  FiTruck,
  FiMapPin,
  FiCreditCard,
  FiPackage,
} from "react-icons/fi";
import { formatCurrency, formatDateTime } from "../utils/format.js";
import StatusBadge from "./StatusBadge.jsx";
import { paymentMethodLabel } from "../utils/orderStatus.js";

export default function OrderSummaryView({ order }) {
  if (!order) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7dff2] bg-white px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Order number
          </p>
          <p className="text-lg font-extrabold text-[#172554]">
            {order.order_number}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} kind="order" />
          <p className="mt-2 text-xl font-extrabold text-[#172554]">
            {formatCurrency(order.total, order.currency)}
          </p>
        </div>
      </div>

      {order.tracking?.length > 0 && (
        <div className="rounded-2xl border border-[#d7dff2] bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-[#172554]">
            <FiTruck className="text-indigo-600" size={18} /> Tracking
          </h3>
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
        </div>
      )}

      <div className="rounded-2xl border border-[#d7dff2] bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-[#172554]">
          <FiPackage className="text-indigo-600" size={18} /> Items
        </h3>
        <ul className="divide-y divide-[#dfe6f5]">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <span className="text-[#172554]">
                {item.product_title}{" "}
                <span className="text-slate-400">× {item.quantity}</span>
              </span>
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
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#d7dff2] bg-white p-5 text-sm">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#172554]">
            <FiMapPin className="text-indigo-600" size={17} /> Shipping to
          </h3>
          <div className="space-y-0.5 text-slate-600">
            <p className="font-semibold text-[#263968]">{order.customer_name}</p>
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

        <div className="rounded-2xl border border-[#d7dff2] bg-white p-5 text-sm">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#172554]">
            <FiCreditCard className="text-indigo-600" size={17} /> Payment
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">{paymentMethodLabel(order)}</span>
            <StatusBadge status={order.payment_status} kind="payment" />
          </div>
          {(order.payments || [])
            .filter((pay) => pay.provider !== "cod")
            .slice(0, 3)
            .map((pay) => (
              <p key={pay.id} className="mt-2 text-xs text-slate-500">
                {pay.bank_tran_id || pay.channel || pay.provider} · {pay.status}
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}
