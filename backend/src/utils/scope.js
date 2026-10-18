/**
 * Data scoping.
 *
 * NovaShop can host a read-only demo sandbox alongside a real store on the
 * same database. Demo rows are flagged is_demo = TRUE. Every read and write
 * must stay inside one scope so a recruiter exploring the demo can never see or
 * mutate real data, and the store owner never sees demo data.
 *
 * The rule is deliberately simple and server-owned:
 *   - Admin requests use the scope on the authenticated admin's own row.
 *   - The public storefront always serves the real store.
 *   - A shopper who is signed in to a demo account writes demo data; everyone
 *     else (including guests) writes to the real store.
 * A client can never choose its own scope, and the DEMO_MODE flag only gates
 * the read-only demo sandbox — it never hides the real catalogue.
 */

/** Scope for an authenticated admin, taken from their database row. */
export function adminScope(req) {
  return Boolean(req.admin?.is_demo);
}

/**
 * The public storefront always shows the store's real catalogue. The demo
 * sandbox is a separate, authenticated scope (see adminScope) and is never
 * mixed into the public storefront.
 */
export function publicScope() {
  return false;
}

/**
 * Scope for a write initiated by a shopper (checkout, return request).
 * A signed-in demo account writes demo data; guests and real customers write
 * to the real store.
 */
export function shopperScope(req) {
  return Boolean(req.user?.isDemo);
}
