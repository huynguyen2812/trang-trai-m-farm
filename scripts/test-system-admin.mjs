import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';let cookie='';
async function request(path,body){return fetch(base+path,{method:body?'POST':'GET',headers:{origin:base,cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function role(role){const r=await request('/api/demo',{role});assert.equal(r.status,200);if(r.headers.getSetCookie().length)cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
assert.equal((await request('/api/system-admin')).status,401);
await role('customer');assert.equal((await request('/api/system-admin')).status,403);
await role('admin');assert.equal((await request('/api/system-admin')).status,403);
await role('system_admin');let r=await request('/api/system-admin');assert.equal(r.status,200);const first=await r.json();assert(first.users.length>0);
assert.equal((await request('/api/app')).status,403);
assert.equal((await request('/api/system-admin',{user_id:'KH-001',role:'system_admin',suspended:false,reason:'Thử leo thang quyền'})).status,400);
assert.equal((await request('/api/system-admin',{user_id:'KH-001',role:'customer',suspended:true,reason:'Kiểm thử khóa truy cập'})).status,200);
await role('customer');assert.equal((await request('/api/app')).status,403);
await role('system_admin');assert.equal((await request('/api/system-admin',{user_id:'KH-001',role:'customer',suspended:false,reason:'Mở lại sau kiểm thử'})).status,200);
const audit=await (await request('/api/system-admin')).json();assert.equal(audit.audit.length,first.audit.length+2);
await role('customer');assert.equal((await request('/api/app')).status,200);
console.log('PASS: anonymous/customer/owner denied; system allowed; no farm access; cannot grant system role; suspend enforced; unsuspend restores; audit persisted.');
