import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

// Node's test runner executes each file in its own process, so this value does
// not leak into other suites. Set before importing env/app.
process.env.DEMO_MODE = "true";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");
const { clearDemoData } = await import("../src/services/demo.service.js");

const stamp = Date.now();
const ADMIN = {
  name: "Demo Test Admin",
  email: `demo-test-admin-${stamp}@test.local`,
  password: "AdminPass123!",
};

let server;
let base;
let adminId;
let cookie = "";

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(base + path, {
    method,
    headers,
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

  return { status: res.status, body: json };
}

// ---------------------------------------------------------------------------
// Cross-scope isolation helpers
// ---------------------------------------------------------------------------
const OWNER_PRODUCT_TITLE = `Owner Scoped Product ${stamp}`;
const OWNER_CATEGORY = `Owner Scoped Category ${stamp}`;
const DEMO_PRODUCT_TITLE = `Demo Scoped Product ${stamp}`;
const DEMO_CATEGORY = `Demo Scoped Category ${stamp}`;

// Non-demo rows created by these tests, removed explicitly in after().
const ownerOnly = { products: [], categories: [], orders: [] };

function jar() {
  let sessionCookie = "";

  return {
    async request(path, { method = "GET", body } = {}) {
      const headers = {};
      if (body) headers["Content-Type"] = "application/json";
      if (sessionCookie) headers.Cookie = sessionCookie;

      const res = await fetch(base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const setCookie = res.headers.get("set-cookie");
      if (setCookie) sessionCookie = setCookie.split(";")[0];

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }

      return { status: res.status, body: json };
    },
  };
}

async function ownerAdminClient() {
  const api = jar();
  const res = await api.request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });
  assert.equal(res.status, 200);
  return api;
}

async function demoAdminClient() {
  const api = jar();
  const res = await api.request("/api/demo/session", { method: "POST" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.role, "admin");
  return api;
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
  if (ownerOnly.orders.length) {
    await pool.query("DELETE FROM public.order_returns WHERE order_id = ANY($1)", [
      ownerOnly.orders,
    ]);
    await pool.query(
      "DELETE FROM public.order_status_history WHERE order_id = ANY($1)",
      [ownerOnly.orders]
    );
    await pool.query(
      "DELETE FROM public.order_tracking_events WHERE order_id = ANY($1)",
      [ownerOnly.orders]
    );
    await pool.query("DELETE FROM public.payments WHERE order_id = ANY($1)", [
      ownerOnly.orders,
    ]);
    await pool.query("DELETE FROM public.order_items WHERE order_id = ANY($1)", [
      ownerOnly.orders,
    ]);
    await pool.query("DELETE FROM public.orders WHERE id = ANY($1)", [
      ownerOnly.orders,
    ]);
  }

  if (ownerOnly.products.length) {
    await pool.query(
      "DELETE FROM public.inventory_movements WHERE product_id = ANY($1)",
      [ownerOnly.products]
    );
    await pool.query("DELETE FROM public.products WHERE id = ANY($1)", [
      ownerOnly.products,
    ]);
  }

  if (ownerOnly.categories.length) {
    await pool.query("DELETE FROM public.categories WHERE id = ANY($1)", [
      ownerOnly.categories,
    ]);
  }

  await clearDemoData();
  await pool.query("DELETE FROM public.users WHERE id = $1", [adminId]);
  server.close();
  await pool.end();
});

test("public config advertises demo mode", async () => {
  const res = await request("/api/config");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.demoMode, true);
  assert.equal(typeof res.body.data.onlinePaymentsEnabled, "boolean");
});

test("anonymous users cannot reset demo data", async () => {
  const res = await request("/api/admin/demo/reset", { method: "POST" });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("admin reset reseeds the demo dataset", async () => {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  assert.equal(login.status, 200);

  const res = await request("/api/admin/demo/reset", { method: "POST" });

  assert.equal(res.status, 200);
  assert.ok(res.body.data.orders >= 20, "expected a populated order history");
  assert.ok(res.body.data.products >= 10);
  assert.ok(res.body.data.customers >= 8);

  const status = await request("/api/admin/demo/status");

  assert.equal(status.status, 200);
  assert.equal(status.body.data.demoMode, true);
  assert.equal(status.body.data.demo_orders, res.body.data.orders);
});

test("reset is deterministic and keeps demo counts stable", async () => {
  const first = await request("/api/admin/demo/reset", { method: "POST" });
  const second = await request("/api/admin/demo/reset", { method: "POST" });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.data.orders, second.body.data.orders);
  assert.equal(first.body.data.products, second.body.data.products);
});

test("public config never exposes demo credentials", async () => {
  const res = await jar().request("/api/config");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.demoMode, true);
  assert.equal(res.body.data.demoAdminEmail, undefined);
  assert.equal(res.body.data.demoAdminPassword, undefined);
});

