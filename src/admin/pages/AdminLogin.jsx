import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiShield, FiMail, FiLock, FiArrowLeft, FiEye, FiEyeOff, FiZap } from "react-icons/fi";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAppConfig } from "../../context/AppConfigContext.jsx";
import { adminApi } from "../../api/admin.js";
import { Button, Field, Input } from "../components/ui.jsx";

export default function AdminLogin() {
  const { admin, loading, login, refresh } = useAdminAuth();
  const { demoMode } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  const redirectTo = location.state?.from || "/admin";

  useEffect(() => {
    if (!loading && admin) {
      navigate(redirectTo, { replace: true });
    }
  }, [admin, loading, navigate, redirectTo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your admin email and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.status === 429
          ? err.message
          : err.message || "Sign in failed. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Starts a scoped demo-admin session server-side. No password ever reaches
  // the browser, and every query is limited to demo data.
  const startDemo = async () => {
    setError("");
    setDemoSubmitting(true);

    try {
      await adminApi.startDemoSession();
      await refresh();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "The demo dashboard is unavailable right now.");
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8EDFA] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#D7DFF2] bg-[#F8FAFF] p-6 shadow-xl sm:p-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          <FiArrowLeft />
          Back to store
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#172554] text-white">
            <FiShield size={30} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#172554]">
            Admin access
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your owner account, or explore the live demo.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Owner sign in
          </p>

          <Field label="Admin email" htmlFor="admin-email" required>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="pl-10"
                required
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="admin-password" required>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter admin password"
                className="pl-10 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </Field>

          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>

        {demoMode && (
          <div className="mt-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              Recruiter demo
            </p>
            <p className="mt-1 text-xs leading-5 text-indigo-900">
              Step into a pre-loaded sandbox with sample orders, products and
              customers. Read/write, and isolated from any real store data.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              loading={demoSubmitting}
              onClick={startDemo}
            >
              <FiZap size={15} />
              Explore demo dashboard
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Provision the first admin with{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
            npm run admin:create
          </code>
        </p>
      </div>
    </div>
  );
}
