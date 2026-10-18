
import { useContext } from "react";
import { Link } from "react-router-dom";
import { FiZap } from "react-icons/fi";
import { menuContext } from "../components/Context/menuContext";
import { useAppConfig } from "../context/AppConfigContext.jsx";
import Hero from "../components/Hero";
import Products from "./Products";

const Home = () => {
  const { menuOpen } = useContext(menuContext);
  const { demoMode } = useAppConfig();

  return (
    <div
      className={`min-h-screen w-full text-blue-950 transition-all duration-300 ease-in-out ${
        menuOpen ? "translate-y-40" : "translate-y-0"
      }`}
    >
      {/* Hero Section */}
      <section className="relative w-full">
        <Hero />
      </section>

      {/* Products Section */}
      {/* Products Section */}
<section
  id="products-section"
  className="relative w-full scroll-mt-24 bg-gradient-to-b from-[#e8edfa] via-[#e3e9f7] to-[#edf0fa] py-10 sm:py-14 lg:py-16"
>
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <Products />
        </div>
      </section>

      {/* Recruiter demo entry point (only visible in demo mode) */}
      {demoMode && (
        <section className="w-full bg-blue-950 py-10 text-white">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              <FiZap size={14} />
              Live demo
            </span>
            <h3 className="text-xl font-extrabold sm:text-2xl">
              This storefront runs on a sandbox dataset
            </h3>
            <p className="max-w-xl text-sm leading-6 text-slate-300">
              Want to see the operations side? Open the admin dashboard with a
              pre-loaded dataset of orders, customers, returns and inventory —
              no credentials needed. Read-only, and isolated from real data.
            </p>
            <Link
              to="/demo/dashboard"
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              <FiZap size={16} />
              Explore Admin Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
