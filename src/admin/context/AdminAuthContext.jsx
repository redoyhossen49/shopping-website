import { createContext, useCallback, useContext } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => useContext(AdminAuthContext);

// The admin session is the same server session as the customer session, so we
// derive it from the shared AuthContext instead of issuing a second /auth/me
// request on every page load.
export function AdminAuthProvider({ children }) {
  const { user, loading, login: authLogin, logout: authLogout, refresh } =
    useAuth();

  const admin = user && user.role === "admin" ? user : null;

  // Demo sessions are issued by the server as a read-only window into the
  // dashboard. The flag rides on the same user object returned by /auth/me.
  const isReadOnly = Boolean(admin?.is_demo);

  const login = useCallback(
    async (email, password) => {
      const data = await authLogin(email, password);

      if (!data || data.role !== "admin") {
        // A customer session must never grant admin access.
        await authLogout().catch(() => {});
        throw new Error("This account does not have administrator access.");
      }

      return data;
    },
    [authLogin, authLogout]
  );

  const logout = useCallback(() => authLogout(), [authLogout]);

  return (
    <AdminAuthContext.Provider
      value={{ admin, isReadOnly, loading, login, logout, refresh }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
