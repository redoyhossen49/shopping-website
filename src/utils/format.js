import { STORE_CURRENCY } from "../config/app.js";

export function formatCurrency(value, currency = STORE_CURRENCY) {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `৳${amount.toFixed(2)}`;
  }
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-BD").format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n}%`;
}

export function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
