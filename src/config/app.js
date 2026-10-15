// Same-origin by default: in development Vite proxies /api to the backend, and
// in production the API is expected to be served from the same origin (or
// behind a reverse proxy). Only set VITE_API_URL when the API lives on a
// different origin, e.g. https://api.example.com/api.
export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  ""
);

export const STORE_CURRENCY = import.meta.env.VITE_CURRENCY || "BDT";

export const SHIPPING_FEE = 30;

export const LOW_STOCK_THRESHOLD = 5;
