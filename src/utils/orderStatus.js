// Shared order + payment presentation helpers for the storefront.

export const ORDER_STATUS_META = {
  pending: { label: "Pending", tone: "amber", description: "We have received your order." },
  processing: { label: "Processing", tone: "indigo", description: "Your order is being prepared." },
  shipped: { label: "Shipped", tone: "sky", description: "Your order is on the way." },
  delivered: { label: "Delivered", tone: "emerald", description: "Your order has been delivered." },
  cancelled: { label: "Cancelled", tone: "rose", description: "This order was cancelled." },
  return_requested: { label: "Return requested", tone: "orange", description: "A return is being reviewed." },
  returned: { label: "Returned", tone: "slate", description: "This order was returned." },
};

export const PAYMENT_STATUS_META = {
  unpaid: { label: "Unpaid", tone: "amber" },
  paid: { label: "Paid", tone: "emerald" },
  refunded: { label: "Refunded", tone: "sky" },
  failed: { label: "Failed", tone: "rose" },
};

export const PAYMENT_METHOD_LABELS = {
  cod: "Cash on Delivery",
  sslcommerz: "Online payment",
};

export const PAYMENT_CHANNEL_LABELS = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
};

export const RETURN_TYPE_LABELS = {
  cancellation: "Cancellation",
  return: "Return",
};

export const RETURN_STATUS_META = {
  requested: { label: "Requested", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  completed: { label: "Completed", tone: "slate" },
};

export function paymentMethodLabel(order) {
  if (order?.payment_method === "sslcommerz") {
    const channel = PAYMENT_CHANNEL_LABELS[order.payment_channel];
    return channel ? `Online · ${channel}` : "Online payment";
  }

  return PAYMENT_METHOD_LABELS[order?.payment_method] || "Cash on Delivery";
}

export function canCancelOrder(order) {
  return ["pending", "processing"].includes(order?.status);
}

export function canReturnOrder(order) {
  return order?.status === "delivered";
}

export function hasOpenRequest(order) {
  return (order?.returns || []).some((request) =>
    ["requested", "approved"].includes(request.status)
  );
}
