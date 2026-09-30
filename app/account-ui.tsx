"use client";
import { useEffect, useState } from "react";
import {
  Sprout,
  Check,
  ShieldCheck,
  Mail,
  Smartphone,
  FlaskConical,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
export async function api(url: string, data?: unknown) {
  let r = await fetch(url, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (r.status === 401 && url !== "/api/auth") {
    const refreshed = await fetch("/api/auth", { cache: "no-store" });
    const session: any = await refreshed.json();
    if (session.user)
      r = await fetch(url, {
        method: data ? "POST" : "GET",
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
      });
  }
  const result: any = await r.json();
  if (!r.ok)
    throw new Error(result.error || "Không thể thực hiện. Vui lòng thử lại.");
  return result;
}
export function PublicHeader() {
  return (
    <header className="public-nav">
      <a href="/" className="brand">
        <Sprout /> M FARM
      </a>
      <nav>
        <a href="/">Trang trại</a>
        <a href="/nhan-nuoi">Nuôi con gì · Trồng cây gì</a>
        <a href="/tai-san">Tài sản của tôi</a>
      </nav>
      <a href="/dang-nhap" className="button small outline">
        Tài khoản
      </a>
    </header>
  );
}
export function Demo() {
  const [busy, setBusy] = useState("");
  async function enter(role: string) {
    setBusy(role);
    try {
      await api("/api/demo", { role });
      location.href = role === "admin" ? "/quan-tri" : "/tai-san";
    } catch (e) {
      toast.error((e as Error).message);
      setBusy("");
    }
  }
  return (
    <>
      <PublicHeader />
      <main className="page-wrap">
        <div className="eyebrow">KHÁM PHÁ TRƯỚC KHI BẮT ĐẦU</div>
        <div className="page-title">
          <h1>Một vòng quanh M FARM</h1>
          <p>Thử cả hai góc nhìn với dữ liệu mẫu riêng của bạn.</p>
        </div>
        <div className="notice">
          Đây là bản trải nghiệm. Thay đổi được lưu trong vùng dữ liệu mẫu;
          không gửi email/SMS, không thu tiền và không tạo giao dịch thật. Phiên
          mẫu có hiệu lực 7 ngày.
        </div>
        <div className="demo-choices">
          <article className="panel">
            <Sprout size={35} />
            <h2 style={{ fontSize: 26 }}>Tôi là khách hàng</h2>
            <p className="muted">
              Theo dõi gà và cây ổi đã nhận nuôi, đọc nhật ký, xem đơn hàng và
              thử chọn thêm cây/con.
            </p>
            <button
              disabled={!!busy}
              className="button"
              onClick={() => enter("customer")}
            >
              {busy === "customer"
                ? "Đang chuẩn bị…"
                : "Trải nghiệm khách hàng"}
            </button>
          </article>
          <article className="panel">
            <ShieldCheck size={35} />
            <h2 style={{ fontSize: 26 }}>Tôi là chủ trang trại</h2>
            <p className="muted">
              Quản lý cây/con, thêm nhật ký, sửa gói chăm sóc, phân bổ tài sản
              và theo dõi khách hàng.
            </p>
            <button
              disabled={!!busy}
              className="button"
              onClick={() => enter("admin")}
            >
              {busy === "admin" ? "Đang chuẩn bị…" : "Trải nghiệm quản trị"}
            </button>
          </article>
        </div>
      </main>
    </>
  );
}
export function Auth() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [step, setStep] = useState("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    api("/api/auth")
      .then((d) => {
        setReady(d.ready);
        if (d.user?.email_verified) {
          setEmail(d.user.email);
          if (d.user.is_owner || d.user.phone_verified) {
            location.href = d.user.is_owner
              ? innerWidth <= 760 ? "/cap-nhat" : "/quan-tri"
              : "/tai-san";
            return;
          }
          setStep("phone");
        }
      })
      .catch((e) => {
        setReady(false);
        setError(e.message);
      });
  }, []);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (step === "email") {
        await api("/api/auth", { action: "sendEmail", name, email });
        setStep("emailCode");
        setCooldown(60);
      } else if (step === "emailCode") {
        await api("/api/auth", { action: "verifyEmail", email, code });
        const d = await api("/api/auth");
        if (d.user?.is_owner || d.user?.phone_verified) {
          location.href = d.user?.is_owner
            ? innerWidth <= 760 ? "/cap-nhat" : "/quan-tri"
            : "/tai-san";
          return;
        }
        setStep("phone");
        setCode("");
      } else if (step === "phone") {
        const normalized = phone.replace(/[\s.-]/g, "").replace(/^0/, "+84");
        await api("/api/auth", { action: "sendPhone", phone: normalized });
        setPhone(normalized);
        setStep("phoneCode");
        setCooldown(60);
      } else {
        await api("/api/auth", { action: "verifyPhone", phone, code });
        const d = await api("/api/auth");
        if (!d.user?.email_verified || !d.user?.phone_verified)
          throw new Error("Chưa hoàn tất xác thực. Vui lòng thử lại.");
        location.href = "/tai-san";
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    try {
      await api(
        "/api/auth",
        step === "emailCode"
          ? { action: "sendEmail", name, email }
          : { action: "sendPhone", phone },
      );
      setCooldown(60);
      toast.success("Đã yêu cầu gửi mã mới.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const isCode = step.endsWith("Code");
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <a href="/" className="brand">
          <Sprout /> M FARM
        </a>
        <div>
          <div className="eyebrow light">KẾT NỐI VỚI ĐIỀU LÀNH</div>
          <h1>
            Trang trại ở xa.
            <br />
            Hành trình ở ngay đây.
          </h1>
          <p>Mỗi lần ghé thăm, thêm một câu chuyện lớn lên.</p>
        </div>
        <p>
          <ShieldCheck
            size={20}
            style={{ display: "inline", marginRight: 10 }}
          />{" "}
          Tài sản riêng. Nhật ký rõ ràng.
        </p>
      </aside>
      <main className="auth-main">
        <a href="/" className="muted">
          Về trang trại
        </a>
        <h2 style={{ marginTop: 30 }}>Chào mừng đến M FARM</h2>
        <p className="muted" style={{ marginTop: 14 }}>
          Đăng nhập hoặc tạo tài khoản bằng mã xác thực.
        </p>
        <div className="auth-steps">
          <span className={step.startsWith("email") ? "active" : ""}>
            01 · Email
          </span>
          <span className={step.startsWith("phone") ? "active" : ""}>
            02 · Điện thoại
          </span>
          <span>03 · Trang trại của bạn</span>
        </div>
        {ready === false && (
          <div className="notice">
            Dịch vụ gửi mã chưa được kết nối. Tài khoản thật chưa thể đăng ký;
            bạn có thể khám phá bản mẫu phía dưới.
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          {step === "email" && (
            <>
              <label className="field">
                <span>Họ và tên</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Nguyễn Minh Anh"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="ban@example.com"
                />
              </label>
            </>
          )}
          {step === "phone" && (
            <>
              <div className="badge">
                <Check size={14} /> Email đã xác thực
              </div>
              <label className="field">
                <span>Số điện thoại nhận SMS</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="090… hoặc +8490…"
                />
              </label>
            </>
          )}
          {isCode && (
            <div className="field">
              <span id="otp-label">
                Nhập mã gửi đến {step === "emailCode" ? email : phone}
              </span>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                aria-labelledby="otp-label"
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <button
                type="button"
                className="text-link"
                style={{ justifySelf: "start" }}
                disabled={cooldown > 0 || busy}
                onClick={resend}
              >
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
              </button>
            </div>
          )}
          <button
            disabled={!ready || busy || (isCode && code.length !== 6)}
            className="button"
            style={{ marginTop: 20 }}
          >
            {busy
              ? "Đang xử lý…"
              : isCode
                ? "Xác thực và tiếp tục"
                : step === "email"
                  ? "Gửi mã xác thực email"
                  : "Gửi mã xác thực SMS"}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
          Tài khoản cần xác thực cả email và điện thoại trước khi mua và quản lý
          tài sản.
        </p>
        <a href="/demo" className="button outline" style={{ marginTop: 28 }}>
          <FlaskConical size={18} /> Khám phá bản trải nghiệm
        </a>
      </main>
    </div>
  );
}
