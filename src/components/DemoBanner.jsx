import { Link } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import { useAppConfig } from "../context/AppConfigContext.jsx";

/**
 * Banner shown whenever the read-only admin demo sandbox is available. The
 * storefront itself always serves the real store; only the dashboard uses the
 * synthetic demo dataset.
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
          Admin demo available — explore a read-only dashboard with sample
          customers, orders and inventory.
        </span>
        <Link
          to="/demo/dashboard"
          className="underline underline-offset-2 hover:text-amber-700"
        >
          Explore Admin Dashboard
        </Link>
      </span>
    </div>
  );
}
