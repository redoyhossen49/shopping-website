import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

// This suite exercises the owner (non-demo) storefront, so force demo mode off
// regardless of the developer's local .env. Set before importing env/app.
process.env.DEMO_MODE = "false";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");

const stamp = Date.now();
const ADMIN = {
  name: "Owner",
  email: `acct-admin-${stamp}@test.local`,
  password: "AdminPass123!",
};
const CUSTOMER = {
  name: "Alice Buyer",
  email: `alice-${stamp}@test.local`,
  password: "Customer123!",
};
const OTHER = {
  name: "Bob Buyer",
  email: `bob-${stamp}@test.local`,
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
    async request(path, { method = "GET", body, headers = {}, redirect } = {}) {
      const finalHeaders = { ...headers };
      if (body) finalHeaders["Content-Type"] = "application/json";
      if (cookie) finalHeaders.Cookie = cookie;

      const res = await fetch(base + path, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...(redirect ? { redirect } : {}),
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

async function register(api, user) {
  return api.request("/api/auth/register", { method: "POST", body: user });
}

async function login(api, email, password) {
  return api.request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

async function createProduct(adminApi, { title, price = 100, stock = 5 }) {
  const res = await adminApi.request("/api/admin/products", {
    method: "POST",
    body: { title, price, stock, category: `Acct ${stamp}` },
  });

  assert.equal(res.status, 201);
  created.products.push(res.body.data.id);
  return res.body.data.id;
}

async function placeOrder(api, productId, quantity = 1, extra = {}) {
  const res = await api.request("/api/orders", {
    method: "POST",
    body: {
      customer_name: CUSTOMER.name,
      customer_email: CUSTOMER.email,
      customer_phone: "01700000000",
      shipping_address: "12 Test Street",
      shipping_city: "Dhaka",
      shipping_country: "Bangladesh",
      shipping_postal_code: "1207",
      items: [{ productId, quantity }],
      ...extra,
    },
  });

  if (res.status === 201) {
    created.orders.push(res.body.data.id);
  }

  return res;
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
  await pool.query(
    "DELETE FROM public.order_status_history WHERE order_id = ANY($1)",
    [created.orders]
  );
  await pool.query("DELETE FROM public.order_items WHERE order_id = ANY($1)", [
    created.orders,
  ]);
  await pool.query("DELETE FROM public.orders WHERE id = ANY($1)", [
    created.orders,
  ]);
  await pool.query(
    "DELETE FROM public.inventory_movements WHERE product_id = ANY($1)",
    [created.products]
  );
  await pool.query("DELETE FROM public.products WHERE id = ANY($1)", [
    created.products,
  ]);
  await pool.query("DELETE FROM public.categories WHERE id = ANY($1)", [
    created.categories,
  ]);
  await pool.query("DELETE FROM public.users WHERE id = $1 OR email = ANY($2)", [
    adminId,
    [CUSTOMER.email, OTHER.email],
  ]);

  server.close();
  await pool.end();
});

test("account profile can be read and updated", async () => {
  const api = client();
  await register(api, CUSTOMER);
  await login(api, CUSTOMER.email, CUSTOMER.password);

  const profile = await api.request("/api/account/profile");
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.email, CUSTOMER.email);
  assert.equal(profile.body.data.order_count, 0);

  const updated = await api.request("/api/account/profile", {
    method: "PATCH",
    body: { name: "Alice B", phone: "01711111111" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.name, "Alice B");
  assert.equal(updated.body.data.phone, "01711111111");
});

test("password change requires the correct current password", async () => {
  const api = client();
  await login(api, CUSTOMER.email, CUSTOMER.password);

  const bad = await api.request("/api/account/password", {
    method: "PATCH",
    body: { current_password: "wrong", new_password: "NewPass123!" },
  });
  assert.equal(bad.status, 400);

  const good = await api.request("/api/account/password", {
    method: "PATCH",
    body: { current_password: CUSTOMER.password, new_password: "NewPass123!" },
  });
  assert.equal(good.status, 200);

  // Old password no longer works, new one does.
  const reloginOld = await client().request("/api/auth/login", {
    method: "POST",
    body: { email: CUSTOMER.email, password: CUSTOMER.password },
  });
  assert.equal(reloginOld.status, 401);

  const reloginNew = await client().request("/api/auth/login", {
    method: "POST",
    body: { email: CUSTOMER.email, password: "NewPass123!" },
  });
  assert.equal(reloginNew.status, 200);

  // Reset back so later tests use a known password.
  await pool.query(
    "UPDATE public.users SET password_hash = $2 WHERE email = $1",
    [CUSTOMER.email, await bcrypt.hash(CUSTOMER.password, 4)]
  );
});

test("address book supports create, default, update and delete", async () => {
  const api = client();
  await login(api, CUSTOMER.email, CUSTOMER.password);

  const first = await api.request("/api/account/addresses", {
    method: "POST",
    body: {
      recipient_name: "Alice Buyer",
      phone: "01700000000",
      address_line1: "12 Test Street",
      city: "Dhaka",
      postal_code: "1207",
      country: "Bangladesh",
    },
  });
  assert.equal(first.status, 201);
  // First address becomes the default automatically.
  assert.equal(first.body.data.is_default, true);

  const second = await api.request("/api/account/addresses", {
    method: "POST",
    body: {
      recipient_name: "Alice Office",
      phone: "01700000001",
      address_line1: "99 Office Road",
      city: "Chattogram",
      postal_code: "4000",
      country: "Bangladesh",
    },
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.data.is_default, false);

  const makeDefault = await api.request(
    `/api/account/addresses/${second.body.data.id}/default`,
    { method: "PATCH" }
  );
  assert.equal(makeDefault.status, 200);
  assert.equal(makeDefault.body.data.is_default, true);

  const list = await api.request("/api/account/addresses");
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 2);
  assert.equal(list.body.data[0].is_default, true);

  const removed = await api.request(
    `/api/account/addresses/${second.body.data.id}`,
    { method: "DELETE" }
  );
  assert.equal(removed.status, 200);

  const afterDelete = await api.request("/api/account/addresses");
  assert.equal(afterDelete.body.data.length, 1);
  // Deleting the default promotes the remaining address.
  assert.equal(afterDelete.body.data[0].is_default, true);
});

test("customers can only see their own orders", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Own P ${stamp}`, stock: 5 });

  const alice = client();
  await login(alice, CUSTOMER.email, CUSTOMER.password);
  const order = await placeOrder(alice, productId, 1);
  assert.equal(order.status, 201);
  const orderNumber = order.body.data.order_number;

  const mine = await alice.request(`/api/account/orders/${orderNumber}`);
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.order_number, orderNumber);

  const bob = client();
  await register(bob, OTHER);
  await login(bob, OTHER.email, OTHER.password);
  const stolen = await bob.request(`/api/account/orders/${orderNumber}`);
  assert.equal(stolen.status, 404);

  const list = await alice.request("/api/account/orders");
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((row) => row.order_number === orderNumber));
});

test("guest checkout returns a tracking token and orders can be tracked", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Guest P ${stamp}`, stock: 5 });

  const guest = client();
  const order = await placeOrder(guest, productId, 1, {
    customer_email: `guest-${stamp}@test.local`,
  });

  assert.equal(order.status, 201);
  assert.ok(order.body.data.tracking_token);
  const { order_number, tracking_token } = order.body.data;

  const tracked = await guest.request(
    `/api/orders/track?order=${encodeURIComponent(order_number)}&token=${tracking_token}`
  );
  assert.equal(tracked.status, 200);
  assert.equal(tracked.body.data.order_number, order_number);
  assert.ok(Array.isArray(tracked.body.data.tracking));
  assert.ok(tracked.body.data.tracking.length >= 1);

  const wrongToken = await guest.request(
    `/api/orders/track?order=${encodeURIComponent(order_number)}&token=deadbeef`
  );
  assert.equal(wrongToken.status, 404);

  const noToken = await guest.request(
    `/api/orders/track?order=${encodeURIComponent(order_number)}`
  );
  assert.equal(noToken.status, 404);
});

test("cancellation request flows through admin approval and restocks", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Cancel P ${stamp}`, stock: 5 });

  const customer = client();
  await login(customer, CUSTOMER.email, CUSTOMER.password);
  const order = await placeOrder(customer, productId, 2);
  assert.equal(order.status, 201);
  const orderNumber = order.body.data.order_number;

  const cancel = await customer.request(
    `/api/account/orders/${orderNumber}/cancel`,
    { method: "POST", body: { reason: "Changed my mind" } }
  );
  assert.equal(cancel.status, 201);
  const returnId = cancel.body.data.id;

  const duplicate = await customer.request(
    `/api/account/orders/${orderNumber}/cancel`,
    { method: "POST", body: { reason: "Again" } }
  );
  assert.equal(duplicate.status, 409);

  const list = await admin.request("/api/admin/returns?status=requested");
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((row) => row.id === returnId));

  const approved = await admin.request(`/api/admin/returns/${returnId}`, {
    method: "PATCH",
    body: { status: "approved", admin_note: "Approved" },
  });
  assert.equal(approved.status, 200);

  const detail = await admin.request(`/api/admin/orders/${order.body.data.id}`);
  assert.equal(detail.body.data.status, "cancelled");

  const stock = await admin.request(`/api/admin/products/${productId}`);
  assert.equal(Number(stock.body.data.stock), 5);
});

test("returns are only allowed for delivered orders within the window", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Return P ${stamp}`, stock: 5 });

  const customer = client();
  await login(customer, CUSTOMER.email, CUSTOMER.password);
  const order = await placeOrder(customer, productId, 1);
  const orderNumber = order.body.data.order_number;
  const orderId = order.body.data.id;

  // Too early: not delivered yet.
  const tooEarly = await customer.request(
    `/api/account/orders/${orderNumber}/return`,
    { method: "POST", body: { reason: "Not happy" } }
  );
  assert.equal(tooEarly.status, 400);

  // Move the order to delivered.
  for (const status of ["processing", "shipped", "delivered"]) {
    const res = await admin.request(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: { status },
    });
    assert.equal(res.status, 200);
  }

  const request = await customer.request(
    `/api/account/orders/${orderNumber}/return`,
    { method: "POST", body: { reason: "Damaged item" } }
  );
  assert.equal(request.status, 201);
  const returnId = request.body.data.id;

  const afterRequest = await admin.request(`/api/admin/orders/${orderId}`);
  assert.equal(afterRequest.body.data.status, "return_requested");

  const approved = await admin.request(`/api/admin/returns/${returnId}`, {
    method: "PATCH",
    body: { status: "approved" },
  });
  assert.equal(approved.status, 200);

  const finalOrder = await admin.request(`/api/admin/orders/${orderId}`);
  assert.equal(finalOrder.body.data.status, "returned");

  const stock = await admin.request(`/api/admin/products/${productId}`);
  assert.equal(Number(stock.body.data.stock), 5);
});

