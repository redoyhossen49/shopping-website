import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

// Explicitly disabled: verifies the sandbox endpoint is inert by default.
process.env.DEMO_MODE = "false";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");

const stamp = Date.now();
const ADMIN = {
  name: "Demo Disabled Admin",
  email: `demo-disabled-admin-${stamp}@test.local`,
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
  await pool.query("DELETE FROM public.users WHERE id = $1", [adminId]);
  server.close();
  await pool.end();
});

test("config reports demo mode off by default", async () => {
  const res = await request("/api/config");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.demoMode, false);
});

test("demo reset endpoint is forbidden when demo mode is disabled", async () => {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN.email, password: ADMIN.password },
  });

  assert.equal(login.status, 200);

  const res = await request("/api/admin/demo/reset", { method: "POST" });

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test("demo session endpoint is forbidden when demo mode is disabled", async () => {
  const res = await request("/api/demo/session", { method: "POST" });

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});
