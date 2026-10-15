import { api } from "./client.js";

export const paymentsApi = {
  getConfig: () => api.get("/payments/config"),
  initiate: (orderNumber, token = null) =>
    api.post("/payments/initiate", {
      order_number: orderNumber,
      token: token || undefined,
    }),
};
