
import { useContext } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CiUser,
  CiLogin,
  CiShoppingCart,
  CiMenuBurger,
} from "react-icons/ci";
import {
  FiShoppingBag,
  FiX,
  FiShield,
  FiLogOut,
  FiPackage,
} from "react-icons/fi";
import { menuContext } from "./Context/menuContext";
import { useCart } from "./Context/CartContext";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../admin/components/Toast.jsx";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Products", to: "/products" },
  { label: "Contact", to: "/contact" },
  { label: "Track Order", to: "/track-order" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { menuOpen, setMenuOpen } = useContext(menuContext);
  const { cartItems } = useCart();
  const { user, logout } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast?.info("You have been signed out");
    setMenuOpen(false);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const totalCartItems = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 1),
    0
  );

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = ({ isActive: active }) =>
    `relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
      active
        ? "text-indigo-600"
        : "text-slate-600 hover:text-indigo-600"
    }`;

  const accountLinkClass = (path) =>
    `inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          isActive(path)
        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  const renderNavLinks = (mobile = false) =>
    navLinks.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/"}
        onClick={mobile ? closeMenu : undefined}
        className={({ isActive: active }) =>
          `${navLinkClass({ isActive: active })} ${
            mobile ? "block w-full px-4 py-3" : ""
          }`
        }
      >
        {item.label}
        {isActive(item.to) && (
          <span className="absolute inset-x-3 -bottom-0.5 hidden h-0.5 rounded-full bg-indigo-600 lg:block" />
        )}
      </NavLink>
    ));

  return (
<header className="sticky top-0 z-50 w-full border-b border-indigo-100/80 bg-slate-700/10 shadow-sm shadow-indigo-950/[0.03] backdrop-blur-xl">
      <nav
        className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link
          to="/"
          onClick={closeMenu}
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="NovaShop home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-transform duration-200 group-hover:scale-105">
            <FiShoppingBag size={23} />
          </span>

          <span className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-blue-950 sm:text-2xl">
              Nova<span className="text-indigo-600">Shop</span>
            </span>
            <span className="hidden text-[11px] font-medium tracking-wide text-slate-500 sm:block">
              Shop Smarter, Live Better
            </span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {renderNavLinks()}
        </div>

        {/* Desktop account actions */}
        <div className="hidden items-center gap-2 xl:flex">
          {user ? (
            <>
              <Link to="/account" className={accountLinkClass("/account")}>
                <CiUser size={20} />
                {user.name?.split(" ")[0] || "My Account"}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className={accountLinkClass("/logout")}
              >
                <FiLogOut size={18} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={accountLinkClass("/login")}>
                <CiLogin size={20} />
                Login
              </Link>

              <Link to="/register" className={accountLinkClass("/register")}>
                <CiUser size={20} />
                Register
              </Link>
            </>
          )}

          <Link
            to="/cart"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isActive("/cart")
                ? "bg-indigo-700 text-white"
                : "bg-blue-950 text-white shadow-sm hover:bg-blue-900"
            }`}
          >
            <CiShoppingCart size={21} />
            Cart
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
              {totalCartItems}
            </span>
          </Link>

          <Link
            to="/admin/login"
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isActive("/admin/login")
                ? "border-blue-950 bg-blue-950 text-white"
                : "border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white"
            }`}
          >
            <FiShield size={17} />
            Admin Login
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-950 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FiX size={23} /> : <CiMenuBurger size={25} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-slate-100 bg-white transition-[max-height,opacity] duration-300 lg:hidden ${
          menuOpen
            ? "max-h-[600px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="mx-auto max-w-[1440px] space-y-2 px-4 py-4 sm:px-6">
          <div className="space-y-1">{renderNavLinks(true)}</div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            {user ? (
              <>
                <Link
                  to="/account"
                  onClick={closeMenu}
                  className={accountLinkClass("/account")}
                >
                  <CiUser size={20} />
                  My Account
                </Link>

                <Link
                  to="/account/orders"
                  onClick={closeMenu}
                  className={accountLinkClass("/account/orders")}
                >
                  <FiPackage size={18} />
                  My Orders
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <FiLogOut size={18} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={accountLinkClass("/login")}
                >
                  <CiLogin size={20} />
                  Login
                </Link>

                <Link
                  to="/register"
                  onClick={closeMenu}
                  className={accountLinkClass("/register")}
                >
                  <CiUser size={20} />
                  Register
                </Link>
              </>
            )}

            <Link
              to="/cart"
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
            >
              <CiShoppingCart size={21} />
              Cart ({totalCartItems})
            </Link>

            <Link
              to="/admin/login"
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-950 px-3 py-3 text-sm font-semibold text-blue-950 transition-colors hover:bg-blue-950 hover:text-white"
            >
              <FiShield size={17} />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
