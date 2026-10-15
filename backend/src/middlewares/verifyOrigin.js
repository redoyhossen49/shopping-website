import { isClientOriginAllowed } from "../config/env.js";
import { forbidden } from "../utils/ApiError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Browser POSTs that originate from the payment gateway carry the gateway's
// Origin. These callbacks are authenticated by server-side verification of the
// transaction, not by CSRF tokens.
const ORIGIN_EXEMPT_PREFIXES = ["/api/payments/sslcommerz/"];

/**
 * Defense-in-depth CSRF protection.
 * The auth cookie is SameSite, but mutating requests must also originate
 * from the configured client origin (when an Origin header is present).
 */
export function verifyOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (ORIGIN_EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const origin = req.get("origin");

  if (!origin) {
    // Same-origin requests (or non-browser clients) do not send Origin.
    return next();
  }

  if (!isClientOriginAllowed(origin)) {
    return next(forbidden("Request origin is not allowed"));
  }

  return next();
}
