import { z } from "zod";
import {
  admin,
  type Actor,
  ApiError,
  config,
  first,
  newId,
  now,
  rows,
  statement,
} from "./server";
import {
  NotificationGatewayError,
  notificationSettings,
  sendNotification,
  type CareJob,
  submitCareJob,
  readCareJob,
  cancelCareJob,
  optOutCareRecipient,
} from "./notification-gateway";

const CHANNEL = "zalo_crm";
const PROVIDER = "zalo-crm";
const MAX_MESSAGE_LENGTH = 1600;

type ChannelRow = {
  id: string;
  customer_id: string;
  channel: string;
  provider: string;
  status: string;
  account_ref: string;
  thread_ref: string;
  consent_source: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  updated_at: string;
};

type OutboxRow = {
  tenant: string;
  id: string;
  idempotency_key: string;
  customer_id: string;
  asset_id: string | null;
  event: string;
  channel: string;
  provider: string;
  status: string;
  payload: string;
  provider_message_id: string;
  error_code: string;
  attempt_count: number;
  available_at: string;
  created_at: string;
  sent_at: string | null;
};

const channelInput = z.object({
  customer_id: z.string().trim().min(1).max(200),
  channel: z.literal(CHANNEL),
  status: z.enum(["unknown", "granted", "withdrawn"]),
  account_ref: z.string().trim().max(200).default(""),
  thread_ref: z.string().trim().max(200).default(""),
  consent_source: z.string().trim().min(1).max(80).default("owner_manual"),
});

const dateInput = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Khoảng ngày không hợp lệ.");

function statusLabel(value: string) {
  return (
    {
      healthy: "khỏe mạnh",
      attention: "cần theo dõi",
      treatment: "đang điều trị",
    } as Record<string, string>
  )[value] || value;
}

