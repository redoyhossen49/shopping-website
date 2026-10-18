
import { Link } from "react-router-dom";
import { Typewriter } from "react-simple-typewriter";
import {
  FiArrowRight,
  FiShoppingBag,
  FiTruck,
  FiShield,
  FiHeadphones,
  FiHeart,
  FiPackage,
  FiMonitor,
} from "react-icons/fi";
import { useAppConfig } from "../context/AppConfigContext.jsx";

const Hero = () => {
  const { demoMode } = useAppConfig();

  return (
    <section className="relative isolate mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-white to-indigo-50" />

      <div className="absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="absolute -bottom-20 left-1/3 -z-10 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />

      <div className="grid min-h-[440px] items-center gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-2 lg:px-14 lg:py-16">
        {/* Left content */}
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
            Welcome to NovaShop
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Discover Amazing
            <span className="mt-2 block text-indigo-600">
              Products for You
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">
            <Typewriter
              words={[
                "Find products you'll love.",
                "Explore your everyday essentials.",
                "Discover something new today.",
              ]}
              loop
              cursor
              cursorStyle="|"
              typeSpeed={45}
              deleteSpeed={25}
              delaySpeed={1800}
            />
            <span className="mt-2 block">
              Enjoy a simple and convenient shopping experience with NovaShop.
            </span>
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/products"
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Shop Now
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-blue-950 transition duration-300 hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <FiShoppingBag />
              Explore Products
            </Link>

            {demoMode && (
              <Link
                to="/demo/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-7 py-3.5 font-semibold text-indigo-700 transition duration-300 hover:border-indigo-600 hover:bg-indigo-100"
              >
                <FiMonitor />
                Explore Admin Dashboard
              </Link>
            )}
          </div>

          {/* Highlights */}
          <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-4 text-sm text-slate-600 lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <FiTruck className="text-indigo-600" />
              Easy Shopping
            </span>

            <span className="inline-flex items-center gap-2">
              <FiShield className="text-blue-900" />
              Secure Experience
            </span>
          </div>
        </div>

        {/* Right illustration */}
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center py-5 sm:py-8">
          <div className="absolute h-64 w-64 rounded-full bg-indigo-100 sm:h-80 sm:w-80" />

          <div className="relative flex h-64 w-full max-w-sm items-center justify-center sm:h-80">
            {/* Decorative shapes */}
            <div className="absolute left-4 top-8 h-12 w-12 rounded-2xl bg-blue-950 shadow-lg shadow-blue-950/20 sm:left-8 sm:h-16 sm:w-16" />

            <div className="absolute right-5 top-12 h-10 w-10 rounded-full border-8 border-indigo-500 sm:right-8 sm:h-14 sm:w-14" />

            <div className="absolute bottom-8 left-8 h-8 w-8 rotate-12 rounded-xl bg-indigo-500 sm:left-12 sm:h-10 sm:w-10" />

            {/* Shopping bag */}
            <div className="relative flex h-44 w-40 -rotate-6 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-2xl shadow-indigo-700/25 sm:h-52 sm:w-48">
              <div className="absolute -top-8 h-12 w-20 rounded-t-3xl border-[7px] border-b-0 border-indigo-600 sm:h-14 sm:w-24" />

              <FiShoppingBag className="h-20 w-20 text-white sm:h-24 sm:w-24" />

              <span className="mt-3 text-lg font-extrabold tracking-wide text-white">
                NovaShop
              </span>
            </div>

            {/* Floating product card */}
            <div className="absolute -right-1 top-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:-right-3 sm:top-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <FiPackage className="h-6 w-6 text-indigo-700" />
              </div>

              <p className="mt-2 text-xs font-bold text-slate-800">
                Find your pick
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Explore products
              </p>
            </div>

            {/* Floating favorite card */}
            <div className="absolute -bottom-1 left-0 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:-left-3 sm:bottom-1 sm:p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <FiHeart className="h-5 w-5 text-indigo-600" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Your favorites
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  All in one place
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom benefit strip */}
      <div className="grid grid-cols-2 border-t border-slate-200 bg-white/80 sm:grid-cols-4">
        <div className="flex items-center justify-center gap-3 border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
          <FiTruck className="h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Convenient</p>
            <p className="text-xs text-slate-500">Shopping</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
          <FiShield className="h-5 w-5 shrink-0 text-blue-900" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Secure</p>
            <p className="text-xs text-slate-500">Experience</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-r border-slate-100 p-4">
          <FiHeadphones className="h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Customer</p>
            <p className="text-xs text-slate-500">Support</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          <FiHeart className="h-5 w-5 shrink-0 text-blue-900" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Made for</p>
            <p className="text-xs text-slate-500">Your needs</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
