import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  RETURN_STATUS_META,
} from "../utils/orderStatus.js";

const TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

const MAPS = {
  order: ORDER_STATUS_META,
  payment: PAYMENT_STATUS_META,
  return: RETURN_STATUS_META,
};

export default function StatusBadge({ status, kind = "order", className = "" }) {
  const meta = MAPS[kind]?.[status] || { label: status, tone: "slate" };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        TONES[meta.tone] || TONES.slate
      } ${className}`}
    >
      {meta.label}
    </span>
  );
}
