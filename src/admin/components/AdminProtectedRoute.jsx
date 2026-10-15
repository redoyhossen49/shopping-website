import { Navigate, useLocation } from "react-router-dom";
import { FiShield } from "react-icons/fi";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";

export default function AdminProtectedRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8EDFA]">
        <div className="flex flex-col items-center gap-3 text-[#172554]">
          <FiShield className="animate-pulse" size={34} />
          <p className="text-sm font-medium text-slate-500">
            Verifying administrator session…
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  return children;
}
