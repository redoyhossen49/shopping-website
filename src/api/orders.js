import { api, buildQuery } from "./client.js";

export const ordersApi = {
  create: (body) => api.post("/orders", body),
  track: (orderNumber, token = null) =>
    api.get(
      `/orders/track${buildQuery({ order: orderNumber, token: token || undefined })}`
    ),
};
