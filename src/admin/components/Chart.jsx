import { formatCurrency, formatNumber } from "../../utils/format.js";

export function BarChart({ data = [], height = 220, valueFormatter = formatNumber }) {
  if (!data.length) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        No data for this period.
      </p>
    );
  }

  const max = Math.max(...data.map((entry) => Number(entry.value) || 0), 1);

  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-w-full items-end gap-1.5"
        style={{ height }}
        role="img"
        aria-label="Bar chart"
      >
        {data.map((entry, index) => {
          const value = Number(entry.value) || 0;
          const percent = Math.max((value / max) * 100, value > 0 ? 4 : 0);

          return (
            <div
              key={`${entry.label}-${index}`}
              className="group flex min-w-[14px] flex-1 flex-col items-center justify-end gap-1"
              title={`${entry.label}: ${valueFormatter(value)}`}
            >
              <span className="text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                {valueFormatter(value)}
              </span>
              <div
                className="w-full rounded-t-md bg-indigo-500/80 transition group-hover:bg-indigo-600"
                style={{ height: `${percent}%`, minHeight: value > 0 ? 3 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex min-w-full justify-between gap-1.5">
        {data.map((entry, index) => (
          <span
            key={`label-${entry.label}-${index}`}
            className="flex-1 truncate text-center text-[10px] text-slate-400"
          >
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data = [], size = 160 }) {
  const total = data.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  if (!total) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        No orders yet.
      </p>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const palette = {
    pending: "#f59e0b",
    processing: "#4f46e5",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#f43f5e",
  };

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Order status distribution">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#E3E9F7" strokeWidth="20" />
        {data.map((entry) => {
          const value = Number(entry.value) || 0;
          const fraction = value / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={entry.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={palette[entry.label] || "#64748b"}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="80" y="76" textAnchor="middle" className="fill-[#172554] text-xl font-bold">
          {total}
        </text>
        <text x="80" y="94" textAnchor="middle" className="fill-slate-400 text-[10px]">
          orders
        </text>
      </svg>

      <ul className="space-y-2">
        {data.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: palette[entry.label] || "#64748b" }}
            />
            <span className="capitalize text-slate-600">{entry.label}</span>
            <span className="font-semibold text-[#172554]">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegendValue({ value, tone = "neutral" }) {
  return (
    <span className="text-xs font-semibold text-slate-500">
      {tone === "currency" ? formatCurrency(value) : formatNumber(value)}
    </span>
  );
}
