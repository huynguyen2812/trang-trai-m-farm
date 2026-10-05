import assert from 'node:assert/strict';
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:5175';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local only');
let cookie = '';
async function req(path, data, headers = {}) {
  return fetch(base + path, { method: data ? 'POST' : 'GET', headers: { origin: base, cookie, ...(data ? {'content-type':'application/json'} : {}), ...headers }, ...(data ? {body: JSON.stringify(data)} : {}) });
}
async function role(value) {
  const r = await req('/api/demo', {role:value}); assert.equal(r.status,200);
  if (r.headers.getSetCookie().length) cookie = r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
}
async function post(data) { const r=await req('/api/notifications', data); const out=await r.json(); assert.equal(r.status,200,JSON.stringify(out)); return out; }
const channel = {customer_id:'KH-001',channel:'zalo_crm',status:'granted',account_ref:'test-account',thread_ref:'test-thread',consent_source:'local_test'};
assert.equal((await req('/api/notifications')).status,401);
await role('customer');
assert.equal((await req('/api/notifications')).status,403);
assert.equal((await req('/api/notifications',{action:'process'})).status,403);
await role('admin');
assert.equal((await req('/api/notifications',{action:'queueWeekly'},{origin:'https://evil.invalid'})).status,403);
assert.equal((await req('/api/notifications',{action:'setChannel',data:{...channel,customer_id:'missing'}})).status,404);
await post({action:'setChannel',data:channel});
assert.equal((await post({action:'queueWeekly'})).queued,1);
assert.equal((await post({action:'queueWeekly'})).queued,0);
await post({action:'setChannel',data:{...channel,status:'withdrawn'}});
assert.equal((await post({action:'process'})).skipped,1);
let snapshot=await (await req('/api/notifications')).json();
assert.equal(snapshot.deliveries[0].status,'cancelled');
assert(!JSON.stringify(snapshot).includes('test-thread'));
await post({action:'setChannel',data:channel});
const form = new FormData();
for (const [k,v] of Object.entries({asset_id:'GA-001',kind:'growth',title:'Kiểm tra tin tự động',body:'Dữ liệu kiểm thử',metric:'1 kg'})) form.set(k,v);
const update = await fetch(base+'/api/log-images',{method:'POST',headers:{origin:base,cookie},body:form});
assert.equal(update.status,201); assert.equal((await update.json()).notification.queued,1);
const processed=await post({action:'process'}); assert.equal(processed.sent,1);
assert.equal((await post({action:'process'})).sent,0);
snapshot=await (await req('/api/notifications')).json();
assert(snapshot.deliveries.some(x=>x.status==='simulated'));
assert.equal(snapshot.settings.mode,'mock');
assert.equal((await req('/api/notifications',{action:'process',limit:-1})).status,400);
cookie=''; await role('admin');
snapshot=await (await req('/api/notifications')).json();
assert.equal(snapshot.channels.length,0); assert.equal(snapshot.deliveries.length,0);
console.log('PASS notifications: authorization, origin, tenant isolation, consent revocation, weekly deduplication, automatic queue, mock processing, input validation');
