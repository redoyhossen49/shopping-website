import { FiAlertTriangle, FiInbox, FiLoader } from "react-icons/fi";

export function SectionCard({ title, description, action, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-[#d7dff2] bg-[#f8faff] shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe6f5] px-5 py-4 sm:px-6">
          <div>
            {title && (
              <h2 className="text-lg font-extrabold text-[#172554]">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500">
      <FiLoader className="animate-spin text-indigo-600" size={26} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorBlock({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
      <FiAlertTriangle className="text-rose-500" size={28} />
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, description, action }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
      <FiInbox className="text-slate-400" size={30} />
      <div>
        <p className="font-bold text-[#172554]">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[#d7dff2] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50";

export const labelClass = "mb-2 block text-sm font-semibold text-[#263968]";

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd5e8] px-4 py-3 text-sm font-bold text-[#263968] transition hover:bg-indigo-50 disabled:opacity-60";
