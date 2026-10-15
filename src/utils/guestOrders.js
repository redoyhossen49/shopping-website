// Guest orders are only accessible with a high-entropy tracking token that is
// returned once at checkout. We keep it locally so guests can revisit their
// order confirmation and tracking pages.

const KEY = "novashop_guest_orders";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveGuestOrder(orderNumber, token) {
  if (!orderNumber || !token) return;

  try {
    const store = readStore();
    store[orderNumber] = token;
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function getGuestToken(orderNumber) {
  if (!orderNumber) return null;
  return readStore()[orderNumber] || null;
}
