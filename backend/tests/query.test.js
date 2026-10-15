import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

// Query-parameter hardening. Node runs each test file in its own process, so
// setting demo mode here never leaks into other suites.
process.env.DEMO_MODE = "false";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");

const stamp = Date.now();
const ADMIN = {
  name: "Query Admin",
  email: `query-admin-${stamp}@test.local`,
  password: "AdminPass123!",
};
const CUSTOMER = {
  name: "Query Customer",
  email: `query-customer-${stamp}@test.local`,
  password: "Customer123!",
};

let server;
let base;
let adminId;

const created = { products: [], users: [] };

function client() {
  let cookie = "";
  return {
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

      return { status: res.status, body: json };
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
  await pool.query(
    "DELETE FROM public.inventory_movements WHERE product_id = ANY($1)",
    [created.products]
  );
  await pool.query("DELETE FROM public.products WHERE id = ANY($1)", [
    created.products,
  ]);
  await pool.query("DELETE FROM public.users WHERE id = $1 OR email = ANY($2)", [
    adminId,
    [ADMIN.email, CUSTOMER.email],
  ]);
  server.close();
  await pool.end();
});

async function login(api, email, password) {
  return api.request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

async function createProduct(api, { title, price, stock = 5 }) {
  const res = await api.request("/api/admin/products", {
    method: "POST",
    body: { title, price, stock, category: `Query ${stamp}` },
  });
  assert.equal(res.status, 201);
  created.products.push(res.body.data.id);
  return res.body.data.id;
}

test("sort allowlist cannot be bypassed via prototype keys", async () => {
  const api = client();

  for (const sort of ["constructor", "__proto__", "toString", "nope"]) {
    const res = await api.request(`/api/products?sort=${sort}`);
    assert.equal(res.status, 200, `sort=${sort} should fall back, not error`);
    assert.ok(Array.isArray(res.body.data));
  }
});

test("public products return consistent meta and no legacy count field", async () => {
  const res = await client().request("/api/products");

  assert.equal(res.status, 200);
  assert.equal(res.body.count, undefined);
  assert.equal(res.body.meta.limit, 6);
  assert.ok(Number.isInteger(res.body.meta.total));
  assert.ok(Number.isInteger(res.body.meta.totalPages));
});

test("uppercase order direction is honoured", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  await createProduct(admin, { title: `Sort A ${stamp}`, price: 111 });
  await createProduct(admin, { title: `Sort B ${stamp}`, price: 999 });

  const desc = await client().request(
    "/api/products?sort=price&order=DESC&limit=100"
  );
  const asc = await client().request(
    "/api/products?sort=price&order=ASC&limit=100"
  );

  const descending = desc.body.data.map((row) => Number(row.price));
  const ascending = asc.body.data.map((row) => Number(row.price));

  for (let i = 1; i < descending.length; i += 1) {
    assert.ok(descending[i - 1] >= descending[i], "DESC should not increase");
  }

  for (let i = 1; i < ascending.length; i += 1) {
    assert.ok(ascending[i - 1] <= ascending[i], "ASC should not decrease");
  }
});

test("invalid filter values are rejected with 400", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);

  const cases = [
    ["/api/products?availability=weird", admin],
    ["/api/admin/products?stock_status=bogus", admin],
    ["/api/admin/products?published=maybe", admin],
    ["/api/admin/orders?status=bogus", admin],
    ["/api/admin/orders?payment_status=bogus", admin],
  ];

  for (const [path, requester] of cases) {
    const res = await requester.request(path);
    assert.equal(res.status, 400, `${path} should be rejected`);
    assert.equal(res.body.success, false);
  }
});

test("account order status filter is validated", async () => {
  const customer = client();
  const registered = await customer.request("/api/auth/register", {
    method: "POST",
    body: CUSTOMER,
  });
  assert.equal(registered.status, 201);
  await login(customer, CUSTOMER.email, CUSTOMER.password);

  const bad = await customer.request("/api/account/orders?status=nonsense");
  assert.equal(bad.status, 400);

  const good = await customer.request("/api/account/orders?status=pending");
  assert.equal(good.status, 200);
  assert.ok(Array.isArray(good.body.data));
});

test("search is trimmed and length-capped", async () => {
  const admin = client();
  await login(admin, ADMIN.email, ADMIN.password);
  await createProduct(admin, { title: `Trim Needle ${stamp}`, price: 42 });

  const trimmed = await client().request(
    `/api/products?search=${encodeURIComponent(`   Trim Needle ${stamp}   `)}&limit=100`
  );
  assert.equal(trimmed.status, 200);
  assert.ok(
    trimmed.body.data.some((row) => row.title === `Trim Needle ${stamp}`),
    "trimmed search should match"
  );

  const tooLong = await client().request(
    `/api/products?search=${"a".repeat(101)}`
  );
  assert.equal(tooLong.status, 400);
});

test("out-of-range page returns an empty page with correct meta", async () => {
  const res = await client().request("/api/products?page=9999");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, []);
  assert.equal(res.body.meta.page, 9999);

  const invalid = await client().request("/api/products?page=abc&limit=0");
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.meta.page, 1);
  assert.equal(invalid.body.meta.limit, 6);
});
