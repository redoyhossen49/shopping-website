import { api, buildQuery } from "./client.js";
import { API_BASE } from "../config/app.js";

export const adminApi = {
  getDashboard: () => api.get("/admin/dashboard"),

  getAnalytics: (params = {}) =>
    api.get(`/admin/analytics${buildQuery(params)}`),

  listProducts: (params = {}) =>
    api.get(`/admin/products${buildQuery(params)}`),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (body) => api.post("/admin/products", body),
  updateProduct: (id, body) => api.patch(`/admin/products/${id}`, body),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),

  listCategories: () => api.get("/admin/categories"),
  createCategory: (body) => api.post("/admin/categories", body),
  updateCategory: (id, body) => api.patch(`/admin/categories/${id}`, body),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  listOrders: (params = {}) => api.get(`/admin/orders${buildQuery(params)}`),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) =>
    api.patch(`/admin/orders/${id}/status`, { status }),
  updateOrderPayment: (id, payment_status) =>
    api.patch(`/admin/orders/${id}/payment`, { payment_status }),
  updateOrderTracking: (id, body) =>
    api.patch(`/admin/orders/${id}/tracking`, body),

  listReturns: (params = {}) =>
    api.get(`/admin/returns${buildQuery(params)}`),
  getReturn: (id) => api.get(`/admin/returns/${id}`),
  updateReturn: (id, status, adminNote) =>
    api.patch(`/admin/returns/${id}`, { status, admin_note: adminNote }),

  listCustomers: (params = {}) =>
    api.get(`/admin/customers${buildQuery(params)}`),
  getCustomer: (id) => api.get(`/admin/customers/${id}`),
  updateCustomerStatus: (id, isActive) =>
    api.patch(`/admin/customers/${id}/status`, { is_active: isActive }),

  listInventory: () => api.get("/admin/inventory"),
  adjustStock: (productId, body) =>
    api.patch(`/admin/inventory/${productId}`, body),
  getMovements: (productId) =>
    api.get(`/admin/inventory/${productId}/movements`),

  getSettings: () => api.get("/admin/settings"),
  updateSettings: (body) => api.patch("/admin/settings", body),

  getDemoStatus: () => api.get("/admin/demo/status"),
  resetDemoData: () => api.post("/admin/demo/reset"),
  startDemoSession: () => api.post("/demo/session"),
};

export async function downloadAnalyticsCsv(params = {}) {
  const response = await fetch(
    `${API_BASE}/admin/analytics/export${buildQuery(params)}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Could not export the report.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nova-shop-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
