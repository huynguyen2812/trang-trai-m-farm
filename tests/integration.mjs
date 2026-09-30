import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:5173";
const jar = { cookie: "" };
async function call(path, data, session = jar, headers = {}) {
  const r = await fetch(origin + path, {
    method: data ? "POST" : "GET",
    headers: {
      Origin: origin,
      ...(data ? { "Content-Type": "application/json" } : {}),
      Cookie: session.cookie,
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  for (const c of r.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    const name = pair.split("=")[0];
    session.cookie = session.cookie
      .split("; ")
      .filter((v) => v && !v.startsWith(name + "="))
      .concat(pair)
      .join("; ");
  }
  const raw = await r.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { error: raw };
  }
  return { status: r.status, body };
}
async function ok(path, data, session = jar) {
  const r = await call(path, data, session);
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.body;
}
assert.equal((await call("/api/app")).status, 401);
assert.equal(
  (
    await call("/api/demo", { role: "admin" }, jar, {
      Origin: "https://untrusted.example",
    })
  ).status,
  403,
);
await ok("/api/demo", { role: "admin" });
let state = await ok("/api/app");
assert.equal(state.assets.length, 6);
assert.equal(state.actor.role, "admin");
const p = state.packages.find((p) => p.id === "PK-GA-01");
await ok("/api/app", { action: "savePackage", data: { ...p, price: 650000 } });
state = await ok("/api/app");
assert.equal(
  state.packages.find((p) => p.id === p.id && p.id === "PK-GA-01").price,
  650000,
);
assert.equal(state.orders.find((o) => o.id === "DH-001").price, 450000);
await ok("/api/app", {
  action: "addLog",
  data: {
    asset_id: "GA-001",
    title: "Kiểm thử nhật ký",
    body: "Bản ghi thử trong phiên dữ liệu mẫu.",
    kind: "growth",
    metric: "0,9 kg",
    image_url: "",
  },
});
await ok("/api/demo", { role: "customer" });
state = await ok("/api/app");
assert.equal(state.assets.length, 2);
assert(state.assets.every((a) => a.customer_id === "KH-001"));
assert(state.customers.every((c) => c.id === "KH-001"));
assert(state.logs.some((l) => l.title === "Kiểm thử nhật ký"));
assert(!state.logs.some((l) => l.asset_id === "GA-002"));
assert.equal(
  (await call("/api/app", { action: "savePackage", data: p })).status,
  403,
);
assert.equal(
  (
    await call("/api/app", {
      action: "request",
      data: { asset_id: "GA-002", kind: "pickup", note: "" },
    })
  ).status,
  400,
);
assert.equal(
  (
    await call("/api/app", {
      action: "purchase",
      data: { asset_id: "GA-003", package_id: "PK-GA-01", accepted: false },
    })
  ).status,
  400,
);
const purchase = {
  action: "purchase",
  data: {
    asset_id: "GA-003",
    package_id: "PK-GA-01",
    customer_id: "KH-002",
    accepted: true,
    expected_price: 650000,
    expected_days: 120,
  },
};
const concurrent = await Promise.all([
  call("/api/app", purchase),
  call("/api/app", purchase),
]);
assert.equal(concurrent.filter((r) => r.status === 200).length, 1);
state = await ok("/api/app");
const order = state.orders.find((o) => o.asset_id === "GA-003");
assert.equal(order.customer_id, "KH-001");
assert.equal(order.price, 650000);
assert.equal(state.assets.find((a) => a.id === "GA-003").status, "reserved");
await ok("/api/demo", { role: "admin" });
await ok("/api/app", { action: "confirmPayment", id: order.id });
state = await ok("/api/app");
assert.equal(state.assets.find((a) => a.id === "GA-003").status, "active");
await ok("/api/demo", { role: "customer" });
const request = await ok("/api/app", {
  action: "request",
  data: { asset_id: "GA-003", kind: "pickup", note: "Kiểm thử nhận sản phẩm" },
});
assert.equal(
  (
    await call("/api/app", {
      action: "request",
      data: { asset_id: "GA-003", kind: "buyback", note: "" },
    })
  ).status,
  409,
);
await ok("/api/demo", { role: "admin" });
await ok("/api/app", {
  action: "updateRequest",
  data: { id: request.id, status: "approved" },
});
await ok("/api/app", {
  action: "updateRequest",
  data: { id: request.id, status: "completed" },
});
state = await ok("/api/app");
assert.equal(state.assets.find((a) => a.id === "GA-003").status, "closed");
const isolated = { cookie: "" };
await ok("/api/demo", { role: "admin" }, isolated);
const other = await ok("/api/app", undefined, isolated);
assert.equal(other.packages.find((p) => p.id === "PK-GA-01").price, 450000);
assert.equal(other.orders.length, 3);
const auth = await ok("/api/auth");
assert.equal(auth.ready, false);
assert.equal(
  (
    await call("/api/auth", {
      action: "sendEmail",
      email: "qa@example.com",
      name: "QA Demo",
    })
  ).status,
  503,
);
await ok("/api/auth", { action: "logout" });
assert.equal((await call("/api/app")).status, 401);
console.log(
  "PASS: unauthenticated access, CSRF, demo persistence, tenant isolation, customer ownership, admin-only writes, price snapshots, atomic reservation, payment, requests, safe unconfigured auth, logout.",
);
