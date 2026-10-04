"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./account-ui";
import { ShieldCheck, Search } from "lucide-react";
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  protected: boolean;
  email_verified: number;
  phone_verified: number;
};
type Audit = {
  id: string;
  actor_id: string;
  target_id: string;
  reason: string;
  after_state: string;
  created_at: string;
};
type Data = {
  actor: { name: string; demo: boolean };
  users: User[];
  audit: Audit[];
};
const labels: Record<string, string> = {
  system_admin: "Admin hệ thống",
  admin: "Chủ trang trại",
  customer: "Khách hàng",
};
export function SystemAdmin() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<User | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    setData(await api("/api/system-admin"));
    setError("");
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/system-admin", {
        user_id: editing.id,
        role: editing.role,
        suspended: editing.suspended,
        reason,
      });
      await reload();
      setEditing(null);
      setReason("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-wrap">
      <header className="workspace-heading">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={20} /> M FARM · QUẢN TRỊ HỆ THỐNG
          </div>
          <h1>Tài khoản & phân quyền</h1>
          <p>Quản lý quyền truy cập và xem lịch sử thay đổi.</p>
        </div>
        {data && (
          <button
            className="button outline"
            onClick={async () => {
              try {
                await api("/api/auth", { action: "logout" });
                location.href = "/dang-nhap";
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Đăng xuất
          </button>
        )}
      </header>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <div className="panel">
          {error ? (
            <>
              <a className="button" href="/dang-nhap">
                Đăng nhập
              </a>
              <a className="button outline" href="/demo">
                Trải nghiệm mẫu
              </a>
            </>
          ) : (
            "Đang tải quyền truy cập…"
          )}
        </div>
      ) : (
        <>
          {data.actor.demo && (
            <p className="notice">
              Phiên demo riêng. Thay đổi chỉ áp dụng cho dữ liệu mẫu.
            </p>
          )}
          <div className="stat-grid">
            <article className="panel">
              <strong>{data.users.length}</strong>
              <p>Tài khoản</p>
            </article>
            <article className="panel">
              <strong>{data.users.filter((u) => u.suspended).length}</strong>
              <p>Đang khóa</p>
            </article>
          </div>
          <label className="toolbar">
            <Search />
            <input
              aria-label="Tìm tài khoản"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên hoặc email"
            />
          </label>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table className="system-users">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Xác thực</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.users
                  .filter((u) =>
                    (u.name + u.email)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <br />
                        {u.email}
                      </td>
                      <td>{labels[u.role]}</td>
                      <td>
                        Email: {u.email_verified ? "Đã xác thực" : "Chưa"}
                        <br />
                        Điện thoại: {u.phone_verified ? "Đã xác thực" : "Chưa"}
                      </td>
                      <td>{u.suspended ? "Đang khóa" : "Hoạt động"}</td>
                      <td>
                        <button
                          className="button small outline"
                          disabled={u.protected}
                          onClick={() => {
                            setEditing({ ...u });
                            setReason("");
                            setError("");
                          }}
                        >
                          Quản lý
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {editing && (
            <form className="panel" onSubmit={save}>
              <h2>Quản lý {editing.name}</h2>
              <p>{editing.email}</p>
              <fieldset disabled={busy}>
                <label className="field">
                  <span>Vai trò</span>
                  <select
                    value={editing.role}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value })
                    }
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="admin">Chủ trang trại</option>
                  </select>
                </label>
                <label className="field">
                  <span>Trạng thái truy cập</span>
                  <select
                    value={String(editing.suspended)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        suspended: e.target.value === "true",
                      })
                    }
                  >
                    <option value="false">Hoạt động</option>
                    <option value="true">Khóa truy cập</option>
                  </select>
                </label>
                <label className="field">
                  <span>Lý do thay đổi</span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <p className="notice">
                  Thay đổi có hiệu lực ở yêu cầu tiếp theo. Khóa tài khoản không
                  xóa dữ liệu đã mua. Hạ xuống khách hàng yêu cầu xác thực điện
                  thoại.
                </p>
                <div className="actions">
                  <button className="button" type="submit">
                    {busy ? "Đang lưu…" : "Lưu thay đổi quyền"}
                  </button>
                  <button
                    className="button outline"
                    type="button"
                    onClick={() => setEditing(null)}
                  >
                    Hủy
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <section className="panel">
            <h2>Lịch sử phân quyền</h2>
            <p>100 thay đổi gần nhất.</p>
            {data.audit.map((a) => (
              <article className="system-audit" key={a.id}>
                <strong>
                  {data.users.find((u) => u.id === a.target_id)?.email ||
                    a.target_id}
                </strong>
                <p>{a.reason}</p>
                <small>
                  {new Date(a.created_at).toLocaleString("vi-VN")} · Người thực
                  hiện:{" "}
                  {data.users.find((u) => u.id === a.actor_id)?.email ||
                    a.actor_id}
                </small>
                <p>
                  {labels[JSON.parse(a.after_state).role]} ·{" "}
                  {JSON.parse(a.after_state).suspended ? "Khóa" : "Hoạt động"}
                </p>
              </article>
            ))}
            {!data.audit.length && <p>Chưa có thay đổi.</p>}
          </section>
        </>
      )}
    </main>
  );
}
