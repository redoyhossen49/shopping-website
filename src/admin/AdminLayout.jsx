import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import DemoBanner from "../components/DemoBanner.jsx";

const TITLES = [
  { pattern: /^\/admin$/, title: "Overview" },
  { pattern: /^\/admin\/products\/new$/, title: "Add product" },
  { pattern: /^\/admin\/products\/[^/]+\/edit$/, title: "Edit product" },
  { pattern: /^\/admin\/products/, title: "Products" },
  { pattern: /^\/admin\/categories/, title: "Categories" },
  { pattern: /^\/admin\/orders/, title: "Orders" },
  { pattern: /^\/admin\/customers/, title: "Customers" },
  { pattern: /^\/admin\/inventory/, title: "Inventory" },
  { pattern: /^\/admin\/analytics/, title: "Analytics" },
  { pattern: /^\/admin\/settings/, title: "Settings" },
];

function resolveTitle(pathname) {
  return TITLES.find((entry) => entry.pattern.test(pathname))?.title || "Admin";
}

export default function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const title = resolveTitle(location.pathname);

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
        <DemoBanner />
        <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
