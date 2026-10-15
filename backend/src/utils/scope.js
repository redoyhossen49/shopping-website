import { env } from "../config/env.js";

/**
 * Data scoping.
 *
 * NovaShop can run a public demo on the same database as a real store. Demo
 * rows are flagged is_demo = TRUE. Every read and write must stay inside one
 * scope so a recruiter exploring the demo can never see or mutate real data,
 * and the store owner never sees demo data.
 *
 * The rule is deliberately simple and server-owned:
 *   - Admin requests use the scope on the authenticated admin's own row.
 *   - Public (storefront) requests use the deployment configuration.
 * A client can never choose its own scope.
 */

/** Scope for an authenticated admin, taken from their database row. */
export function adminScope(req) {
  return Boolean(req.admin?.is_demo);
}

/** The public storefront always follows the deployment's demo configuration. */
export function publicScope() {
  return env.demoMode;
}

/**
 * Scope for a write initiated by a shopper (checkout, return request).
 * A signed-in demo account writes demo data; guests follow deployment config.
 */
export function shopperScope(req) {
  if (req.user && typeof req.user.isDemo === "boolean") {
    return req.user.isDemo;
  }

  return env.demoMode;
}