function compact(value: unknown, max: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function mask(value: string) {
  if (!value) return "Chưa có";
  if (value.length <= 6) return "••••";
  return `••••${value.slice(-4)}`;
}

function messageForAsset(
  asset: any,
  log: any,
  customerName: string,
  prefix = "M FARM · Cập nhật mới",
) {
  const lines = [
    `${prefix}`,
    `Chào ${compact(customerName, 80)},`,
    `${compact(asset.name, 80)} (${asset.id}) hiện ${statusLabel(asset.health)}, tiến độ ${asset.progress}%.`,
    asset.weight ? `Chỉ số: ${compact(asset.weight, 100)}.` : "",
    log?.title ? `${compact(log.title, 120)}: ${compact(log.body, 620)}` : "",
    log?.metric ? `Ghi nhận: ${compact(log.metric, 120)}.` : "",
    "Bạn có thể mở tài khoản M FARM để xem ảnh và nhật ký đầy đủ.",
  ].filter(Boolean);
  return lines.join("\n").slice(0, MAX_MESSAGE_LENGTH);
}

function weeklyMessage(customerName: string, entries: any[], start: string, end: string) {
  const lines = [
    "M FARM · Bản tin chăm sóc tuần",
    `Chào ${compact(customerName, 80)}, cập nhật từ ${start.slice(0, 10)} đến ${end.slice(0, 10)}:`,
  ];
  for (const item of entries.slice(0, 12)) {
    lines.push(
      `• ${compact(item.name, 60)} (${item.asset_id}): ${statusLabel(item.health)}, ${compact(item.weight || "chưa có chỉ số", 80)}, ${compact(item.title, 100)} — ${compact(item.body, 180)}`,
    );
  }
  lines.push("Mở tài khoản M FARM để xem ảnh, vaccine và nhật ký chi tiết.");
  return lines.join("\n").slice(0, MAX_MESSAGE_LENGTH);
}

async function channelRows(tenant: string, customerId?: string) {
  return rows<ChannelRow>(
    `SELECT id,customer_id,channel,provider,status,account_ref,thread_ref,consent_source,granted_at,withdrawn_at,updated_at
       FROM customer_message_channels
      WHERE tenant=? AND channel=? ${customerId ? "AND customer_id=?" : ""}
      ORDER BY updated_at DESC`,
    ...(customerId ? [tenant, CHANNEL, customerId] : [tenant, CHANNEL]),
  );
}

export async function notificationSnapshot(a: Actor) {
  admin(a);
  const [channels, deliveries] = await Promise.all([
    channelRows(a.tenant),
    rows<OutboxRow>(
      `SELECT tenant,id,idempotency_key,customer_id,asset_id,event,channel,provider,status,
              provider_message_id,error_code,attempt_count,available_at,created_at,sent_at
         FROM notification_outbox
        WHERE tenant=?
        ORDER BY created_at DESC
        LIMIT 100`,
      a.tenant,
    ),
  ]);
  const settings = notificationSettings(a.demo ? { MF_NOTIFICATION_MODE: "mock" } : config());
  return {
    settings: {
      mode: settings.mode,
      gatewayConfigured: settings.gatewayConfigured,
      zns: "pending",
    },
    channels: channels.map((channel) => ({
      id: channel.id,
      customer_id: channel.customer_id,
      channel: channel.channel,
      provider: channel.provider,
      status: channel.status,
      account_ref: mask(channel.account_ref),
      thread_ref: mask(channel.thread_ref),
      consent_source: channel.consent_source,
      granted_at: channel.granted_at,
      withdrawn_at: channel.withdrawn_at,
      updated_at: channel.updated_at,
    })),
    deliveries: deliveries.map((delivery) => ({
      id: delivery.id,
      idempotency_key: delivery.idempotency_key,
      customer_id: delivery.customer_id,
      asset_id: delivery.asset_id,
      event: delivery.event,
      channel: delivery.channel,
      provider: delivery.provider,
      status: delivery.status,
      provider_message_id: delivery.provider_message_id,
      error_code: delivery.error_code,
      attempt_count: delivery.attempt_count,
      available_at: delivery.available_at,
      created_at: delivery.created_at,
      sent_at: delivery.sent_at,
    })),
  };
}

export async function saveNotificationChannel(a: Actor, input: unknown) {
  admin(a);
  const x = channelInput.parse(input);
  const customer = await first<{
    id: string;
    email_verified: number;
    phone_verified: number;
  }>(
    "SELECT id,email_verified,phone_verified FROM customers WHERE tenant=? AND id=?",
    a.tenant,
    x.customer_id,
  );
  if (!customer) throw new ApiError(404, "Không tìm thấy khách hàng.");
  const previous = await first<ChannelRow>("SELECT * FROM customer_message_channels WHERE tenant=? AND customer_id=? AND channel=? AND provider=?", a.tenant, x.customer_id, CHANNEL, PROVIDER);
  x.account_ref ||= previous?.account_ref || "";
  x.thread_ref ||= previous?.thread_ref || "";
  // Gateway routes the account and resolves an existing contact from the verified
  // phone. Historical account/thread columns are retained for migration safety.
  x.account_ref = "gateway-routing";
  x.thread_ref = x.customer_id;
  if (x.status === "granted" && (!customer.email_verified || !customer.phone_verified))
    throw new ApiError(
      400,
      "Khách hàng phải xác thực email và số điện thoại trước khi nhận tin.",
    );
  const existing = await first<{ id: string }>(
    "SELECT id FROM customer_message_channels WHERE tenant=? AND customer_id=? AND channel=? AND provider=?",
    a.tenant,
    x.customer_id,
    CHANNEL,
    PROVIDER,
  );
  const id = existing?.id || newId("CH");
  const timestamp = now();
  await statement(
    `INSERT INTO customer_message_channels
       (tenant,id,customer_id,channel,provider,status,account_ref,thread_ref,consent_source,granted_at,withdrawn_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(tenant,customer_id,channel,provider) DO UPDATE SET
       status=excluded.status,account_ref=excluded.account_ref,thread_ref=excluded.thread_ref,
       consent_source=excluded.consent_source,granted_at=excluded.granted_at,
       withdrawn_at=excluded.withdrawn_at,updated_at=excluded.updated_at`,
    a.tenant,
    id,
    x.customer_id,
    CHANNEL,
    PROVIDER,
    x.status,
    x.account_ref,
    x.thread_ref,
    x.consent_source,
    x.status === "granted" ? timestamp : null,
    x.status === "withdrawn" ? timestamp : null,
    timestamp,
  ).run();
  if (x.status !== "granted" && !a.demo && notificationSettings(config()).liveEnabled) {
    const recipient = await first<{phone:string}>("SELECT phone FROM customers WHERE tenant=? AND id=?",a.tenant,x.customer_id);
    try {
      if (recipient) await optOutCareRecipient(config(),recipient.phone);
      const jobs = await rows<{provider_message_id:string}>("SELECT provider_message_id FROM notification_outbox WHERE tenant=? AND customer_id=? AND status='gateway_queued'",a.tenant,x.customer_id);
      for (const job of jobs) await cancelCareJob(config(),job.provider_message_id);
    } catch {
      throw new ApiError(503,"Đã ngừng nhận tại M FARM nhưng chưa xác nhận hủy ở gateway. Hãy thử lưu lại; tin đang xử lý có thể đã gửi.");
    }
  }
  return id;
}

async function queueForChannel(
  tenant: string,
  channel: ChannelRow,
  event: string,
  assetId: string | null,
  idempotencyKey: string,
  payload: Record<string, unknown>,
) {
  const customer = await first<{name:string;phone:string}>("SELECT name,phone FROM customers WHERE tenant=? AND id=?",tenant,channel.customer_id);
  if (!customer) return false;
  const timestamp = now();
  const careJob: CareJob = {
    sourceProduct: "EXTERNAL_CONNECTOR",
    externalReferenceId: `mfarm:${assetId || channel.customer_id}`,
    eventType: event === "weekly_farm_update" ? "FARM_WEEKLY_UPDATE" : "FARM_ASSET_UPDATE",
    recipient: {name:customer.name,phone:customer.phone},
    templateCode: event === "weekly_farm_update" ? "MFARM_WEEKLY_V1" : "MFARM_ASSET_V1",
    templateVariables: {summary:String(payload.message || "")},
    scheduledAt:timestamp,
    idempotencyKey,
    consentStatus:"GRANTED",
  };
  const result = await statement(
    `INSERT INTO notification_outbox
       (tenant,id,idempotency_key,customer_id,asset_id,event,channel,provider,status,payload,provider_message_id,error_code,attempt_count,available_at,created_at,sent_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(tenant,idempotency_key) DO NOTHING`,
    tenant,
    newId("MSG"),
    idempotencyKey,
    channel.customer_id,
    assetId,
    event,
    channel.channel,
    channel.provider,
    "queued",
    JSON.stringify({...payload,careJob}),
    "",
    "",
    0,
    now(),
    now(),
    null,
  ).run();
  return Number(result.meta.changes || 0) > 0;
}

/** Queue one update automatically after a new farm log is written. */
export async function queueAssetUpdate(
  tenant: string,
  assetId: string,
  logId: string,
  event = "asset_update",
) {
  const asset = await first<any>(
    `SELECT a.*,c.name AS customer_name
       FROM assets a LEFT JOIN customers c ON c.tenant=a.tenant AND c.id=a.customer_id
      WHERE a.tenant=? AND a.id=?`,
    tenant,
    assetId,
  );
  if (!asset?.customer_id) return { queued: 0, skipped: 1, reason: "no_customer" };
  const log = await first<any>(
    "SELECT id,title,body,metric,created_at FROM logs WHERE tenant=? AND id=? AND asset_id=?",
    tenant,
    logId,
    assetId,
  );
  if (!log) return { queued: 0, skipped: 1, reason: "no_log" };
  const channels = (await channelRows(tenant, asset.customer_id)).filter(
    (channel) =>
      channel.status === "granted" && channel.account_ref && channel.thread_ref,
  );
  let queued = 0;
  for (const channel of channels) {
    const idempotencyKey = `${event}:${logId}:${channel.id}`;
    if (
      await queueForChannel(tenant, channel, event, assetId, idempotencyKey, {
        destination: {
          accountRef: channel.account_ref,
          threadRef: channel.thread_ref,
        },
        message: messageForAsset(asset, log, asset.customer_name),
        logId,
        consentVersion: channel.updated_at,
      })
    )
      queued++;
  }
  return {
    queued,
    skipped: channels.length ? 0 : 1,
    reason: channels.length ? undefined : "no_granted_channel",
  };
}

export async function queueWeekly(
  tenant: string,
  startValue?: string,
  endValue?: string,
) {
  const end = endValue ? new Date(dateInput.parse(endValue)).toISOString() : now();
  const start = startValue
    ? new Date(dateInput.parse(startValue)).toISOString()
    : new Date(Date.parse(end) - 7 * 86400000).toISOString();
  if (Date.parse(start) >= Date.parse(end))
    throw new ApiError(400, "Ngày bắt đầu phải trước ngày kết thúc.");
  const channels = (await channelRows(tenant)).filter(
    (channel) =>
      channel.status === "granted" && channel.account_ref && channel.thread_ref,
  );
  let queued = 0;
  let skipped = 0;
  for (const channel of channels) {
    const customer = await first<{ name: string }>(
      "SELECT name FROM customers WHERE tenant=? AND id=?",
      tenant,
      channel.customer_id,
    );
    const entries = await rows<any>(
      `SELECT a.id AS asset_id,a.name,a.health,a.weight,a.progress,l.title,l.body,l.metric,l.created_at
         FROM assets a JOIN logs l ON l.tenant=a.tenant AND l.asset_id=a.id
        WHERE a.tenant=? AND a.customer_id=? AND l.created_at>=? AND l.created_at<?
          AND l.created_at=(SELECT MAX(l2.created_at) FROM logs l2 WHERE l2.tenant=l.tenant AND l2.asset_id=l.asset_id AND l2.created_at>=? AND l2.created_at<?)
        ORDER BY l.created_at DESC
        LIMIT 20`,
      tenant,
      channel.customer_id,
      start,
      end,
      start,
      end,
    );
    if (!customer || !entries.length) {
      skipped++;
      continue;
    }
    const week = new Date(Date.parse(end) + 7 * 3600000);
    week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
    const periodKey = week.toISOString().slice(0, 10);
    const idempotencyKey = `weekly:${channel.customer_id}:${periodKey}:${channel.id}`;
    if (
      await queueForChannel(tenant, channel, "weekly_farm_update", null, idempotencyKey, {
        destination: {
          accountRef: channel.account_ref,
          threadRef: channel.thread_ref,
        },
        message: weeklyMessage(customer.name, entries, start, end),
        assetIds: entries.map(item => item.asset_id),
        period: { start, end },
        consentVersion: channel.updated_at,
      })
    )
      queued++;
  }
  return { queued, skipped, start, end };
}

export async function processOutbox(tenant: string, limitValue?: number) {
  const limit = z.number().int().min(1).max(50).parse(limitValue ?? 20);
  const settings = tenant.startsWith("demo-") ? { MF_NOTIFICATION_MODE: "mock" } : config();
  const cfg = notificationSettings(settings);
  const live = cfg.mode === "customer-care-gateway" && cfg.liveEnabled && cfg.gatewayConfigured;
  if (cfg.mode !== "mock" && !live)
    throw new ApiError(503, "Chưa bật kết nối gateway. Hàng đợi được giữ nguyên.");
  // A crashed submission can safely replay the identical immutable care-job.
  await statement("UPDATE notification_outbox SET status='queued' WHERE tenant=? AND status='sending' AND available_at<?",tenant,now()).run();
  if (live) {
    const submitted = await rows<OutboxRow>("SELECT * FROM notification_outbox WHERE tenant=? AND status='gateway_queued' ORDER BY created_at LIMIT ?",tenant,limit);
    for (const item of submitted) {
      const payload = JSON.parse(item.payload);
      try {
        const channel = (await channelRows(tenant,item.customer_id)).find(c=>c.provider===item.provider);
        let eligible = channel?.status === "granted" && channel.updated_at === payload.consentVersion;
        const customer = await first<any>("SELECT c.*,COALESCE(a.suspended,0) AS suspended FROM customers c LEFT JOIN account_access a ON a.tenant=c.tenant AND a.user_id=c.id WHERE c.tenant=? AND c.id=?",tenant,item.customer_id);
        eligible = eligible && !!customer?.email_verified && !!customer?.phone_verified && !customer?.suspended && customer?.phone === payload.careJob?.recipient.phone;
        for (const id of item.asset_id ? [item.asset_id] : payload.assetIds || []) if (!await first("SELECT id FROM assets WHERE tenant=? AND id=? AND customer_id=?",tenant,id,item.customer_id)) eligible=false;
        if (!eligible) {
          const cancellation = await cancelCareJob(settings,item.provider_message_id);
          await statement("UPDATE notification_outbox SET status=?,error_code=? WHERE tenant=? AND id=?",cancellation.status === "SENT" ? "sent" : "cancelled",cancellation.status === "SENT" ? "sent_before_cancellation" : "eligibility_changed",tenant,item.id).run();
          continue;
        }
        const job = await readCareJob(settings,item.provider_message_id);
        const status = job.status === "SENT" ? "sent" : ["QUEUED","PROCESSING"].includes(job.status) ? "gateway_queued" : ["CANCELLED","OPTED_OUT"].includes(job.status) ? "cancelled" : "failed";
        await statement("UPDATE notification_outbox SET status=?,error_code=?,sent_at=? WHERE tenant=? AND id=?",status,job.failureCode || "",job.sentAt || null,tenant,item.id).run();
      } catch (error) {
        await statement("UPDATE notification_outbox SET error_code=? WHERE tenant=? AND id=?",error instanceof NotificationGatewayError ? error.code : "gateway_sync_error",tenant,item.id).run();
      }
    }
  }
  const pending = await rows<OutboxRow>(
    `SELECT * FROM notification_outbox
      WHERE tenant=? AND status='queued' AND available_at<=?
      ORDER BY created_at ASC LIMIT ?`,
    tenant,
    now(),
    limit,
  );
  const result = { sent: 0, retried: 0, failed: 0, skipped: 0 };
  for (const item of pending) {
    const claim = await statement(
      "UPDATE notification_outbox SET status='sending',attempt_count=attempt_count+1,available_at=? WHERE tenant=? AND id=? AND status='queued'",
      new Date(Date.now()+5*60000).toISOString(),
      tenant,
      item.id,
    ).run();
    if (!Number(claim.meta.changes || 0)) {
      result.skipped++;
      continue;
    }
    const attempt = Number(item.attempt_count || 0) + 1;
    try {
      const payload = JSON.parse(item.payload) as {
        destination: { accountRef: string; threadRef: string };
        message: string;
        assetIds?: string[];
        consentVersion?: string;
        careJob?: CareJob;
      };
      const channel = (await channelRows(tenant, item.customer_id)).find(c => c.provider === item.provider);
      const customer = await first<any>("SELECT c.phone,c.email_verified,c.phone_verified,COALESCE(a.suspended,0) AS suspended FROM customers c LEFT JOIN account_access a ON a.tenant=c.tenant AND a.user_id=c.id WHERE c.tenant=? AND c.id=?", tenant, item.customer_id);
      let eligible = !!channel && channel.status === "granted" && channel.updated_at === payload.consentVersion && channel.account_ref === payload.destination.accountRef && channel.thread_ref === payload.destination.threadRef && !!customer?.email_verified && !!customer?.phone_verified && !customer?.suspended;
      for (const assetId of item.asset_id ? [item.asset_id] : payload.assetIds || []) {
        if (!await first("SELECT id FROM assets WHERE tenant=? AND id=? AND customer_id=?", tenant, assetId, item.customer_id)) eligible = false;
      }
      if (!eligible) {
        if (live && item.attempt_count > 0 && payload.careJob) await optOutCareRecipient(settings,payload.careJob.recipient.phone);
        await statement("UPDATE notification_outbox SET status='cancelled',error_code='eligibility_changed' WHERE tenant=? AND id=?", tenant, item.id).run();
        result.skipped++;
        continue;
      }
      if (live) {
        if (!payload.careJob || payload.careJob.recipient.phone !== customer.phone) throw new NotificationGatewayError("Cần tạo lại bản tin theo hợp đồng mới.","care_job_snapshot_invalid");
        const job = await submitCareJob(settings,payload.careJob);
        const status = job.status === "SENT" ? "sent" : ["QUEUED","PROCESSING"].includes(job.status) ? "gateway_queued" : ["CANCELLED","OPTED_OUT"].includes(job.status) ? "cancelled" : "failed";
        await statement("UPDATE notification_outbox SET status=?,provider_message_id=?,error_code='' WHERE tenant=? AND id=?",status,job.id,tenant,item.id).run();
        if (status === "sent") result.sent++; else result.skipped++;
        continue;
      }
      const sent = await sendNotification(settings, {
        idempotencyKey: item.idempotency_key,
        destination: payload.destination,
        message: payload.message,
      });
      await statement(
        "UPDATE notification_outbox SET status='simulated',provider_message_id=?,error_code='',sent_at=? WHERE tenant=? AND id=?",
        sent.providerMessageId,
        now(),
        tenant,
        item.id,
      ).run();
      result.sent++;
    } catch (error) {
      const gatewayError =
        error instanceof NotificationGatewayError
          ? error
          : new NotificationGatewayError("Không thể gửi tin.", "gateway_error", true);
      const retry = gatewayError.retryable && attempt < 4;
      const next = new Date(Date.now() + Math.min(60, 2 ** attempt * 5) * 60000).toISOString();
      await statement(
        `UPDATE notification_outbox
            SET status=?,error_code=?,available_at=?
          WHERE tenant=? AND id=?`,
        retry ? "queued" : "failed",
        gatewayError.code,
        retry ? next : now(),
        tenant,
        item.id,
      ).run();
      if (retry) result.retried++;
      else result.failed++;
    }
  }
  return result;
}
