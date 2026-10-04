import assert from "node:assert/strict";
const base = process.env.MF_TEST_URL || "http://127.0.0.1:5173";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error("Chỉ chạy kiểm thử trên local.");
let cookie = "";
async function role(value) {
  const r = await fetch(base + "/api/demo", {
    method: "POST",
    headers: { origin: base, cookie, "content-type": "application/json" },
    body: JSON.stringify({ role: value }),
  });
  assert.equal(r.status, 200);
  const c = r.headers.getSetCookie();
  if (c.length) cookie = c.map((s) => s.split(";")[0]).join("; ");
}
async function state() {
  return (await fetch(base + "/api/app", { headers: { cookie } })).json();
}
async function log(kind, metric, health = "", photo = false) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    asset_id: "GA-001",
    kind,
    metric,
    health,
    title: "Kiểm thử tự động",
    body: "Dữ liệu mẫu kiểm thử đồng bộ.",
  }))
    f.set(k, v);
  if (photo)
    f.append(
      "images",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "test.png",
    );
  return fetch(base + "/api/log-images", {
    method: "POST",
    headers: { origin: base, cookie },
    body: f,
  });
}
await role("admin");
assert.equal((await log("growth", "1,25 kg", "healthy", true)).status, 201);
let s = await state();
let a = s.assets.find((a) => a.id === "GA-001");
assert.equal(a.weight, "1,25 kg");
assert.equal(a.health, "healthy");
const imageId = s.log_images[0].id;
assert.equal((await log("food", "150 g/ngày", "attention")).status, 201);
a = (await state()).assets.find((a) => a.id === "GA-001");
assert.equal(a.weight, "1,25 kg");
assert.equal(a.health, "attention");
assert.equal((await log("growth", "")).status, 201);
assert.equal(
  (await state()).assets.find((a) => a.id === "GA-001").weight,
  "1,25 kg",
);
const count = (await state()).logs.length;
assert.equal((await log("growth", "2 kg", "invalid")).status, 400);
assert.equal((await state()).logs.length, count);
const jsonLog = await fetch(base + "/api/app", {
  method: "POST",
  headers: { origin: base, cookie, "content-type": "application/json" },
  body: JSON.stringify({
    action: "addLog",
    data: {
      asset_id: "GA-001",
      kind: "growth",
      metric: "1,30 kg",
      health: "healthy",
      title: "Kiểm thử JSON",
      body: "Nhật ký mẫu",
      image_url: "",
    },
  }),
});
assert.equal(jsonLog.status, 200);
assert.equal(
  (await state()).assets.find((a) => a.id === "GA-001").weight,
  "1,30 kg",
);
assert.equal(
  (await fetch(base + "/api/log-images/" + imageId, { headers: { cookie } }))
    .status,
  200,
);
await role("customer");
assert.equal((await log("growth", "9 kg")).status, 403);
assert.equal(
  (await fetch(base + "/api/log-images/" + imageId, { headers: { cookie } }))
    .status,
  200,
);
cookie = "";
await role("customer");
assert.equal(
  (await fetch(base + "/api/log-images/" + imageId, { headers: { cookie } }))
    .status,
  404,
);
assert.equal((await fetch(base + "/api/log-images/" + imageId)).status, 401);
console.log(
  "PASS: growth sync; explicit health; food/blank preserve weight; invalid data no log; JSON route sync; owner/customer photo access; cross-tenant and anonymous denied.",
);
