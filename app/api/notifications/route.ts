import { z } from "zod";
import {
  actor,
  admin,
  ApiError,
  body,
  checkOrigin,
  config,
  json,
  safe,
} from "@/lib/server";
import {
  notificationSnapshot,
  processOutbox,
  queueWeekly,
  saveNotificationChannel,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

function internalJob(req: Request) {
  const key = (config().MF_NOTIFICATION_JOB_KEY || "").trim();
  return !!key && req.headers.get("x-mf-notification-job-key") === key;
}

export const GET = (req: Request) =>
  safe(async () => {
    const a = await actor(req);
    admin(a);
    return json(await notificationSnapshot(a));
  });

export const POST = (req: Request) =>
  safe(async () => {
    const job = internalJob(req);
    if (!job) checkOrigin(req);
    const input = await body(req);
    const action = z.string().trim().min(1).max(60).parse(input.action);
    const a = job ? null : await actor(req);
    if (a) admin(a);
    const tenant = job
      ? "production"
      : a!.tenant;

    if (action === "setChannel") {
      if (!a)
        throw new ApiError(
          403,
          "Chỉ người dùng đã đăng nhập mới được cấu hình kênh.",
        );
      return json({ id: await saveNotificationChannel(a, input.data) });
    }
    if (action === "queueWeekly") {
      const result = await queueWeekly(
        tenant,
        input.start,
        input.end,
      );
      return json(result);
    }
    if (action === "process") {
      return json(await processOutbox(tenant, input.limit));
    }
    throw new ApiError(400, "Thao tác thông báo không hợp lệ.");
  });
