import assert from 'node:assert/strict';
// Runs only against a local dev server with isolated demo tenants (each fresh demo cookie = new demo-<uuid> tenant).
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Chỉ chạy kiểm thử trên local.');
let cookie = '';
async function request(path, body, extra = {}) {
  return fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { origin: base, cookie, ...(body ? { 'content-type': 'application/json' } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function role(role) {
  const r = await request('/api/demo', { role });
  assert.equal(r.status, 200);
  if (r.headers.getSetCookie().length) cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}
const change = (user_id, role, suspended, reason) => request('/api/system-admin', { user_id, role, suspended, reason });

// Anonymous, customer and farm owner are denied (read and write).
assert.equal((await request('/api/system-admin')).status, 401);
await role('customer');
assert.equal((await request('/api/system-admin')).status, 403);
assert.equal((await change('KH-002', 'admin', false, 'Khách tự cấp quyền')).status, 403);
await role('admin');
assert.equal((await request('/api/system-admin')).status, 403);
assert.equal((await change('KH-002', 'admin', false, 'Chủ trại tự cấp quyền')).status, 403);
const farm = await (await request('/api/app')).json(); // owner flow intact; used as ground truth for overview counts
assert(Array.isArray(farm.assets) && farm.assets.length > 0);

// System admin allowed; overview is tenant-scoped and matches the owner's view of the same demo tenant.
await role('system_admin');
let r = await request('/api/system-admin');
assert.equal(r.status, 200);
const first = await r.json();
assert(first.users.length > 0);
assert.deepEqual(Object.keys(first.actor).sort(), ['demo', 'id', 'name', 'role']);
assert.equal(first.actor.demo, true);
assert.equal(first.actor.role, 'system_admin');
assert.equal(first.actor.name, 'Admin hệ thống (mẫu)');
assert.deepEqual(first.overview, {
  assets: farm.assets.length,
  orders: farm.orders.length,
  packages: farm.packages.filter((p) => p.active === 1).length,
  images: farm.log_images.length,
});
assert.deepEqual(Object.keys(first.connections).sort(), ['auth', 'owner', 'systemAdmin', 'zns']);
for (const v of Object.values(first.connections)) assert.equal(typeof v, 'boolean', 'connections must be boolean only');
assert.equal(first.connections.zns, false);
for (const u of first.users) {
  assert.equal(u.phone, undefined, 'phone not exposed');
  assert.equal(typeof u.protected, 'boolean');
  assert(['admin', 'customer', 'system_admin'].includes(u.role));
  assert.notEqual(u.role, 'system_admin', 'demo tenant never inherits SYSTEM_ADMIN_EMAILS');
}
assert.equal((await request('/api/app')).status, 403); // no farm business access

// Validation and protection.
assert.equal((await change('KH-001', 'system_admin', false, 'Thử leo thang quyền')).status, 400);
assert.equal((await change('KH-001', 'customer', true, 'abc')).status, 400); // reason < 5 chars
assert.equal((await change('KH-001', 'customer', false, 'Không đổi gì cả')).status, 400); // no-op rejected
assert.equal((await change('DEMO-SYSTEM', 'admin', false, 'Sửa chính mình')).status, 404);
assert.equal((await request('/api/system-admin', { user_id: 'KH-001', role: 'customer', suspended: true, reason: 'Thiếu origin' }, { origin: 'http://evil.example' })).status, 403);
assert.equal((await request('/api/system-admin')).status, 200);
const afterRejects = await (await request('/api/system-admin')).json();
assert.equal(afterRejects.audit.length, first.audit.length, 'rejected changes write no audit');

// Suspend with before/after audit + reason.
assert.equal((await change('KH-001', 'customer', true, 'Kiểm thử khóa truy cập')).status, 200);
let latest = (await (await request('/api/system-admin')).json()).audit[0];
assert.equal(latest.target_id, 'KH-001');
assert.equal(latest.actor_id, 'DEMO-SYSTEM');
assert.equal(latest.reason, 'Kiểm thử khóa truy cập');
assert.deepEqual(JSON.parse(latest.before_state), { role: 'customer', suspended: false });
assert.deepEqual(JSON.parse(latest.after_state), { role: 'customer', suspended: true });
await role('customer');
assert.equal((await request('/api/app')).status, 403);

// Unsuspend + promote to owner in the same demo tenant; effective on next request.
await role('system_admin');
assert.equal((await change('KH-001', 'admin', false, 'Mở lại và nâng quyền kiểm thử')).status, 200);
latest = (await (await request('/api/system-admin')).json()).audit[0];
assert.deepEqual(JSON.parse(latest.before_state), { role: 'customer', suspended: true });
assert.deepEqual(JSON.parse(latest.after_state), { role: 'admin', suspended: false });
await role('customer');
r = await request('/api/app');
assert.equal(r.status, 200);
assert.equal((await r.json()).actor.role, 'admin');

// Restore and check persisted audit count.
await role('system_admin');
assert.equal((await change('KH-001', 'customer', false, 'Trả lại quyền khách hàng')).status, 200);
const audit = await (await request('/api/system-admin')).json();
assert.equal(audit.audit.length, first.audit.length + 3);
assert.equal(audit.users.find((u) => u.id === 'KH-001').role, 'customer');

// Tenant isolation: a fresh demo session sees none of the above changes.
cookie = '';
await role('system_admin');
const other = await (await request('/api/system-admin')).json();
assert.equal(other.audit.length, 0);
assert(other.users.every((u) => !u.suspended && u.role === 'customer'));
console.log('PASS: anonymous/customer/owner denied; system allowed with tenant-scoped overview and boolean-only config; no farm access; cannot grant system role; reason/no-op/origin/self validated; suspend enforced; promote effective; before/after audit persisted; demo tenants isolated.');
