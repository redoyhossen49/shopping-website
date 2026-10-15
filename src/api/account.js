import { api, buildQuery } from "./client.js";

export const accountApi = {
  getProfile: () => api.get("/account/profile"),
  updateProfile: (body) => api.patch("/account/profile", body),
  changePassword: (body) => api.patch("/account/password", body),

  listAddresses: () => api.get("/account/addresses"),
  createAddress: (body) => api.post("/account/addresses", body),
  updateAddress: (id, body) => api.patch(`/account/addresses/${id}`, body),
  setDefaultAddress: (id) => api.patch(`/account/addresses/${id}/default`),
  deleteAddress: (id) => api.delete(`/account/addresses/${id}`),

  listOrders: (params = {}) => api.get(`/account/orders${buildQuery(params)}`),
  getOrder: (orderNumber) => api.get(`/account/orders/${orderNumber}`),
  cancelOrder: (orderNumber, reason) =>
    api.post(`/account/orders/${orderNumber}/cancel`, { reason }),
  returnOrder: (orderNumber, reason) =>
    api.post(`/account/orders/${orderNumber}/return`, { reason }),

  listReturns: () => api.get("/account/returns"),
};
