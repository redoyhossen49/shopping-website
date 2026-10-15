import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import { pool } from "../src/config/db.js";

const stamp = Date.now();
const ADMIN = {
  name: "Test Owner",
  email: `test-admin-${stamp}@test.local`,
  password: "AdminPass123!",
};
const CUSTOMER = {
  name: "Test Customer",
  email: `test-customer-${stamp}@test.local`,
  password: "Customer123!",
};

let server;
let base;
let adminId;

const created = { products: [], orders: [], categories: [], users: [] };

function client() {
  let cookie = "";
  return {
    getCookie: () => cookie,
    async request(path, { method = "GET", body, headers = {} } = {}) {
      const finalHeaders = { ...headers };
      if (body) finalHeaders["Content-Type"] = "application/json";
      if (cookie) finalHeaders.Cookie = cookie;

      const res = await fetch(base + path, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }

      return { status: res.status, body: json, headers: res.headers };
    },
  };
}

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  const hash = await bcrypt.hash(ADMIN.password, 4);
  const result = await pool.query(
    `INSERT INTO public.users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE)
     RETURNING id`,
    [ADMIN.name, ADMIN.email, hash]
  );
  adminId = result.rows[0].id;
});

after(async () => {
  await pool.query("DELETE FROM public.order_status_history WHERE order_id = ANY($1)", [
    created.orders,
  ]);
  await pool.query("DELETE FROM public.order_items WHERE order_id = ANY($1)", [
    created.orders,
  ]);
  await pool.query("DELETE FROM public.orders WHERE id = ANY($1)", [created.orders]);
  await pool.query("DELETE FROM public.inventory_movements WHERE product_id = ANY($1)", [
    created.products,
  ]);
  await pool.query("DELETE FROM public.products WHERE id = ANY($1)", [created.products]);
  await pool.query("DELETE FROM public.categories WHERE id = ANY($1)", [created.categories]);
  await pool.query("DELETE FROM public.users WHERE id = $1 OR email = $2", [
    adminId,
    CUSTOMER.email,
  ]);

  server.close();
  await pool.end();
});