test("payment status changes sync to the payments table", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Pay P ${stamp}`, stock: 3 });

  const customer = client();
  await login(customer, CUSTOMER.email, CUSTOMER.password);
  const order = await placeOrder(customer, productId, 1, {
    payment_method: "cod",
  });
  assert.equal(order.status, 201);
  assert.equal(order.body.data.payment_method, "cod");

  const detail = await admin.request(`/api/admin/orders/${order.body.data.id}`);
  assert.equal(detail.body.data.payments.length, 1);
  assert.equal(detail.body.data.payments[0].status, "pending");

  const markPaid = await admin.request(
    `/api/admin/orders/${order.body.data.id}/payment`,
    { method: "PATCH", body: { payment_status: "paid" } }
  );
  assert.equal(markPaid.status, 200);
  assert.equal(markPaid.body.data.payment_status, "paid");
  assert.equal(markPaid.body.data.payments[0].status, "paid");
});

test("online payments respect gateway configuration and order ownership", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  const productId = await createProduct(admin, { title: `Online P ${stamp}`, stock: 3 });

  const config = await client().request("/api/payments/config");
  assert.equal(config.status, 200);
  assert.equal(typeof config.body.data.onlinePaymentsEnabled, "boolean");
  assert.equal(config.body.data.codEnabled, true);

  const customer = client();
  await login(customer, CUSTOMER.email, CUSTOMER.password);

  if (!config.body.data.onlinePaymentsEnabled) {
    // Without merchant credentials online checkout must be refused.
    const refused = await placeOrder(customer, productId, 1, {
      payment_method: "sslcommerz",
      payment_channel: "bkash",
    });
    assert.equal(refused.status, 400);

    const cod = await placeOrder(customer, productId, 1, {
      payment_method: "cod",
    });
    const initiate = await customer.request("/api/payments/initiate", {
      method: "POST",
      body: { order_number: cod.body.data.order_number },
    });
    // COD orders are not online-payable.
    assert.equal(initiate.status, 400);
  }

  // Unknown transaction ids must never be trusted.
  const ipn = await client().request("/api/payments/sslcommerz/ipn", {
    method: "POST",
    body: { tran_id: "NOPE-123", status: "VALID", val_id: "x" },
  });
  assert.equal(ipn.status, 200);
  assert.equal(ipn.body.success, false);
});
