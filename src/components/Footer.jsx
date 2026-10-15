
import { FaGithub } from "react-icons/fa6";
import { FiShoppingBag, FiHeart, FiArrowUp } from "react-icons/fi";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-blue-950 text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <Link
            to="/"
            className="group flex items-center gap-2"
            aria-label="NovaShop home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20 transition-transform group-hover:scale-105">
              <FiShoppingBag size={21} />
            </span>

            <span className="text-2xl font-extrabold tracking-tight">
              Nova<span className="text-indigo-400">Shop</span>
            </span>
          </Link>

          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            Your everyday shopping destination. Discover products
            you love with a simple and convenient experience.
          </p>

          {/* Developer credit */}
          <div className="mt-7 flex flex-col items-center gap-3">
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-slate-300">
              Built with
              <FiHeart className="text-indigo-400" />
              by
              <a
                href="https://github.com/hridoy000111"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline decoration-indigo-400 underline-offset-4 transition-colors hover:text-indigo-300"
              >
                Redoy Hossen
              </a>
            </p>

            <a
              href="https://github.com/hridoy000111"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Redoy Hossen on GitHub"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-600 hover:text-white"
            >
              <FaGithub size={22} />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-9 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} NovaShop. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors hover:text-indigo-300"
            >
              Admin dashboard
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors hover:text-indigo-300"
            >
              Back to home
              <FiArrowUp size={14} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
