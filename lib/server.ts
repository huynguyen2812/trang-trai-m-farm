import { env } from "cloudflare:workers";
import { z } from "zod";
import { samplePackages } from "./model";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const config = () => env as unknown as Record<string, string>;
export function db() {
  if (!env.DB)
    throw new ApiError(503, "Kho dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.");
  return env.DB;
}
export function media() {
  const bucket = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!bucket)
    throw new ApiError(503, "Kho ảnh chưa sẵn sàng. Vui lòng thử lại sau.");
  return bucket;
}
export const statement = (sql: string, ...values: unknown[]) =>
  db()
    .prepare(sql)
    .bind(...values);
export async function rows<T = any>(
  sql: string,
  ...values: unknown[]
): Promise<T[]> {
  const r = await statement(sql, ...values).all<T>();
  return r.results;
}
export async function first<T = any>(sql: string, ...values: unknown[]) {
  return statement(sql, ...values).first<T>();
}
export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
export function cookie(req: Request, name: string) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + "="))
      ?.slice(name.length + 1) || ""
  );
}
export const setCookie = (
  req: Request,
  name: string,
  value: string,
  seconds: number,
) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new ApiError(403, "Yêu cầu không hợp lệ. Hãy tải lại trang.");
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 20000)
    throw new ApiError(413, "Nội dung quá dài.");
  const raw = await req.text();
  if (raw.length > 20000) throw new ApiError(413, "Nội dung quá dài.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Dữ liệu không hợp lệ.");
  }
}
export async function safe(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError)
      return json(
        { error: e.issues[0]?.message || "Kiểm tra lại thông tin." },
        400,
      );
    console.error(
      "M FARM request failed",
      e instanceof Error ? e.message : "unknown",
    );
    return json(
      { error: "Không thể lưu hoặc tải dữ liệu. Vui lòng thử lại." },
      503,
    );
  }
}
export async function hash(s: string) {
  const a = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(a)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export const newId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
export const now = () => new Date().toISOString();
export async function rateLimit(req: Request) {
  const key = await hash(
    (req.headers.get("cf-connecting-ip") || "local") +
      Math.floor(Date.now() / 600000),
  );
  const row = await statement(
    "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    key,
    Date.now() + 600000,
  ).first<{ count: number }>();
  if ((row?.count || 0) > 20)
    throw new ApiError(429, "Bạn đã thử quá nhiều lần. Vui lòng chờ 10 phút.");
}
export function authReady() {
  return !!(config().SUPABASE_URL && config().SUPABASE_ANON_KEY);
}
export async function authFetch(
  path: string,
  method = "GET",
  data?: unknown,
  token?: string,
) {
  if (!authReady())
    throw new ApiError(
      503,
      "Chưa kết nối dịch vụ xác thực email và SMS. Bạn có thể dùng bản trải nghiệm mẫu.",
    );
  const c = config();
  const r = await fetch(
    `${c.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/${path}`,
    {
      method,
      headers: {
        apikey: c.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    },
  );
  const out = (await r.json()) as any;
  if (!r.ok) {
    if (r.status === 429)
      throw new ApiError(429, "Vui lòng chờ trước khi yêu cầu mã mới.");
    throw new ApiError(
      r.status === 401 || r.status === 403 ? 401 : 400,
      "Thông tin hoặc mã xác thực không hợp lệ, hết hạn hoặc dịch vụ gửi mã chưa sẵn sàng.",
    );
  }
  return out;
}
export type Actor = {
  tenant: string;
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  demo: boolean;
};
export async function actor(req: Request): Promise<Actor> {
  const demo = cookie(req, "mf_demo");
  if (demo) {
    const session = await first(
      "SELECT * FROM demo_sessions WHERE token_hash=? AND expires_at>?",
      await hash(demo),
      Date.now(),
    );
    if (session)
      return {
        tenant: session.tenant,
        id: session.role === "admin" ? "DEMO-ADMIN" : "KH-001",
        name:
          session.role === "admin"
            ? "Chủ trang trại (mẫu)"
            : "Nguyễn Minh Anh (mẫu)",
        email: "minhanh@example.com",
        role: session.role,
        demo: true,
      };
  }
  const token = cookie(req, "mf_access");
  if (!token) throw new ApiError(401, "Vui lòng đăng nhập để tiếp tục.");
  const u = await authFetch("user", "GET", undefined, token);
  const owner = config().OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = !!owner && u.email?.toLowerCase() === owner;
  if (!u.email_confirmed_at)
    throw new ApiError(403, "Bạn cần xác thực email.");
  if (!isOwner && (!u.phone_confirmed_at || !u.phone))
    throw new ApiError(403, "Bạn cần xác thực cả email và số điện thoại.");
  const role = isOwner ? "admin" : "customer";
  const a: Actor = {
    tenant: "production",
    id: u.id,
    name: u.user_metadata?.name || u.email,
    email: u.email,
    role,
    demo: false,
  };
  await statement(
    "INSERT INTO customers (tenant,id,name,email,phone,email_verified,phone_verified,created_at) VALUES (?,?,?,?,?,1,1,?) ON CONFLICT(tenant,id) DO UPDATE SET email=excluded.email,phone=excluded.phone,email_verified=1,phone_verified=1",
    a.tenant,
    a.id,
    a.name,
    u.email,
    u.phone || "",
    now(),
  ).run();
  return a;
}
export function admin(a: Actor) {
  if (a.role !== "admin")
    throw new ApiError(403, "Chỉ chủ trang trại có quyền thực hiện.");
}
export async function snapshot(a: Actor) {
  const customer = a.role === "customer";
  const values = customer ? [a.tenant, a.id] : [a.tenant];
  const [assets, packages, customers, orders, logs, log_images, requests] =
    await Promise.all([
      rows(
        `SELECT * FROM assets WHERE tenant=? ${customer ? "AND customer_id=?" : ""} ORDER BY id`,
        ...values,
      ),
      rows(
        "SELECT * FROM packages WHERE tenant=? ORDER BY kind,name",
        a.tenant,
      ),
      rows(
        `SELECT * FROM customers WHERE tenant=? ${customer ? "AND id=?" : ""} ORDER BY created_at DESC`,
        ...values,
      ),
      rows(
        `SELECT * FROM orders WHERE tenant=? ${customer ? "AND customer_id=?" : ""} ORDER BY created_at DESC`,
        ...values,
      ),
      rows(
        `SELECT l.* FROM logs l WHERE l.tenant=? ${customer ? "AND EXISTS (SELECT 1 FROM assets a WHERE a.tenant=l.tenant AND a.id=l.asset_id AND a.customer_id=?)" : ""} ORDER BY created_at DESC`,
        ...values,
      ),
      rows(
        `SELECT i.id,i.log_id,i.asset_id,i.file_name,i.byte_size,i.created_at FROM log_images i WHERE i.tenant=? ${customer ? "AND EXISTS (SELECT 1 FROM assets a WHERE a.tenant=i.tenant AND a.id=i.asset_id AND a.customer_id=?)" : ""} ORDER BY created_at,id`,
        ...values,
      ),
      rows(
        `SELECT * FROM requests WHERE tenant=? ${customer ? "AND customer_id=?" : ""} ORDER BY created_at DESC`,
        ...values,
      ),
    ]);
  return { actor: a, assets, packages, customers, orders, logs, log_images, requests };
}
export async function seedDemo(tenant: string) {
  const started = new Date(Date.now() - 47 * 86400000).toISOString();
  const expected = new Date(Date.now() + 73 * 86400000).toISOString();
  const qs = [];
  for (const p of samplePackages)
    qs.push(
      statement(
        "INSERT INTO packages (tenant,id,name,species,kind,price,days,description,benefits,active) VALUES (?,?,?,?,?,?,?,?,?,?)",
        tenant,
        p.id,
        p.name,
        p.species,
        p.kind,
        p.price,
        p.days,
        p.description,
        p.benefits,
        1,
      ),
    );
  for (const [id, name, email, phone] of [
    ["KH-001", "Nguyễn Minh Anh", "minhanh@example.com", "+84000000001"],
    ["KH-002", "Trần Hoàng Nam", "hoangnam@example.com", "+84000000002"],
  ])
    qs.push(
      statement(
        "INSERT INTO customers VALUES (?,?,?,?,?,1,1,?)",
        tenant,
        id,
        name,
        email,
        phone,
        started,
      ),
    );
  const assets = [
    [
      "GA-001",
      "Gà ta 001",
      "Gà ta",
      "animal",
      "Vườn thả A",
      "active",
      "healthy",
      39,
      "0,85 kg",
      started,
      expected,
      "KH-001",
      "PK-GA-01",
    ],
    [
      "OI-001",
      "Cây ổi 001",
      "Ổi",
      "plant",
      "Vườn cây B · Hàng 1",
      "active",
      "healthy",
      52,
      "Cao 1,4 m",
      started,
      expected,
      "KH-001",
      "PK-OI-01",
    ],
    [
      "GA-002",
      "Gà ta 002",
      "Gà ta",
      "animal",
      "Vườn thả A",
      "active",
      "attention",
      32,
      "0,72 kg",
      started,
      expected,
      "KH-002",
      "PK-GA-01",
    ],
    [
      "GA-003",
      "Gà ta 003",
      "Gà ta",
      "animal",
      "Vườn thả A",
      "available",
      "healthy",
      12,
      "0,32 kg",
      started,
      expected,
      null,
      null,
    ],
    [
      "GA-004",
      "Gà ta 004",
      "Gà ta",
      "animal",
      "Vườn thả A",
      "available",
      "healthy",
      10,
      "0,28 kg",
      started,
      expected,
      null,
      null,
    ],
    [
      "OI-002",
      "Cây ổi 002",
      "Ổi",
      "plant",
      "Vườn cây B · Hàng 2",
      "available",
      "healthy",
      18,
      "Cao 1,1 m",
      started,
      expected,
      null,
      null,
    ],
  ];
  for (const a of assets)
    qs.push(
      statement(
        "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        tenant,
        ...a,
      ),
    );
  for (const [idx, a] of assets.slice(0, 3).entries()) {
    const p = samplePackages.find((p) => p.id === a[12])!;
    qs.push(
      statement(
        "INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        tenant,
        `DH-00${idx + 1}`,
        a[0],
        a[11],
        p.id,
        p.name,
        p.price,
        p.days,
        p.benefits,
        "paid",
        started,
        expected,
      ),
    );
    qs.push(
      statement(
        "INSERT INTO logs VALUES (?,?,?,?,?,?,?,?,?)",
        tenant,
        `NK-00${idx + 1}`,
        a[0],
        a[3] === "plant"
          ? "Kiểm tra ra hoa, chăm tán"
          : "Cân định kỳ và kiểm tra sức khỏe",
        a[3] === "plant"
          ? "Lá xanh, cây đang ra đọt. Tưới nước và theo dõi sâu bệnh."
          : "Ghi nhận lượng ăn và cân nặng. Dữ liệu minh họa, không phải tình trạng của vật nuôi thật.",
        "growth",
        a[8],
        "",
        now(),
      ),
    );
  }
  await db().batch(qs);
}
const text = z
  .string()
  .trim()
  .min(1, "Vui lòng điền đầy đủ thông tin.")
  .max(200);
const day = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Ngày không hợp lệ.");
export const assetSchema = z.object({
  id: text,
  name: text,
  species: text,
  kind: z.enum(["animal", "plant"]),
  location: text,
  status: z.enum(["available", "reserved", "active", "ready", "closed"]),
  health: z.enum(["healthy", "attention", "treatment"]),
  progress: z.coerce.number().int().min(0).max(100),
  weight: z.string().max(80),
  started_at: day,
  expected_at: day,
});
export const packageSchema = z.object({
  id: text,
  name: text,
  species: text,
  kind: z.enum(["animal", "plant"]),
  price: z.coerce.number().int().min(1000).max(1000000000),
  days: z.coerce.number().int().min(1).max(3650),
  description: z.string().trim().min(1).max(2000),
  benefits: z.string().trim().min(1).max(3000),
  active: z.coerce.number().int().min(0).max(1),
});
export async function mutate(a: Actor, input: any) {
  const t = a.tenant;
  switch (input.action) {
    case "savePackage": {
      admin(a);
      const p = packageSchema.parse(input.data);
      await statement(
        "INSERT INTO packages VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant,id) DO UPDATE SET name=excluded.name,species=excluded.species,kind=excluded.kind,price=excluded.price,days=excluded.days,description=excluded.description,benefits=excluded.benefits,active=excluded.active",
        t,
        p.id,
        p.name,
        p.species,
        p.kind,
        p.price,
        p.days,
        p.description,
        p.benefits,
        p.active,
      ).run();
      return p.id;
    }
    case "saveAsset": {
      admin(a);
      const x = assetSchema.parse(input.data);
      if (Date.parse(x.expected_at) < Date.parse(x.started_at))
        throw new ApiError(400, "Ngày dự kiến phải sau ngày bắt đầu.");
      const old = await first(
        "SELECT * FROM assets WHERE tenant=? AND id=?",
        t,
        x.id,
      );
      if (old?.customer_id && x.status === "available")
        throw new ApiError(
          400,
          "Tài sản đã có khách nhận nuôi, không thể mở bán lại.",
        );
      if (!old?.customer_id && !["available"].includes(x.status))
        throw new ApiError(
          400,
          "Hãy phân bổ tài sản bằng đơn hàng trước khi đổi trạng thái.",
        );
      await statement(
        "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL) ON CONFLICT(tenant,id) DO UPDATE SET name=excluded.name,location=excluded.location,status=excluded.status,health=excluded.health,progress=excluded.progress,weight=excluded.weight,started_at=excluded.started_at,expected_at=excluded.expected_at",
        t,
        x.id,
        x.name,
        old?.species || x.species,
        old?.kind || x.kind,
        x.location,
        x.status,
        x.health,
        x.progress,
        x.weight,
        x.started_at,
        x.expected_at,
      ).run();
      return x.id;
    }
    case "saveCustomer": {
      admin(a);
      const x = z.object({ id: text, name: text }).parse(input.data);
      await statement(
        "UPDATE customers SET name=? WHERE tenant=? AND id=?",
        x.name,
        t,
        x.id,
      ).run();
      return x.id;
    }
    case "addLog": {
      admin(a);
      const x = z
        .object({
          asset_id: text,
          title: text,
          body: z.string().trim().min(1).max(5000),
          kind: z.enum(["growth", "food", "medicine", "fertilizer", "care"]),
          metric: z.string().max(100),
          image_url: z
            .string()
            .max(2000)
            .refine(
              (s) => !s || /^https:\/\//.test(s),
              "Ảnh phải là đường dẫn HTTPS.",
            ),
        })
        .parse(input.data);
      if (
        !(await first(
          "SELECT id FROM assets WHERE tenant=? AND id=?",
          t,
          x.asset_id,
        ))
      )
        throw new ApiError(404, "Không tìm thấy tài sản.");
      const id = newId("NK");
      await statement(
        "INSERT INTO logs VALUES (?,?,?,?,?,?,?,?,?)",
        t,
        id,
        x.asset_id,
        x.title,
        x.body,
        x.kind,
        x.metric,
        x.image_url,
        now(),
      ).run();
      return id;
    }
    case "purchase": {
      const x = z
        .object({
          asset_id: text,
          package_id: text,
          customer_id: z.string().optional(),
          expected_price: z.number().optional(),
          expected_days: z.number().optional(),
          accepted: z.literal(true, {
            errorMap: () => ({ message: "Bạn cần đồng ý với điều kiện gói." }),
          }),
        })
        .parse(input.data);
      const customer = a.role === "admin" ? x.customer_id : a.id;
      if (!customer) throw new ApiError(400, "Chọn khách hàng.");
      const c = await first(
        "SELECT * FROM customers WHERE tenant=? AND id=?",
        t,
        customer,
      );
      if (!c?.email_verified || !c?.phone_verified)
        throw new ApiError(400, "Khách cần xác thực email và điện thoại.");
      const p = await first(
        "SELECT * FROM packages WHERE tenant=? AND id=? AND active=1",
        t,
        x.package_id,
      );
      const asset = await first(
        "SELECT * FROM assets WHERE tenant=? AND id=? AND status=?",
        t,
        x.asset_id,
        "available",
      );
      if (!p || !asset || asset.species !== p.species || asset.kind !== p.kind)
        throw new ApiError(
          409,
          "Cây/con hoặc gói không còn phù hợp. Vui lòng tải lại.",
        );
      if (
        a.role === "customer" &&
        (x.expected_price !== p.price || x.expected_days !== p.days)
      )
        throw new ApiError(
          409,
          "Gói vừa thay đổi giá hoặc thời hạn. Hãy tải lại và xác nhận thông tin mới.",
        );
      const id = newId("DH");
      const start = now(),
        end = new Date(Date.now() + p.days * 86400000).toISOString();
      const terms = `${p.benefits}\nThời hạn: ${p.days} ngày. Giá gói: ${p.price} VND. Sản lượng thực tế phụ thuộc sinh trưởng. Mua lại chỉ khi hai bên thỏa thuận bằng văn bản; không cam kết lợi nhuận. Chưa bao gồm vận chuyển nếu không ghi trong gói.`;
      await db().batch([
        statement(
          "INSERT INTO orders (tenant,id,asset_id,customer_id,package_id,package_name,price,days,terms,status,created_at,expected_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM assets WHERE tenant=? AND id=? AND status=?)",
          t,
          id,
          x.asset_id,
          customer,
          p.id,
          p.name,
          p.price,
          p.days,
          terms,
          "awaiting_payment",
          start,
          end,
          t,
          x.asset_id,
          "available",
        ),
        statement(
          "UPDATE assets SET status=?,customer_id=?,package_id=?,started_at=?,expected_at=? WHERE tenant=? AND id=? AND status=? AND EXISTS (SELECT 1 FROM orders WHERE tenant=? AND id=?)",
          "reserved",
          customer,
          p.id,
          start,
          end,
          t,
          x.asset_id,
          "available",
          t,
          id,
        ),
      ]);
      if (
        !(await first("SELECT id FROM orders WHERE tenant=? AND id=?", t, id))
      )
        throw new ApiError(409, "Tài sản vừa được khách khác chọn.");
      return id;
    }
    case "confirmPayment": {
      admin(a);
      const id = text.parse(input.id);
      const o = await first(
        "SELECT * FROM orders WHERE tenant=? AND id=? AND status=?",
        t,
        id,
        "awaiting_payment",
      );
      if (!o)
        throw new ApiError(409, "Đơn không còn ở trạng thái chờ thanh toán.");
      await db().batch([
        statement(
          "UPDATE orders SET status=? WHERE tenant=? AND id=?",
          "paid",
          t,
          id,
        ),
        statement(
          "UPDATE assets SET status=? WHERE tenant=? AND id=? AND status=?",
          "active",
          t,
          o.asset_id,
          "reserved",
        ),
      ]);
      return id;
    }
    case "request": {
      if (a.role !== "customer")
        throw new ApiError(403, "Chức năng dành cho khách hàng.");
      const x = z
        .object({
          asset_id: text,
          kind: z.enum(["pickup", "buyback"]),
          note: z.string().max(2000),
        })
        .parse(input.data);
      const asset = await first(
        "SELECT * FROM assets WHERE tenant=? AND id=? AND customer_id=?",
        t,
        x.asset_id,
        a.id,
      );
      if (!asset || !["active", "ready"].includes(asset.status))
        throw new ApiError(400, "Tài sản chưa đủ điều kiện gửi yêu cầu.");
      if (
        await first(
          "SELECT id FROM requests WHERE tenant=? AND asset_id=? AND status IN (?,?)",
          t,
          x.asset_id,
          "pending",
          "approved",
        )
      )
        throw new ApiError(409, "Tài sản này đang có một yêu cầu chờ xử lý.");
      const id = newId("YC");
      await statement(
        "INSERT INTO requests VALUES (?,?,?,?,?,?,?,?)",
        t,
        id,
        x.asset_id,
        a.id,
        x.kind,
        x.note,
        "pending",
        now(),
      ).run();
      return id;
    }
    case "updateRequest": {
      admin(a);
      const x = z
        .object({ id: text, status: z.enum(["approved", "completed"]) })
        .parse(input.data);
      const r = await first(
        "SELECT * FROM requests WHERE tenant=? AND id=?",
        t,
        x.id,
      );
      if (
        !r ||
        r.status === "completed" ||
        (x.status === "completed" && r.status !== "approved")
      )
        throw new ApiError(409, "Trạng thái yêu cầu không phù hợp.");
      await db().batch([
        statement(
          "UPDATE requests SET status=? WHERE tenant=? AND id=?",
          x.status,
          t,
          x.id,
        ),
        ...(x.status === "completed"
          ? [
              statement(
                "UPDATE assets SET status=? WHERE tenant=? AND id=?",
                "closed",
                t,
                r.asset_id,
              ),
            ]
          : []),
      ]);
      return x.id;
    }
    default:
      throw new ApiError(400, "Thao tác không hợp lệ.");
  }
}
