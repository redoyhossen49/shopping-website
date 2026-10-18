import { createContext, useContext, useMemo } from "react";

const ADMIN_BASE = "/admin";

const FALLBACK = {
  base: ADMIN_BASE,
  isDemo: false,
  to: (suffix = "") => `${ADMIN_BASE}${suffix}`,
};

const AdminBaseContext = createContext(FALLBACK);

/**
 * Resolves the mount point of the admin console so the same page components can
 * render both under the protected "/admin" console and the public "/demo"
 * sandbox. `to(suffix)` builds a link within whichever prefix is active.
 */
export const useAdminBase = () => useContext(AdminBaseContext);

export function AdminBaseProvider({ base = ADMIN_BASE, isDemo = false, children }) {
  const value = useMemo(
    () => ({ base, isDemo, to: (suffix = "") => `${base}${suffix}` }),
    [base, isDemo]
  );

  return (
    <AdminBaseContext.Provider value={value}>
      {children}
    </AdminBaseContext.Provider>
  );
}
