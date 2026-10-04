import { z } from "zod";
import {
  actor,
  ApiError,
  body,
  checkOrigin,
  config,
  db,
  first,
  json,
  newId,
  now,
  rows,
  safe,
  statement,
} from "@/lib/server";

function rootEmail(email: string) {
  return (config().SYSTEM_ADMIN_EMAILS || "")
    .split(",")
    .some((e) => e.trim().toLowerCase() === email.toLowerCase());
}
export const dynamic = "force-dynamic";
export const GET = (req: Request) =>
  safe(async () => {
    const a = await actor(req);
    if (a.role !== "system_admin")
      throw new ApiError(403, "Chỉ admin hệ thống có quyền truy cập.");
    const users = await rows<{
      id: string;
      name: string;
      email: string;
      phone: string;
      email_verified: number;
      phone_verified: number;
      role: string | null;
      suspended: number | null;
    }>(
      "SELECT c.*, u.role, u.suspended FROM customers c LEFT JOIN account_access u ON u.tenant=c.tenant AND u.user_id=c.id WHERE c.tenant=? ORDER BY c.created_at DESC",
      a.tenant,
    );
    return json({
      actor: a,
      users: users.map((u) => ({
        ...u,
        protected: rootEmail(u.email) || u.id === a.id,
        role: rootEmail(u.email)
          ? "system_admin"
          : u.role ||
            (u.email.toLowerCase() ===
            (config().OWNER_EMAIL || "").trim().toLowerCase()
              ? "admin"
              : "customer"),
        suspended: !!u.suspended,
      })),
      audit: await rows(
        "SELECT * FROM access_audit WHERE tenant=? ORDER BY created_at DESC LIMIT 100",
        a.tenant,
      ),
    });
  });
export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    const a = await actor(req);
    if (a.role !== "system_admin")
      throw new ApiError(
        403,
        "Chỉ admin hệ thống có quyền thay đổi tài khoản.",
      );
    const x = z
      .object({
        user_id: z.string().min(1).max(200),
        role: z.enum(["admin", "customer"]),
        suspended: z.boolean(),
        reason: z
          .string()
          .trim()
          .min(5, "Ghi lý do ít nhất 5 ký tự.")
          .max(1000),
      })
      .parse(await body(req));
    const user = await first<{
      email: string;
      email_verified: number;
      phone_verified: number;
    }>(
      "SELECT email,email_verified,phone_verified FROM customers WHERE tenant=? AND id=?",
      a.tenant,
      x.user_id,
    );
    if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");
    if (x.user_id === a.id || rootEmail(user.email))
      throw new ApiError(
        403,
        "Không sửa tài khoản admin hệ thống tại màn này.",
      );
    if (!user.email_verified)
      throw new ApiError(400, "Tài khoản phải xác thực email trước.");
    const before = await first(
      "SELECT role,suspended FROM account_access WHERE tenant=? AND user_id=?",
      a.tenant,
      x.user_id,
    );
    await db().batch([
      statement(
        "INSERT INTO account_access (tenant,user_id,role,suspended,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(tenant,user_id) DO UPDATE SET role=excluded.role,suspended=excluded.suspended,updated_at=excluded.updated_at",
        a.tenant,
        x.user_id,
        x.role,
        Number(x.suspended),
        now(),
      ),
      statement(
        "INSERT INTO access_audit (tenant,id,actor_id,target_id,before_state,after_state,reason,created_at) VALUES (?,?,?,?,?,?,?,?)",
        a.tenant,
        newId("AUD"),
        a.id,
        x.user_id,
        JSON.stringify(
          before || {
            role:
              user.email.toLowerCase() ===
              (config().OWNER_EMAIL || "").trim().toLowerCase()
                ? "admin"
                : "customer",
            suspended: 0,
          },
        ),
        JSON.stringify({ role: x.role, suspended: x.suspended }),
        x.reason,
        now(),
      ),
    ]);
    return json({ ok: true });
  });
