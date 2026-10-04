# Session, Auth, and Access Control Review

- **Target Workspace**: `D:\Codex\M FARM-antigravity`
- **Scope**: Read-only audit of authentication and session lifecycle (`app/api/auth/route.ts`, `lib/server.ts`, `app/api/system-admin/route.ts`, `app/account-ui.tsx`, `db/schema.ts`).
- **Date**: 2026-10-04 (Revised following Codex review)

---

## 1. Concrete Local Findings (Source References)

### 1.1 Logout Lifecycle
- **Source**: `app/api/auth/route.ts` (lines 63–75), `lib/server.ts` (lines 150–151)
- **Code**:
  ```ts
  if (x.action === "logout") {
    const token = cookie(req, "mf_access");
    if (token && authReady()) {
      try {
        await authFetch("logout?scope=local", "POST", undefined, token);
      } catch {}
    }
    const r = json({ ok: true });
    r.headers.append("Set-Cookie", setCookie(req, "mf_access", "", 0));
    r.headers.append("Set-Cookie", setCookie(req, "mf_refresh", "", 0));
    r.headers.append("Set-Cookie", setCookie(req, "mf_demo", "", 0));
    return r;
  }
  ```
- **Confirmed Implementation & Local Facts**:
  1. For real authenticated sessions (`mf_access` token present and `authReady()` is true), a best-effort HTTP POST request is dispatched to Supabase GoTrue `logout?scope=local` with the Bearer access token via `authFetch`.
  2. The upstream call is wrapped in `try/catch` and swallows any upstream errors. No tokens or upstream error details are exposed in the HTTP response or logs.
  3. Upstream call is strictly skipped for demo-only logouts (`mf_demo` without `mf_access`) or when no real access token exists.
  4. Local cookie clearing (`Max-Age=0` for `mf_access`, `mf_refresh`, `mf_demo`) is **always executed** regardless of whether the upstream call succeeds, fails, or is skipped.
  5. `authFetch` in `lib/server.ts` safely handles HTTP 204 No Content empty responses, returning `null` without throwing a JSON parsing error.
- **Unverified Status (Requires Real Supabase Project Verification)**:
  - Provider-side refresh-token invalidation remains unverified without a live Supabase project. Whether Supabase GoTrue `POST /auth/v1/logout?scope=local` under the anon key revokes the corresponding refresh token or requires specific GoTrue configuration remains subject to live provider testing. No service-role key is used or added.

### 1.2 Session Token Refresh Lifecycle
- **Source**: `app/api/auth/route.ts` (lines 18–34, 52–56), `lib/server.ts` (lines 202–205), `app/account-ui.tsx` (lines 24–33)
- **Local Facts & Clarifications**:
  1. Cookie `Max-Age`:
     - In `setCookie(req, "mf_access", ..., refreshed.expires_in || 3600)`: 1 hour default browser lifetime.
     - In `setCookie(req, "mf_refresh", ..., 60 * 60 * 24 * 30)`: 30 days browser cookie lifetime.
     - **Important Fact**: The `Max-Age` header value (30 days) is solely a local client storage directive. It is **NOT** evidence of the actual refresh-token lifetime or rotation policy configured within Supabase GoTrue.
  2. Refresh Mechanism:
     - `GET /api/auth` attempts `authFetch("token?grant_type=refresh_token", "POST", { refresh_token })` when `mf_access` fails and `mf_refresh` is present.
     - `lib/server.ts:actor(req)` only reads `mf_access` and calls `authFetch("user", "GET", undefined, token)`. If invalid/expired, it throws HTTP 401. It does not attempt refresh.
     - `app/account-ui.tsx:api()` deliberately intercepts 401 on data routes, calls `GET /api/auth` to execute token refresh and cookie update, and retries the original request once.
- **Architectural Evaluation**:
  - The frontend retry pattern is a deliberate design choice that decouples read/write business APIs from cookie mutation and avoids complex response cookie propagation. It is not in itself a security vulnerability.
  - Adding automatic refresh inside server-side `actor()` is explicitly **not recommended** at this time without an explicit design for concurrent request handling (race conditions when multiple parallel calls trigger refresh) and cookie header propagation through Next.js / Cloudflare Worker route boundaries.

### 1.3 Account Suspension Lifecycle
- **Source**: `lib/server.ts` (lines 169–174, 205), `app/api/system-admin/route.ts` (lines 113–178), `db/schema.ts` (line 196)
- **Confirmed Local Finding**:
  1. In `accountRole(userId, email, tenant)`:
     ```ts
     const access = await first<{ role: "admin" | "customer"; suspended: number }>(
       "SELECT role,suspended FROM account_access WHERE tenant=? AND user_id=?",
       tenant,
       userId
     );
     if (access?.suspended)
       throw new ApiError(403, "Tài khoản đã bị khóa truy cập. Vui lòng liên hệ quản trị hệ thống.");
     ```
  2. In `actor(req)`:
     - Calls `const role = await accountRole(u.id, u.email || "");` on every non-demo request.
  3. In `GET /api/auth`:
     - Calls `accountRole()`, throwing 403 on suspended accounts.
  4. In `POST /api/system-admin`:
     - Sets `account_access.suspended` to `1` and appends an audit row to `access_audit` in a single D1 batch transaction.
- **Assessment**:
  - **Local suspension is instantaneous and strictly enforced** across all M FARM application routes querying D1 on every incoming request.
  - Suspension is recorded strictly in Cloudflare D1. No notification, session teardown, or administrative lock is sent to upstream Supabase Auth.

---

## 2. Upstream Supabase APIs: Local Facts vs Items Requiring Official Verification

