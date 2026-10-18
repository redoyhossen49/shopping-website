import React from "react";
import { Link } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiInbox,
  FiAlertTriangle,
  FiLock,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { titleCase } from "../../utils/format.js";
import { useAdminBase } from "../context/AdminBaseContext.jsx";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Inline notice shown wherever a write action is unavailable because the
 * current session is the read-only public demo.
 */
export function ReadOnlyNotice({ children, className = "" }) {
  return (
    <div
      role="status"
      className={cx(
        "flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900",
        className
      )}
    >
      <FiLock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        {children ||
          "This is a read-only demo. Sign in as the store owner to make changes."}
      </span>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-[#D7DFF2] bg-[#F8FAFF] shadow-sm",
        className
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#E3E9F7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-bold text-[#172554]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500/40",
  secondary:
    "border border-[#CBD5E8] bg-white text-[#263968] hover:bg-indigo-50 focus-visible:ring-indigo-500/30",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40",
  ghost:
    "text-[#263968] hover:bg-indigo-50 focus-visible:ring-indigo-500/30",
};

const BUTTON_SIZES = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Component
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      disabled={Component === "button" ? isDisabled : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <FiLoader className="animate-spin" size={16} />}
      {children}
    </Component>
  );
}

export function LinkButton({ variant = "primary", size = "md", className, to, children, ...props }) {
  return (
    <Link
      to={to}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

const TONES = {
  neutral: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-100 text-indigo-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const ORDER_STATUS_TONES = {
  pending: "amber",
  processing: "indigo",
  shipped: "violet",
  delivered: "green",
  cancelled: "red",
  return_requested: "amber",
  returned: "neutral",
};

const PAYMENT_STATUS_TONES = {
  unpaid: "amber",
  paid: "green",
  refunded: "neutral",
  failed: "red",
};

export function OrderStatusBadge({ status }) {
  return (
    <Badge tone={ORDER_STATUS_TONES[status] || "neutral"}>
      {titleCase(status)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }) {
  return (
    <Badge tone={PAYMENT_STATUS_TONES[status] || "neutral"}>
      {titleCase(status)}
    </Badge>
  );
}

export function StockBadge({ stock, threshold = 5 }) {
  const value = Number(stock) || 0;

  if (value <= 0) return <Badge tone="red">Out of stock</Badge>;
  if (value <= threshold) return <Badge tone="amber">Low · {value}</Badge>;
  return <Badge tone="green">{value} in stock</Badge>;
}

export function Field({ label, htmlFor, error, hint, required, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-semibold text-[#263968]"
        >
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}

const controlClass =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-100";

export function Input({ error, className = "", ...props }) {
  return (
    <input
      className={cx(
        controlClass,
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-[#CBD5E8] focus:border-indigo-500 focus:ring-indigo-500/10",
        className
      )}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select
      className={cx(
        controlClass,
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-[#CBD5E8] focus:border-indigo-500 focus:ring-indigo-500/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className = "", ...props }) {
  return (
    <textarea
      className={cx(
        controlClass,
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-[#CBD5E8] focus:border-indigo-500 focus:ring-indigo-500/10",
        className
      )}
      {...props}
    />
  );
}

export function Spinner({ className = "" }) {
  return (
    <FiLoader className={cx("animate-spin text-indigo-600", className)} />
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-lg bg-slate-200/70", className)} />
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cx("h-4", columnIndex === 0 ? "w-40" : "w-20")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = FiInbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 text-base font-bold text-[#172554]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <FiAlertTriangle size={26} />
      </span>
      <h3 className="mt-4 text-base font-bold text-[#172554]">
        Something went wrong
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {message || "We could not load this data."}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, description, breadcrumb = [], actions }) {
  const { to } = useAdminBase();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
          <Link to={to("/dashboard")} className="hover:text-indigo-600">
            Admin
          </Link>
          {breadcrumb.map((crumb) => (
            <React.Fragment key={crumb.label}>
              <span className="text-slate-300">/</span>
              {crumb.to ? (
                <Link to={to(crumb.to)} className="hover:text-indigo-600">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#263968]">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#172554]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Compact pager window with ellipses, e.g. 1 … 4 5 6 … 12
function pagerItems(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...wanted]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);

  const result = [];
  let previous = 0;

  for (const value of sorted) {
    if (value - previous > 1) {
      result.push("gap");
    }
    result.push(value);
    previous = value;
  }

  return result;
}

export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = meta;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E3E9F7] px-5 py-4 sm:flex-row">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          Page <span className="font-semibold text-[#172554]">{page}</span> of{" "}
          <span className="font-semibold text-[#172554]">{totalPages}</span> ·{" "}
          {total} records
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-[#CBD5E8] bg-white px-2 py-1 text-sm text-[#172554] focus:border-indigo-500 focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <FiChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {pagerItems(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "primary" : "secondary"}
              size="sm"
              className="min-w-[2.5rem] px-2"
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}

        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <FiChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f1c3f]/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative w-full rounded-2xl border border-[#D7DFF2] bg-[#F8FAFF] shadow-2xl",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E3E9F7] px-5 py-4">
          <h2 className="text-base font-bold text-[#172554]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-[#E3E9F7] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-slate-600">{message}</p>
    </Modal>
  );
}

export function SearchBar({ value, onChange, placeholder, onSubmit }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="relative flex-1"
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cx(
          controlClass,
          "border-[#CBD5E8] pl-4 focus:border-indigo-500 focus:ring-indigo-500/10"
        )}
      />
    </form>
  );
}
