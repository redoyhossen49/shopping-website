import { FiTrendingDown, FiTrendingUp, FiMinus } from "react-icons/fi";
import { Card, cx } from "./ui.jsx";
import { formatPercent } from "../../utils/format.js";

const TONE_CLASSES = {
  indigo: "bg-indigo-100 text-indigo-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
  rose: "bg-rose-100 text-rose-700",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
  change,
  changeLabel,
}) {
  const hasChange = change !== undefined && change !== null;
  const isUp = hasChange && change > 0;
  const isDown = hasChange && change < 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#172554]">
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={cx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              TONE_CLASSES[tone] || TONE_CLASSES.indigo
            )}
          >
            <Icon size={20} />
          </span>
        )}
      </div>

      {hasChange && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cx(
              "inline-flex items-center gap-1 font-semibold",
              isUp && "text-emerald-600",
              isDown && "text-rose-600",
              !isUp && !isDown && "text-slate-500"
            )}
          >
            {isUp && <FiTrendingUp size={14} />}
            {isDown && <FiTrendingDown size={14} />}
            {!isUp && !isDown && <FiMinus size={14} />}
            {formatPercent(change)}
          </span>
          <span className="text-slate-400">
            {changeLabel || "vs previous 30 days"}
          </span>
        </div>
      )}
    </Card>
  );
}
