
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiShoppingBag,
  FiCheckCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from || "/";

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e3eafa] px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-[#f8faff] shadow-2xl shadow-[#172554]/10 lg:grid-cols-2">
        {/* Left branding panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#172554] via-[#263968] to-[#334780] p-10 text-white lg:flex xl:p-12">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />

          <Link to="/" className="relative z-10 inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <FiShoppingBag size={23} />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              NovaShop
            </span>
          </Link>

          <div className="relative z-10 my-12">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-indigo-100">
              Welcome back
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight xl:text-5xl">
              Shopping made simple.
              <span className="mt-2 block text-indigo-200">
                Your world, your choices.
              </span>
            </h1>

            <p className="mt-5 max-w-sm text-base leading-7 text-blue-100/80">
              Sign in to continue exploring products and keep your shopping
              experience in one place.
            </p>

            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <FiCheckCircle size={21} />
              </span>
              <div>
                <p className="font-semibold">Your shopping journey</p>
                <p className="mt-1 text-sm text-blue-100/75">
                  Sign in to access your account.
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-blue-100/60">
            © {new Date().getFullYear()} NovaShop. All rights reserved.
          </p>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-12 lg:px-10 xl:px-14">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#172554] transition-colors hover:text-indigo-600 lg:hidden"
            >
              <FiShoppingBag size={21} />
              NovaShop
            </Link>

            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                Your account
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#172554] sm:text-4xl">
                Welcome back!
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Enter your details to sign in to your account.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-semibold text-[#263968]"
                >
                  Email address
                </label>

                <div className="relative">
                  <FiMail
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                    <input
                     type="email"
                     id="login-email"
                     name="email"
                     placeholder="name@example.com"
                     autoComplete="email"
                     required
                     value={form.email}
                     onChange={handleChange}
                     className="w-full rounded-xl border border-[#d7dff2] bg-white py-3.5 pl-11 pr-4 text-sm text-[#172554] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                   />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-semibold text-[#263968]"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 sm:text-sm"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <FiLock
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#d7dff2] bg-white py-3.5 pl-11 pr-12 text-sm text-[#172554] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {showPassword ? (
                      <FiEyeOff size={19} />
                    ) : (
                      <FiEye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && (
                  <FiArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#dfe6f5]" />
              <span className="text-xs font-medium text-slate-400">
                NEW TO NOVASHOP?
              </span>
              <div className="h-px flex-1 bg-[#dfe6f5]" />
            </div>

            <p className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-indigo-600 transition-colors hover:text-indigo-800"
              >
                Create an account
              </Link>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              By continuing, you agree to use your account responsibly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
