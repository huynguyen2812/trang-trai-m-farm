/** Verified against customer-care-gateway 4149d96 InstallationGuard/CareJobsService. */
export type GatewayConfig = Record<string, string | undefined>;
export type CareJob = {
  sourceProduct: 'EXTERNAL_CONNECTOR'; externalReferenceId: string; eventType: string;
  recipient: {name:string;phone:string}; templateCode:string; templateVariables:Record<string,string>;
  scheduledAt:string; idempotencyKey:string; consentStatus:'GRANTED';
};
export class NotificationGatewayError extends Error {
  constructor(message:string, public readonly code:string, public readonly retryable=false) {super(message);}
}
export function notificationSettings(v:GatewayConfig) {
  const mode=v.MF_NOTIFICATION_MODE==='mock'?'mock':v.MF_NOTIFICATION_MODE==='customer-care-gateway'?'customer-care-gateway':'disabled';
  return {mode,gatewayConfigured:!!(v.MF_CUSTOMER_CARE_GATEWAY_URL&&v.MF_CARE_CLIENT_ID&&v.MF_CARE_CLIENT_SECRET),liveEnabled:v.MF_CARE_LIVE_ENABLED==='true'};
}
const enc=new TextEncoder();
const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
async function sha(v:string){return hex(await crypto.subtle.digest('SHA-256',enc.encode(v)));}
export async function careRequest(v:GatewayConfig, method:'GET'|'POST', path:string, input?:unknown, transport:typeof fetch=fetch) {
  if(!notificationSettings(v).gatewayConfigured) throw new NotificationGatewayError('Chưa cấu hình gateway.','gateway_not_configured');
  const url=new URL(v.MF_CUSTOMER_CARE_GATEWAY_URL!);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) throw new NotificationGatewayError('Gateway phải là HTTPS origin hoặc loopback local.','gateway_url_invalid');
  if(!/^\/api\/v1\/(care-jobs(?:\/[A-Za-z0-9-]+(?:\/cancel)?)?|opt-outs|installation\/status)$/.test(path)) throw new NotificationGatewayError('Đường dẫn không hợp lệ.','gateway_path_invalid');
  url.pathname=path;
  const raw=input===undefined?'':JSON.stringify(input), timestamp=String(Date.now()), nonce=crypto.randomUUID();
  // InstallationGuard uses SHA256(secret) as a UTF-8 hex string, not binary digest.
  const key=await crypto.subtle.importKey('raw',enc.encode(await sha(v.MF_CARE_CLIENT_SECRET!)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=hex(await crypto.subtle.sign('HMAC',key,enc.encode(`${method}\n${path}\n${timestamp}\n${nonce}\n${await sha(raw)}`)));
  let response:Response;
  try{response=await transport(url,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','x-care-client-id':v.MF_CARE_CLIENT_ID!,'x-care-timestamp':timestamp,'x-care-nonce':nonce,'x-care-signature':signature},...(method==='POST'?{body:raw}:{})});}
  catch{throw new NotificationGatewayError('Chưa rõ gateway đã nhận; chỉ thử lại cùng idempotency key.','gateway_uncertain',true);}
  if(!response.ok) throw new NotificationGatewayError(`Gateway trả mã ${response.status}.`,`gateway_http_${response.status}`,response.status===429||response.status>=500);
  const data=await response.json().catch(()=>null) as any;
  if(!data||typeof data!=='object') throw new NotificationGatewayError('Phản hồi gateway không hợp lệ.','gateway_response_invalid',true);
  return data;
}
const statuses=new Set(['QUEUED','PROCESSING','SENT','FAILED','CANCELLED','OPTED_OUT','ACCOUNT_RESTRICTED','RECIPIENT_NOT_FOUND']);
export async function submitCareJob(v:GatewayConfig,job:CareJob,transport:typeof fetch=fetch){
  const out=await careRequest(v,'POST','/api/v1/care-jobs',job,transport);
  if(out.status==='OPTED_OUT'&&out.accepted===false)return {id:'',status:'OPTED_OUT'};
  if(typeof out.id!=='string'||!/^[A-Za-z0-9-]+$/.test(out.id)||!statuses.has(out.status))throw new NotificationGatewayError('Phản hồi care-job không hợp lệ.','gateway_response_invalid',true);
  return {id:out.id as string,status:out.status as string};
}
export async function readCareJob(v:GatewayConfig,id:string){
  const out=await careRequest(v,'GET',`/api/v1/care-jobs/${id}`);
  if(out.id!==id||!statuses.has(out.status))throw new NotificationGatewayError('Trạng thái care-job không hợp lệ.','gateway_response_invalid',true);
  return out as {id:string;status:string;failureCode?:string;sentAt?:string};
}
export async function cancelCareJob(v:GatewayConfig,id:string){
  try { return await careRequest(v,'POST',`/api/v1/care-jobs/${id}/cancel`,{}); }
  catch(error) {
    if (!(error instanceof NotificationGatewayError) || error.code !== 'gateway_http_404') throw error;
    const job = await readCareJob(v,id);
    if (['QUEUED','PROCESSING'].includes(job.status)) throw error;
    return job;
  }
}
export async function optOutCareRecipient(v:GatewayConfig,phone:string){return careRequest(v,'POST','/api/v1/opt-outs',{phone,source:'M_FARM'});}
export async function sendNotification(v:GatewayConfig,input:{idempotencyKey:string;destination:unknown;message:string}){
  if(notificationSettings(v).mode!=='mock')throw new NotificationGatewayError('Gửi thật phải dùng care-job.','care_job_required');
  return {providerMessageId:`mock-${input.idempotencyKey}`};
}
