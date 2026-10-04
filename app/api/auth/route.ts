import { z } from "zod";
import {
  authFetch,
  accountRole,
  authReady,
  body,
  checkOrigin,
  config,
  cookie,
  json,
  rateLimit,
  safe,
  setCookie,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) =>
  safe(async () => {
    let user = null;
    let token = cookie(req, "mf_access");
    let refreshed: any = null;
    if (token && authReady()) {
      try {
        user = await authFetch("user", "GET", undefined, token);
      } catch {}
    }
    if (!user && authReady() && cookie(req, "mf_refresh")) {
      try {
        refreshed = await authFetch("token?grant_type=refresh_token", "POST", {
          refresh_token: cookie(req, "mf_refresh"),
        });
        token = refreshed.access_token;
        user = refreshed.user || (await authFetch("user", "GET", undefined, token));
      } catch {}
    }
    const role = user?.email_confirmed_at ? await accountRole(user.id,user.email || "") : "customer";
    const owner = role === "admin";
    const response = json({
      ready: authReady(),
      user: user
        ? {
            name: user.user_metadata?.name || "",
            email: user.email,
            phone: user.phone,
            email_verified: !!user.email_confirmed_at,
            phone_verified: !!user.phone_confirmed_at,
            is_owner: owner,
            is_system_admin: role === "system_admin",
            role,
          }
        : null,
    });
    if (refreshed?.access_token) {
      response.headers.append("Set-Cookie", setCookie(req, "mf_access", refreshed.access_token, refreshed.expires_in || 3600));
      if (refreshed.refresh_token)
        response.headers.append("Set-Cookie", setCookie(req, "mf_refresh", refreshed.refresh_token, 60 * 60 * 24 * 30));
    }
    return response;
  });
export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    const x = await body(req);
    if (x.action === "logout") {
      const r = json({ ok: true });
      r.headers.append("Set-Cookie", setCookie(req, "mf_access", "", 0));
      r.headers.append("Set-Cookie", setCookie(req, "mf_refresh", "", 0));
      r.headers.append("Set-Cookie", setCookie(req, "mf_demo", "", 0));
      return r;
    }
    await rateLimit(req);
    let result;
    switch (x.action) {
      case "sendEmail": {
        const email = z.string().email("Email không hợp lệ.").parse(x.email);
        const name = z
          .string()
          .trim()
          .min(2, "Điền họ và tên.")
          .max(100)
          .parse(x.name);
        await authFetch("otp", "POST", {
          email,
          create_user: true,
          data: { name },
        });
        return json({ sent: true });
      }
      case "verifyEmail": {
        const email = z.string().email().parse(x.email);
        const token = z
          .string()
          .regex(/^\d{6,8}$/, "Mã gồm 6–8 chữ số.")
          .parse(x.code);
        result = await authFetch("verify", "POST", {
          email,
          token,
          type: "email",
        });
        break;
      }
      case "sendPhone": {
        const phone = z
          .string()
          .regex(/^\+[1-9]\d{7,14}$/, "Nhập số điện thoại dạng +84…")
          .parse(x.phone);
        const token = cookie(req, "mf_access");
        const u = await authFetch("user", "GET", undefined, token);
        if (!u.email_confirmed_at)
          return json({ error: "Xác thực email trước." }, 403);
        await authFetch("user", "PUT", { phone }, token);
        return json({ sent: true });
      }
      case "verifyPhone": {
        const phone = z
          .string()
          .regex(/^\+[1-9]\d{7,14}$/)
          .parse(x.phone);
        const token = z
          .string()
          .regex(/^\d{6,8}$/)
          .parse(x.code);
        result = await authFetch(
          "verify",
          "POST",
          { phone, token, type: "phone_change" },
          cookie(req, "mf_access"),
        );
        break;
      }
      default:
        return json({ error: "Thao tác không hợp lệ." }, 400);
    }
    const r = json({ verified: true });
    if (result.access_token)
      r.headers.append(
        "Set-Cookie",
        setCookie(
          req,
          "mf_access",
          result.access_token,
          result.expires_in || 3600,
        ),
      );
    if (result.refresh_token)
      r.headers.append(
        "Set-Cookie",
        setCookie(req, "mf_refresh", result.refresh_token, 60 * 60 * 24 * 30),
      );
    r.headers.append("Set-Cookie", setCookie(req, "mf_demo", "", 0));
    return r;
  });
