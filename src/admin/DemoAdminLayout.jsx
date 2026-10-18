import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiZap, FiAlertTriangle, FiArrowLeft, FiLock } from "react-icons/fi";
import { useAppConfig } from "../context/AppConfigContext.jsx";
import { useAdminAuth } from "./context/AdminAuthContext.jsx";
import { AdminBaseProvider } from "./context/AdminBaseContext.jsx";
import { adminApi } from "../api/admin.js";
import AdminLayout from "./AdminLayout.jsx";

function GateMessage({ icon, title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8EDFA] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#D7DFF2] bg-white p-8 text-center shadow-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-[#172554]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {children}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <FiArrowLeft /> Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Public, credential-free entry point to the admin console. Boots a scoped,
 * read-only demo session (when DEMO_MODE is enabled server-side) and then
 * renders the real dashboard components under the "/demo" base path.
 */
export default function DemoAdminLayout() {
  const { demoMode, loading: configLoading } = useAppConfig();
  const { admin, loading: authLoading, refresh } = useAdminAuth();
  const [state, setState] = useState("booting");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (configLoading || authLoading) return;

    if (!demoMode) {
      setState("disabled");
      return;
    }

    // Already inside a scoped demo session (survives a page refresh).
    if (admin?.is_demo) {
      setState("ready");
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        await adminApi.startDemoSession();
        await refresh();
        setState("ready");
      } catch (err) {
        startedRef.current = false;
        setError(err?.message || "The demo dashboard is unavailable right now.");
        setState("error");
      }
    })();
  }, [demoMode, configLoading, authLoading, admin, refresh]);

  if (state === "booting") {
    return (
      <GateMessage
        icon={<FiZap className="animate-pulse" size={26} />}
        title="Starting the live demo"
        description="Signing you in to a read-only sandbox with sample data…"
      />
    );
  }

  if (state === "disabled") {
    return (
      <GateMessage
        icon={<FiLock size={26} />}
        title="Demo is not available"
        description="The live demo is not enabled on this server. Please sign in with an administrator account instead."
      />
    );
  }

  if (state === "error") {
    return (
      <GateMessage
        icon={<FiAlertTriangle size={26} />}
        title="Could not start the demo"
        description={error}
      />
    );
  }

  return (
    <AdminBaseProvider base="/demo" isDemo>
      <AdminLayout />
    </AdminBaseProvider>
  );
}
