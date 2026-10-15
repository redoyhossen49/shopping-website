import { api, buildQuery } from "./client.js";

export const listProducts = (params = {}) =>
  api.get(`/products${buildQuery(params)}`);

export const getProduct = (id) => api.get(`/products/${id}`);
