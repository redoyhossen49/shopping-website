import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAppConfig } from "../api/config.js";

const FALLBACK = {
  demoMode: false,
  storeName: "NovaShop",
  currency: "BDT",
  onlinePaymentsEnabled: false,
};

const AppConfigContext = createContext({
  ...FALLBACK,
  loading: true,
});

export const useAppConfig = () => useContext(AppConfigContext);

/**
 * Fetches public runtime configuration once at startup. Non-critical: if the
 * request fails the storefront keeps working with sensible defaults.
 */
export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getAppConfig()
      .then((response) => {
        if (active && response?.data) {
          setConfig({ ...FALLBACK, ...response.data });
        }
      })
      .catch(() => {
        // Keep defaults when the API is unreachable.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ ...config, loading }), [config, loading]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}
