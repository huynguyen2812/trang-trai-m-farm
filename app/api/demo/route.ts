import {
  body,
  checkOrigin,
  cookie,
  first,
  hash,
  json,
  rateLimit,
  safe,
  seedDemo,
  setCookie,
  statement,
} from "@/lib/server";
export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    await rateLimit(req);
    const input = await body(req);
    const role = input.role === "system_admin" ? "system_admin" : input.role === "admin" ? "admin" : "customer";
    const existing = cookie(req, "mf_demo");
    if (existing) {
      const s = await first(
        "SELECT * FROM demo_sessions WHERE token_hash=? AND expires_at>?",
        await hash(existing),
        Date.now(),
      );
      if (s) {
        await statement(
          "UPDATE demo_sessions SET role=? WHERE token_hash=?",
          role,
          await hash(existing),
        ).run();
        return json({ role });
      }
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tenant = "demo-" + crypto.randomUUID();
    await seedDemo(tenant);
    await statement(
      "INSERT INTO demo_sessions VALUES (?,?,?,?)",
      await hash(token),
      tenant,
      role,
      Date.now() + 604800000,
    ).run();
    return json({ role }, 200, {
      "Set-Cookie": setCookie(req, "mf_demo", token, 604800),
    });
  });
