import { z } from "zod";
import {
  actor,
  type Actor,
  ApiError,
  authReady,
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

function systemAdminEmails() {
  return (config().SYSTEM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
/** System admin emails only grant protection in the real tenant; demo tenants never inherit them. */
function rootEmail(tenant: string, email: string) {
  return (
    tenant === "production" &&
    !!email &&
    systemAdminEmails().includes(email.trim().toLowerCase())
  );
}
function ownerEmail(tenant: string, email: string) {
  const owner = (config().OWNER_EMAIL || "").trim().toLowerCase();
  return tenant === "production" && !!owner && email.trim().toLowerCase() === owner;
}
function defaultRole(tenant: string, email: string) {
  return ownerEmail(tenant, email) ? "admin" : "customer";
}
function requireSystemAdmin(a: Actor, message: string) {
  if (a.role !== "system_admin") throw new ApiError(403, message);
}
async function count(sql: string, tenant: string) {
  const r = await first<{ n: number }>(sql, tenant);
  return Number(r?.n || 0);
}

export const dynamic = "force-dynamic";
export const GET = (req: Request) =>
  safe(async () => {
    const a = await actor(req);
    requireSystemAdmin(a, "Chỉ admin hệ thống có quyền truy cập.");
    const [users, audit, assets, orders, packages, images] = await Promise.all([
      rows<{
        id: string;
        name: string;
        email: string;
        email_verified: number;
        phone_verified: number;
        created_at: string;
        role: string | null;
        suspended: number | null;
      }>(
        "SELECT c.id,c.name,c.email,c.email_verified,c.phone_verified,c.created_at,u.role,u.suspended FROM customers c LEFT JOIN account_access u ON u.tenant=c.tenant AND u.user_id=c.id WHERE c.tenant=? ORDER BY c.created_at DESC",
        a.tenant,
      ),
      rows(
        "SELECT id,actor_id,target_id,before_state,after_state,reason,created_at FROM access_audit WHERE tenant=? ORDER BY created_at DESC LIMIT 100",
        a.tenant,
      ),
      count("SELECT COUNT(*) AS n FROM assets WHERE tenant=?", a.tenant),
      count("SELECT COUNT(*) AS n FROM orders WHERE tenant=?", a.tenant),
      count(
        "SELECT COUNT(*) AS n FROM packages WHERE tenant=? AND active=1",
        a.tenant,
      ),
      count("SELECT COUNT(*) AS n FROM log_images WHERE tenant=?", a.tenant),
    ]);
    return json({
      // Only non-sensitive actor fields; tenant id and email stay server-side.
      actor: { id: a.id, name: a.name, role: a.role, demo: a.demo },
      users: users.map((u) => {
        const root = rootEmail(a.tenant, u.email);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          email_verified: u.email_verified,
          phone_verified: u.phone_verified,
          created_at: u.created_at,
          protected: root || u.id === a.id,
          role: root ? "system_admin" : u.role || defaultRole(a.tenant, u.email),
          suspended: !!u.suspended,
        };
      }),
      audit,
      overview: { assets, orders, packages, images },
      // Boolean configuration status only. Never return the configured values.
      connections: {
        auth: authReady(),
        owner: !!(config().OWNER_EMAIL || "").trim(),
        systemAdmin: systemAdminEmails().length > 0,
        zns: false,
      },
    });
  });
export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    const a = await actor(req);
    requireSystemAdmin(a, "Chỉ admin hệ thống có quyền thay đổi tài khoản.");
    const x = z
      .object({
        user_id: z.string().min(1).max(200),
        role: z.enum(["admin", "customer"], {
          errorMap: () => ({ message: "Vai trò không hợp lệ." }),
        }),
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
    if (x.user_id === a.id || rootEmail(a.tenant, user.email))
      throw new ApiError(
        403,
        "Không sửa tài khoản admin hệ thống tại màn này.",
      );
    if (!user.email_verified)
      throw new ApiError(400, "Tài khoản phải xác thực email trước.");
    const stored = await first<{ role: string; suspended: number }>(
      "SELECT role,suspended FROM account_access WHERE tenant=? AND user_id=?",
      a.tenant,
      x.user_id,
    );
    const before = {
      role: stored?.role || defaultRole(a.tenant, user.email),
      suspended: !!stored?.suspended,
    };
    const after = { role: x.role, suspended: x.suspended };
    if (before.role === after.role && before.suspended === after.suspended)
      throw new ApiError(400, "Không có thay đổi để lưu.");
    // Access change and its audit record are written in one D1 batch (transaction).
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
        JSON.stringify(before),
        JSON.stringify(after),
        x.reason,
        now(),
      ),
    ]);
    return json({ ok: true, before, after });
  });
