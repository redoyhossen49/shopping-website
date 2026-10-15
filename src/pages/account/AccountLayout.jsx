import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiPackage,
  FiMapPin,
  FiRefreshCw,
  FiGrid,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../admin/components/Toast.jsx";

const NAV = [
  { to: "/account", label: "Overview", icon: FiGrid, end: true },
  { to: "/account/orders", label: "My Orders", icon: FiPackage },
  { to: "/account/returns", label: "Returns", icon: FiRefreshCw },
  { to: "/account/addresses", label: "Addresses", icon: FiMapPin },
  { to: "/account/profile", label: "Profile", icon: FiUser },
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast?.info("You have been signed out");
    navigate("/");
  };

  const initials = (user?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
        : "text-[#263968] hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white">
                {initials || <FiUser />}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-[#172554]">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <FiLogOut size={18} />
              Sign out
            </button>
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