test("health endpoint responds", async () => {
  const api = client();
  const res = await api.request("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("public product list works", async () => {
  const api = client();
  const res = await api.request("/api/products");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("customer registration works and role cannot be escalated", async () => {
  const api = client();
  const res = await api.request("/api/auth/register", {
    method: "POST",
    body: { ...CUSTOMER, role: "admin" },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.role, "customer");

  const other = client();
  const dup = await other.request("/api/auth/register", {
    method: "POST",
    body: CUSTOMER,
  });
  assert.equal(dup.status, 409);
});

test("invalid registration input is rejected", async () => {
  const api = client();
  const res = await api.request("/api/auth/register", {
    method: "POST",
    body: { name: "x", email: "not-an-email", password: "short" },
  });
  assert.equal(res.status, 400);
});

test("customer login works and invalid credentials are rejected", async () => {
  const api = client();
  const bad = await api.request("/api/auth/login", {
    method: "POST",
    body: { email: CUSTOMER.email, password: "wrong-password" },
  });
  assert.equal(bad.status, 401);

  const ok = await api.request("/api/auth/login", {
    method: "POST",
    body: { email: CUSTOMER.email, password: CUSTOMER.password },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.role, "customer");

  const me = await api.request("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, CUSTOMER.email);
});

test("unauthenticated users cannot call admin APIs", async () => {
  const api = client();
  const res = await api.request("/api/admin/dashboard");
  assert.equal(res.status, 401);
});

test("customers cannot call admin APIs", async () => {
  const api = client();
  await api.request("/api/auth/login", {
    method: "POST",
    body: { email: CUSTOMER.email, password: CUSTOMER.password },
  });

  const res = await api.request("/api/admin/products");
  assert.equal(res.status, 403);
});

test("admin login works and dashboard returns real totals", async () => {
  const api = client();
  const login = await api.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.role, "admin");

  const dash = await api.request("/api/admin/dashboard");
  assert.equal(dash.status, 200);
  assert.ok(dash.body.data.totals);
  assert.equal(typeof dash.body.data.totals.totalProducts, "number");
  assert.equal(typeof dash.body.data.totals.paidRevenue, "number");
});

test("admin product create validates input", async () => {
  const api = client();
  await api.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  const invalid = await api.request("/api/admin/products", {
    method: "POST",
    body: { title: "", price: -5, stock: -1 },
  });
  assert.equal(invalid.status, 400);
});

test("admin product CRUD lifecycle", async () => {
  const api = client();
  await api.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  const response = await api.request("/api/admin/products", {
    method: "POST",
    body: {
      title: `Test Product ${stamp}`,
      description: "Created by automated test",
      price: 199.99,
      stock: 5,
      category: "Test Category",
    },
  });

  assert.equal(response.status, 201);
  const productId = response.body.data.id;
  created.products.push(productId);
  assert.equal(Number(response.body.data.stock), 5);

  const fetched = await api.request(`/api/admin/products/${productId}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.title, `Test Product ${stamp}`);

  const patched = await api.request(`/api/admin/products/${productId}`, {
    method: "PATCH",
    body: { price: 249.5, stock: 9 },
  });
  assert.equal(patched.status, 200);
  assert.equal(Number(patched.body.data.price), 249.5);
  assert.equal(Number(patched.body.data.stock), 9);

  const list = await api.request(
    `/api/admin/products?search=${encodeURIComponent(`Test Product ${stamp}`)}`
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
});

test("admin categories CRUD and safe deletion", async () => {
  const api = client();
  await api.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  const name = `Cat ${stamp}`;
  const categoryResponse = await api.request("/api/admin/categories", {
    method: "POST",
    body: { name, description: "test" },
  });
  assert.equal(categoryResponse.status, 201);
  const categoryId = categoryResponse.body.data.id;
  created.categories.push(categoryId);

  const dup = await api.request("/api/admin/categories", {
    method: "POST",
    body: { name },
  });
  assert.equal(dup.status, 409);

  // Attach a product then confirm the category cannot be deleted.
  const product = await api.request("/api/admin/products", {
    method: "POST",
    body: {
      title: `Cat Product ${stamp}`,
      price: 10,
      stock: 1,
      category_id: categoryId,
    },
  });
  assert.equal(product.status, 201);
  created.products.push(product.body.data.id);

  const blocked = await api.request(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  });
  assert.equal(blocked.status, 409);
});

test("checkout creates a real order and decrements stock", async () => {
  const admin = client();
  await admin.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  const product = await admin.request("/api/admin/products", {
    method: "POST",
    body: {
      title: `Order Product ${stamp}`,
      price: 100,
      stock: 5,
      category: "Order Test",
    },
  });
  const productId = product.body.data.id;
  created.products.push(productId);

  const shop = client();
  const order = await shop.request("/api/orders", {
    method: "POST",
    body: {
      customer_name: "Buyer Person",
      customer_email: `buyer-${stamp}@test.local`,
      customer_phone: "01700000000",
      shipping_address: "12 Test Street",
      shipping_city: "Dhaka",
      shipping_country: "Bangladesh",
      shipping_postal_code: "1207",
      items: [{ productId, quantity: 2 }],
    },
  });

  assert.equal(order.status, 201);
  const orderId = order.body.data.id;
  created.orders.push(orderId);

  assert.equal(Number(order.body.data.subtotal), 200);
  assert.equal(order.body.data.items.length, 1);
  assert.equal(order.body.data.payment_status, "unpaid");
  assert.equal(order.body.data.status, "pending");

  const afterStock = await admin.request(`/api/admin/products/${productId}`);
  assert.equal(Number(afterStock.body.data.stock), 3);

  const tooMany = await shop.request("/api/orders", {
    method: "POST",
    body: {
      customer_name: "Buyer Person",
      customer_email: `buyer2-${stamp}@test.local`,
      customer_phone: "01700000000",
      shipping_address: "12 Test Street",
      shipping_city: "Dhaka",
      shipping_country: "Bangladesh",
      shipping_postal_code: "1207",
      items: [{ productId, quantity: 99 }],
    },
  });
  assert.equal(tooMany.status, 409);

  // Order status workflow
  const invalid = await admin.request(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status: "delivered" },
  });
  assert.equal(invalid.status, 400);

  const processing = await admin.request(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status: "processing" },
  });
  assert.equal(processing.status, 200);

  const cancelled = await admin.request(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
  assert.equal(cancelled.status, 200);

  // Cancelling restocks the items.
  const restocked = await admin.request(`/api/admin/products/${productId}`);
  assert.equal(Number(restocked.body.data.stock), 5);
});

test("mutating requests from a foreign origin are rejected", async () => {
  const api = client();
  const res = await api.request("/api/auth/login", {
    method: "POST",
    headers: { Origin: "http://evil.example.com" },
    body: { email: CUSTOMER.email, password: CUSTOMER.password },
  });
  assert.equal(res.status, 403);
});

test("any loopback dev port is an accepted origin", async (t) => {
  if (process.env.NODE_ENV === "production") {
    return t.skip("loopback origins are only allowed outside production");
  }

  const origin = "http://localhost:5999";
  const api = client();
  const res = await api.request("/api/auth/login", {
    method: "POST",
    headers: { Origin: origin },
    body: { email: CUSTOMER.email, password: CUSTOMER.password },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), origin);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
});

test("database errors do not leak internals", async () => {
  const api = client();
  const res = await api.request("/api/admin/products/999999999");
  // Unauthenticated -> 401; never a raw SQL error.
  assert.equal(res.status, 401);
});
