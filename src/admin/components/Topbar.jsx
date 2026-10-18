import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiLogOut, FiChevronDown, FiUser } from "react-icons/fi";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import { Button } from "./ui.jsx";

export default function Topbar({ title, onMenuClick }) {
  const { admin, logout, isReadOnly } = useAdminAuth();
  const { to } = useAdminBase();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (admin?.name || "A")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      // A demo session is anonymous: leave for the storefront, not a login page.
      navigate(isReadOnly ? "/" : to("/login"), { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#D7DFF2] bg-[#F8FAFF]/95 px-4 py-3 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-xl border border-[#CBD5E8] p-2 text-[#263968] hover:bg-indigo-50 md:hidden"
      >
        <FiMenu size={18} />
      </button>

      <h2 className="truncate text-lg font-bold text-[#172554]">{title}</h2>

      <div className="relative ml-auto">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-xl border border-[#CBD5E8] bg-white px-2.5 py-1.5 text-left hover:bg-indigo-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold text-[#172554]">
              {admin?.name || "Administrator"}
            </span>
            <span className="block text-xs text-slate-500">
              {admin?.email}
            </span>
          </span>
          <FiChevronDown size={16} className="text-slate-400" />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-[#D7DFF2] bg-white shadow-xl"
            >
              <div className="flex items-center gap-2 border-b border-[#E3E9F7] px-4 py-3">
                <FiUser className="text-indigo-600" size={16} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#172554]">
                    {admin?.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {admin?.email}
                  </p>
                </div>
              </div>
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-rose-700 hover:bg-rose-50"
                  onClick={handleLogout}
                  loading={loggingOut}
                >
                  <FiLogOut size={16} /> {isReadOnly ? "Exit demo" : "Sign out"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
