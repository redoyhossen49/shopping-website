import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import DemoBanner from "../components/DemoBanner.jsx";
import { useAdminAuth } from "./context/AdminAuthContext.jsx";
import { useAdminBase } from "./context/AdminBaseContext.jsx";

// Titles are matched against the path *after* the mount prefix, so the same
// component works under both "/admin" and the public "/demo" sandbox.
const TITLES = [
  { pattern: /^\/?$/, title: "Overview" },
  { pattern: /^\/dashboard$/, title: "Overview" },
  { pattern: /^\/products\/new$/, title: "Add product" },
  { pattern: /^\/products\/[^/]+\/edit$/, title: "Edit product" },
  { pattern: /^\/products/, title: "Products" },
  { pattern: /^\/categories/, title: "Categories" },
  { pattern: /^\/orders/, title: "Orders" },
  { pattern: /^\/returns/, title: "Returns" },
  { pattern: /^\/customers/, title: "Customers" },
  { pattern: /^\/inventory/, title: "Inventory" },
  { pattern: /^\/analytics/, title: "Analytics" },
  { pattern: /^\/settings/, title: "Settings" },
];

function resolveTitle(pathname, base) {
  const sub = pathname.startsWith(base)
    ? pathname.slice(base.length) || "/"
    : pathname;

  return TITLES.find((entry) => entry.pattern.test(sub))?.title || "Admin";
}

export default function AdminLayout() {
  const location = useLocation();
  const { base } = useAdminBase();
  const { isReadOnly } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const title = resolveTitle(location.pathname, base);

  return (
    <div className="flex min-h-screen bg-[#E8EDFA]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        {isReadOnly ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm"
          >
            <FiLock aria-hidden="true" />
            <span>
              Read-only demo — explore every screen, but changes are disabled.
            </span>
          </div>
        ) : (
          <DemoBanner />
        )}
        <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