### Local Facts in Codebase
- The backend configuration only provisions `SUPABASE_URL` and `SUPABASE_ANON_KEY` (`lib/server.ts` lines 124–125, 143).
- `SUPABASE_SERVICE_ROLE_KEY` is not present in `config()`.
- Endpoints currently implemented:
  - `POST /auth/v1/otp` (`email`, `create_user`, `data`)
  - `POST /auth/v1/verify` (`email`/`phone`, `token`, `type`)
  - `GET /auth/v1/user` (with Bearer token)
  - `PUT /auth/v1/user` (with Bearer token)
  - `POST /auth/v1/token?grant_type=refresh_token` (`refresh_token`)
  - `POST /auth/v1/logout?scope=local` (with Bearer token, best-effort on real session logout; safely accepts 204 No Content)

### Items Requiring Official Verification (GoTrue API Specifications)
1. **Logout Revocation**:
   - Does GoTrue support an anon-key endpoint (e.g. `POST /auth/v1/logout` with Bearer access token) that actively revokes the refresh token belonging to the current session?
   - What headers and payload are expected, and does it reject if the access token is already expired?
2. **Refresh Token Expiry & Reuse Detection**:
   - What is the provider-side TTL of refresh tokens in the active Supabase project?
   - Is refresh token rotation enabled (which invalidates prior refresh tokens upon each rotation)?
3. **Administrative User Suspension / Sign-Out**:
   - Can user sessions be revoked administratively without `SUPABASE_SERVICE_ROLE_KEY`? (Standard GoTrue documentation indicates administrative revocation requires the service role key).
   - If service role key is unavailable by design, all administrative revocation must remain mediated by local D1 state.
4. **Session Metadata**:
   - Does GoTrue return a stable, session-specific identifier (`session_id`) in JWT claims or the user object that could be tracked individually in D1?

---

## 3. Session Revocation Analysis & Rejected Approaches

### 3.1 Rejected Revocation Mechanisms (Marked Not Implementation-Ready)
1. **User Profile Timestamp (`user.last_sign_in_at`) [REJECTED]**:
   - *Reason*: `last_sign_in_at` is an account-level attribute on the Supabase user profile. It updates on any login across any device or browser. Using it as a revocation boundary would erroneously invalidate all concurrent sessions whenever any device signs in, while failing to identify individual revoked sessions.
2. **JWT Issued-At Timestamp (`iat`) Epoch [REJECTED]**:
   - *Reason*: When an access token expires and is refreshed via `token?grant_type=refresh_token`, the newly issued JWT receives a fresh `iat`. An `iat`-based timestamp check cannot enforce the revocation of an original session because refreshing produces a new `iat` that bypasses the epoch.
3. **Server-Side Token Refresh in `actor()` [REJECTED / DEFERRED]**:
   - *Reason*: Invoking refresh inside the server-side `actor()` helper introduces concurrency race conditions when multiple parallel HTTP requests arrive with an expired access token, and introduces complex response cookie propagation across route handlers. The existing frontend 401-retry loop in `account-ui.tsx` is deliberate and should remain.

### 3.2 Architectural Evaluation of Options

- **Option A (Best-Effort Upstream Logout Call [IMPLEMENTED - Upstream Invalidation Unverified])**:
  - Implemented in `app/api/auth/route.ts` and `lib/server.ts`:
    - When `mf_access` is present and `authReady()` is true, dispatches `POST /auth/v1/logout?scope=local` with Bearer token.
    - Wrapped in `try/catch` to ensure failures never block local cookie clearance or expose error details.
    - `authFetch` handles HTTP 204 No Content empty responses safely without JSON parsing failure.
    - Demo-only sessions and sessions without real access tokens bypass upstream calls.
    - **Remains Unverified**: Whether this call actually invalidates the refresh token on the Supabase server side requires testing with a live Supabase project. No service-role key is added.
- **Option B (Local D1 Session Tracking, High Control)**:
  - If true per-session revocation is required locally without relying on GoTrue internals:
  - Generate an application-level opaque session token or session ID in D1 on login verification, set it in an HTTP-only cookie, and validate it against D1 in `actor()`. Logout or suspension deletes/marks the session revoked in D1.
- **Option C (Current Architecture - Local D1 Account Gating)**:
  - For M FARM's single-tenant/demo operational model, local suspension via `account_access.suspended = 1` already reliably and immediately blocks all application endpoints on the very next HTTP request.

---

## 4. Test & Verification Plan

1. **Local Logout Cookie Clearing Verification [VERIFIED IN REGRESSION SUITE]**:
   - Implemented assertion in `scripts/regression-farm.mjs`:
     - Calls `POST /api/auth` with `{ action: "logout" }`.
     - Asserts HTTP 200 `{ ok: true }`.
     - Asserts response `Set-Cookie` headers clear `mf_access`, `mf_refresh`, and `mf_demo` with `Max-Age=0`.
   - Verified that demo sessions bypass upstream network requests cleanly.
2. **Local Suspension Immediate 403 Enforcement**:
   - Under system admin, call `POST /api/system-admin` to suspend target account (`KH-001`).
   - Issue request to `/api/app` with `KH-001` credentials -> Verify HTTP 403 with `"Tài khoản đã bị khóa truy cập"`.
   - Issue request to `GET /api/auth` with `KH-001` credentials -> Verify HTTP 403.
3. **Unsuspend Re-activation**:
   - Under system admin, call `POST /api/system-admin` with `suspended: false`.
   - Issue request to `/api/app` -> Verify HTTP 200 without requiring user re-authentication.
4. **Upstream GoTrue Verification [UNVERIFIED - Requires Real Supabase Project]**:
   - Test against live Supabase GoTrue instance with valid credentials:
     - Verify whether calling `POST /auth/v1/logout?scope=local` revokes the refresh token against subsequent refresh requests.
     - Verify behavior when the access token is already expired at the time of logout.
