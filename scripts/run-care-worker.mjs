// Invoke from an external scheduler. Secrets are read only from its environment.
const origin = process.env.MF_APP_ORIGIN;
const key = process.env.MF_NOTIFICATION_JOB_KEY;
if (!origin || !key) throw Error('Set MF_APP_ORIGIN and MF_NOTIFICATION_JOB_KEY in the worker environment.');
const url = new URL(origin);
if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !['127.0.0.1','localhost'].includes(url.hostname))) throw Error('Use HTTPS app origin or local loopback.');
const weekly = process.argv.includes('--weekly');
if (!process.argv.includes('--execute')) {
  console.log(`Dry run: ${weekly ? 'queueWeekly, then ' : ''}process. Add --execute to call the configured M FARM API.`);
  process.exit(0);
}
for (const action of weekly ? ['queueWeekly','process'] : ['process']) {
  const response = await fetch(new URL('/api/notifications',url), {method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/json','x-mf-notification-job-key':key},body:JSON.stringify({action,limit:5})});
  if (!response.ok) throw Error(`Worker ${action} returned HTTP ${response.status}; inspect M FARM delivery history.`);
  const result = await response.json();
  console.log(JSON.stringify({action,queued:result.queued,sent:result.sent,skipped:result.skipped,failed:result.failed}));
}
