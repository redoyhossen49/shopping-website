
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiTag,
  FiZap,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      formData.name.trim().length < 2 ||
      formData.password.length < 8
    ) {
      setError(
        "Name must be at least 2 characters and password at least 8 characters."
      );
      return;
    }

    try {
      setLoading(true);

      await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password
      );

      setSuccess("Your account has been created successfully!");
      setFormData({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate left-1/2 -ml-[50vw] w-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900 pt-12">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      {/* Main content */}
      <main className="relative mx-auto  grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-20">
        {/* Registration form */}
        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(30,64,175,0.09)] backdrop-blur-xl sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 shadow-sm">
            <FiUser size={30} />
          </div>

          <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Create Your Account
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500 sm:text-base">
            Join us and enjoy a seamless shopping experience.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
            >
              <p>{success}</p>
              <Link
                to="/login"
                className="mt-2 inline-flex items-center gap-2 font-semibold hover:underline"
              >
                Continue to Login <FiArrowRight />
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8  space-y-5">
            {/* Full name */}
            <div>
              <label
                htmlFor="register-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Full Name
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
                <FiUser className="shrink-0 text-slate-400" size={18} />

                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  minLength={2}
                  maxLength={120}
                  required
                  className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
                <FiMail className="shrink-0 text-slate-400" size={18} />

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={254}
                  required
                  className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
                <FiLock className="shrink-0 text-slate-400" size={18} />

                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={72}
                  required
                  className="h-full w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Use at least 8 characters.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? "Creating Account..." : "Create Account"}
              {!loading && (
                <FiArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 transition hover:text-indigo-700 hover:underline"
            >
              Login
            </Link>
          </p>
        </section>

        {/* Benefits panel */}
        <aside className="px-1 py-2 sm:px-5 lg:px-0">
          {/* Shopping illustration built with Tailwind */}
          <div className="relative mb-8 flex h-56 items-center justify-center overflow-hidden rounded-3xl border border-white/70 bg-white/50 sm:h-64">
            <div className="absolute h-44 w-44 rounded-full bg-blue-100/80 blur-xl" />
            <div className="absolute h-36 w-36 translate-x-16 -translate-y-8 rounded-full bg-indigo-100/70 blur-xl" />

            <div className="relative flex h-36 w-32 -rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-600/30">
              <div className="absolute -top-7 h-12 w-14 rounded-t-full border-[6px] border-b-0 border-blue-500" />
              <span className="text-5xl">🛍️</span>
            </div>

            <div className="absolute bottom-7 left-[14%] flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl border border-white bg-white/90 text-3xl shadow-lg">
              🎁
            </div>

            <div className="absolute right-[14%] top-7 flex h-12 w-12 -rotate-6 items-center justify-center rounded-2xl border border-white bg-white/90 text-2xl shadow-lg">
              ✨
            </div>
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Your Shopping Journey
          </span>

          <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            More Than Just Shopping
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
            Create an account and make every shopping experience
            simpler, faster and more personal.
          </p>

          <div className="mt-7 space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FiTag size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Exclusive Offers
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Discover deals and special promotions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <FiZap size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Faster Checkout
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Enjoy a smoother shopping experience.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <FiShield size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Secure Account
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your account deserves careful protection.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Trust strip */}
      <footer className="relative border-t border-white/80 bg-white/50 px-4 py-7">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs font-medium text-slate-500 sm:text-sm">
          <span className="flex items-center gap-2">
            <FiShield className="text-blue-600" />
            Secure Shopping
          </span>
          <span className="flex items-center gap-2">
            <FiZap className="text-blue-600" />
            Easy Experience
          </span>
          <span className="flex items-center gap-2">
            <FiTag className="text-blue-600" />
            Member Offers
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Register;
