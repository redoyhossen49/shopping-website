import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiPackage,
  FiTag,
  FiShoppingBag,
  FiUsers,
  FiBox,
  FiBarChart2,
  FiSettings,
  FiX,
  FiChevronsLeft,
  FiChevronsRight,
  FiShoppingCart,
  FiRefreshCw,
} from "react-icons/fi";
import { cx } from "./ui.jsx";

export const NAV_ITEMS = [
  { name: "Overview", path: "/admin", icon: FiGrid, end: true },
  { name: "Products", path: "/admin/products", icon: FiPackage },
  { name: "Categories", path: "/admin/categories", icon: FiTag },
  { name: "Orders", path: "/admin/orders", icon: FiShoppingBag },
  { name: "Returns", path: "/admin/returns", icon: FiRefreshCw },
  { name: "Customers", path: "/admin/customers", icon: FiUsers },
  { name: "Inventory", path: "/admin/inventory", icon: FiBox },
  { name: "Analytics", path: "/admin/analytics", icon: FiBarChart2 },
  { name: "Settings", path: "/admin/settings", icon: FiSettings },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}) {
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onCloseMobile}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                collapsed ? "justify-center md:justify-center" : "",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <Icon size={19} className="shrink-0" />
            <span className={cx("truncate", collapsed && "md:hidden")}>
              {item.name}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 px-3 py-3">
      <NavLink
        to="/"
        className={cx(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-100/70 hover:bg-white/10 hover:text-white",
          collapsed && "md:justify-center"
        )}
      >
        <FiShoppingCart size={19} className="shrink-0" />
        <span className={cx(collapsed && "md:hidden")}>View store</span>
      </NavLink>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="mt-1 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-100/70 hover:bg-white/10 hover:text-white md:flex"
      >
        {collapsed ? (
          <FiChevronsRight size={19} className="shrink-0" />
        ) : (
          <FiChevronsLeft size={19} className="shrink-0" />
        )}
        <span className={cx(collapsed && "md:hidden")}>Collapse</span>
      </button>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-[#0f1c3f]/50 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#172554] text-white transition-transform duration-200 md:static md:z-0 md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cx(
            "flex items-center gap-3 border-b border-white/10 px-5 py-5",
            collapsed && "md:justify-center md:px-3"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <FiShoppingBag size={19} />
          </span>
          <div className={cx(collapsed && "md:hidden")}>
            <p className="text-base font-extrabold leading-tight">NovaShop</p>
            <p className="text-xs text-blue-100/60">Admin console</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-1.5 text-blue-100/70 hover:bg-white/10 hover:text-white md:hidden"
          >
            <FiX size={18} />
          </button>
        </div>

        {nav}
        {footer}
      </aside>
    </>
  );
}
