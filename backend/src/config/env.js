import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function readRequired(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Copy backend/.env.example to backend/.env and set it."
    );
  }

  return value.trim();
}

function readNumber(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsed;
}

function readBoolean(name, fallback = false) {
  const raw = process.env[name];

  if (raw === undefined || raw === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}


const clientOrigin = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLoopbackOrigin(origin) {
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Single source of truth for accepted browser origins, shared by the CORS
 * middleware and the CSRF check so they can never drift apart.
 *
 * - Requests without an Origin (same-origin, curl, server-to-server) pass.
 * - Explicit origins from CLIENT_ORIGIN always pass.
 * - Development additionally accepts any loopback (localhost / 127.0.0.1)
 *   port, so Vite may bind 5173, 5174, 4173, ... without reconfiguring env.
 * - Production never falls back to a wildcard or a port-agnostic rule.
 */
export function isClientOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (clientOrigin.includes(origin)) {
    return true;
  }

  return !isProduction && isLoopbackOrigin(origin);
}


export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: readNumber("PORT", 5000),
  clientOrigin,

  jwtSecret: readRequired("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  cookieName: process.env.COOKIE_NAME || "novashop_token",

  currency: (process.env.CURRENCY || "BDT").toUpperCase(),
  defaultLowStockThreshold: readNumber("DEFAULT_LOW_STOCK_THRESHOLD", 5),
  defaultShippingFee: readNumber("DEFAULT_SHIPPING_FEE", 0),
  bcryptRounds: readNumber("BCRYPT_ROUNDS", 12),

  // Where the gateway sends the shopper back to after a payment attempt.
  frontendUrl: (
  process.env.FRONTEND_URL ||
  (Array.isArray(clientOrigin) ? clientOrigin[0] : clientOrigin)
).replace(/\/$/, ""),
  // Public base URL of this API, used to build gateway callback URLs.
  apiPublicUrl: (
    process.env.API_PUBLIC_URL ||
    `http://localhost:${readNumber("PORT", 5000)}`
  ).replace(/\/$/, ""),

  // How long after delivery a customer may request a return.
  returnWindowDays: readNumber("RETURN_WINDOW_DAYS", 14),

  // Demo / sandbox mode. When true:
  //   - every row created through the API is tagged is_demo = TRUE,
  //   - the "reset demo data" endpoint is enabled,
  //   - the public /api/config endpoint advertises demo mode to the UI.
  // Intended ONLY for a public portfolio demo backed by synthetic data. Never
  // enable this against a store that holds real customer data.
  demoMode: readBoolean("DEMO_MODE", false),
  demo: {
    adminName: process.env.DEMO_ADMIN_NAME?.trim() || "Demo Store Manager",
    adminEmail: (
      process.env.DEMO_ADMIN_EMAIL?.trim() || "demo.admin@novashop.dev"
    ).toLowerCase(),
    adminPassword:
      process.env.DEMO_ADMIN_PASSWORD?.trim() || "DemoAdmin123!",
    customerPassword:
      process.env.DEMO_CUSTOMER_PASSWORD?.trim() || "DemoCustomer123!",
  },

  // SSLCOMMERZ (bKash / Nagad / cards). Optional: online payments are simply
  // disabled until real merchant credentials are configured.
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID?.trim() || "",
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD?.trim() || "",
    sandbox: readBoolean("SSLCOMMERZ_SANDBOX", true),
  },
};

env.sslcommerz.enabled = Boolean(
  env.sslcommerz.storeId && env.sslcommerz.storePassword
);
