import { Link } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import { useAppConfig } from "../context/AppConfigContext.jsx";

/**
 * Banner shown whenever the app is backed by a demo sandbox. It tells visitors
 * the data is synthetic and where to reset it.
 */
export default function DemoBanner() {
  const { demoMode } = useAppConfig();

  if (!demoMode) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm"
    >
      <span className="inline-flex items-center gap-1.5">
        <FiAlertCircle aria-hidden="true" />
        <span>
          Demo sandbox — all products, customers and orders are sample data
          and can be edited or reset.
        </span>
        <Link
          to="/admin/login"
          className="underline underline-offset-2 hover:text-amber-700"
        >
          Open admin demo
        </Link>
      </span>
    </div>
  );
}