test("public demo session endpoint issues a scoped admin cookie", async () => {
  const demo = await demoAdminClient();

  const me = await demo.request("/api/admin/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.data.role, "admin");
});

test("public product listing is paginated and scoped to the demo catalog", async () => {
  const api = jar();

  const first = await api.request("/api/products");
  assert.equal(first.status, 200);
  assert.equal(first.body.data.length, 6);
  assert.equal(first.body.meta.limit, 6);
  assert.equal(first.body.meta.page, 1);
  assert.ok(first.body.meta.total >= 16);
  assert.equal(
    first.body.meta.totalPages,
    Math.ceil(first.body.meta.total / 6)
  );

  const second = await api.request("/api/products?page=2&limit=6");
  assert.equal(second.body.meta.page, 2);
  assert.equal(second.body.data.length, 6);
  // Pages must not overlap.
  assert.ok(
    second.body.data.every(
      (row) => !first.body.data.some((prev) => prev.id === row.id)
    )
  );

  const clamped = await api.request("/api/products?limit=1000");
  assert.equal(clamped.body.meta.limit, 100);

  // A real (owner) product must never surface on the demo storefront.
  const owner = await ownerAdminClient();
  const ownerProduct = await owner.request("/api/admin/products", {
    method: "POST",
    body: { title: OWNER_PRODUCT_TITLE, price: 50, stock: 2, category: "Owner" },
  });
  assert.equal(ownerProduct.status, 201);
  ownerOnly.products.push(ownerProduct.body.data.id);

  const search = await api.request(
    `/api/products?search=${encodeURIComponent(OWNER_PRODUCT_TITLE)}&limit=100`
  );
  assert.equal(search.body.data.length, 0);
});

test("admin product data is isolated between owner and demo scopes", async () => {
  const owner = await ownerAdminClient();
  const demo = await demoAdminClient();

  const ownerProduct = await owner.request("/api/admin/products", {
    method: "POST",
    body: { title: OWNER_PRODUCT_TITLE, price: 50, stock: 2, category: "Owner" },
  });
  assert.equal(ownerProduct.status, 201);
  const ownerProductId = ownerProduct.body.data.id;
  ownerOnly.products.push(ownerProductId);

  const demoProduct = await demo.request("/api/admin/products", {
    method: "POST",
    body: { title: DEMO_PRODUCT_TITLE, price: 60, stock: 2, category: "Demo" },
  });
  assert.equal(demoProduct.status, 201);
  const demoProductId = demoProduct.body.data.id;

  // The owner scope cannot see the synthetic demo product.
  const ownerSearch = await owner.request(
    `/api/admin/products?search=${encodeURIComponent(DEMO_PRODUCT_TITLE)}`
  );
  assert.equal(ownerSearch.body.data.length, 0);
  assert.equal(
    (await owner.request(`/api/admin/products/${demoProductId}`)).status,
    404
  );

  // The demo scope cannot see the real owner product.
  const demoSearch = await demo.request(
    `/api/admin/products?search=${encodeURIComponent(OWNER_PRODUCT_TITLE)}`
  );
  assert.equal(demoSearch.body.data.length, 0);
  assert.equal(
    (await demo.request(`/api/admin/products/${ownerProductId}`)).status,
    404
  );
});

test("categories are isolated between owner, demo and public scopes", async () => {
  const owner = await ownerAdminClient();
  const demo = await demoAdminClient();

  const ownerCategory = await owner.request("/api/admin/categories", {
    method: "POST",
    body: { name: OWNER_CATEGORY },
  });
  assert.equal(ownerCategory.status, 201);
  ownerOnly.categories.push(ownerCategory.body.data.id);

  const demoCategory = await demo.request("/api/admin/categories", {
    method: "POST",
    body: { name: DEMO_CATEGORY },
  });
  assert.equal(demoCategory.status, 201);

  const ownerList = await owner.request("/api/admin/categories");
  assert.ok(ownerList.body.data.some((row) => row.name === OWNER_CATEGORY));
  assert.ok(!ownerList.body.data.some((row) => row.name === DEMO_CATEGORY));

  const demoList = await demo.request("/api/admin/categories");
  assert.ok(demoList.body.data.some((row) => row.name === DEMO_CATEGORY));
  assert.ok(!demoList.body.data.some((row) => row.name === OWNER_CATEGORY));

  // The public storefront follows the deployment scope (demo mode).
  const publicList = await jar().request("/api/categories");
  assert.ok(publicList.body.data.some((row) => row.name === DEMO_CATEGORY));
  assert.ok(!publicList.body.data.some((row) => row.name === OWNER_CATEGORY));
});

test("orders are isolated between owner and demo scopes", async () => {
  const { createOrder } = await import("../src/services/orders.service.js");
  const owner = await ownerAdminClient();
  const demo = await demoAdminClient();

  const ownerProduct = await owner.request("/api/admin/products", {
    method: "POST",
    body: {
      title: `Owner Order Product ${stamp}`,
      price: 100,
      stock: 5,
      category: "Owner",
    },
  });
  assert.equal(ownerProduct.status, 201);
  ownerOnly.products.push(ownerProduct.body.data.id);

  const ownerOrder = await createOrder({
    customerName: "Real Buyer",
    customerEmail: `real-buyer-${stamp}@test.local`,
    customerPhone: "01700000000",
    shippingAddress: "1 Real Road",
    shippingCity: "Dhaka",
    shippingCountry: "Bangladesh",
    shippingPostalCode: "1207",
    items: [{ productId: ownerProduct.body.data.id, quantity: 1 }],
    paymentMethod: "cod",
    isDemo: false,
  });
  ownerOnly.orders.push(ownerOrder.id);

  // The deployment is in demo mode, so a guest checkout writes demo data.
  const demoProduct = await demo.request("/api/admin/products", {
    method: "POST",
    body: {
      title: `Demo Order Product ${stamp}`,
      price: 100,
      stock: 5,
      category: "Demo",
    },
  });
  assert.equal(demoProduct.status, 201);

  const guest = jar();
  const demoOrder = await guest.request("/api/orders", {
    method: "POST",
    body: {
      customer_name: "Demo Buyer",
      customer_email: `demo-buyer-${stamp}@test.local`,
      customer_phone: "01700000000",
      shipping_address: "2 Demo Road",
      shipping_city: "Dhaka",
      shipping_country: "Bangladesh",
      shipping_postal_code: "1207",
      items: [{ productId: demoProduct.body.data.id, quantity: 1 }],
    },
  });
  assert.equal(demoOrder.status, 201);
  const demoOrderId = demoOrder.body.data.id;
  const demoOrderNumber = demoOrder.body.data.order_number;

  // Cross-scope detail reads are indistinguishable from missing rows.
  assert.equal(
    (await owner.request(`/api/admin/orders/${demoOrderId}`)).status,
    404
  );
  assert.equal(
    (await demo.request(`/api/admin/orders/${ownerOrder.id}`)).status,
    404
  );

  // In-scope reads succeed.
  assert.equal(
    (await demo.request(`/api/admin/orders/${demoOrderId}`)).status,
    200
  );
  assert.equal(
    (await owner.request(`/api/admin/orders/${ownerOrder.id}`)).status,
    200
  );

  // The demo order is absent from the owner's order list.
  const ownerOrderSearch = await owner.request(
    `/api/admin/orders?search=${encodeURIComponent(demoOrderNumber)}`
  );
  assert.equal(ownerOrderSearch.body.data.length, 0);
});

test("demo admin cannot change shared store settings", async () => {
  const demo = await demoAdminClient();

  const blocked = await demo.request("/api/admin/settings", {
    method: "PATCH",
    body: { store_name: "Hijacked by demo" },
  });
  assert.equal(blocked.status, 403);

  // The owner still has read access to the shared settings.
  const owner = await ownerAdminClient();
  const read = await owner.request("/api/admin/settings");
  assert.equal(read.status, 200);
});
