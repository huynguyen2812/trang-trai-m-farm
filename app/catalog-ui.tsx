"use client";
import { useEffect, useState } from "react";
import { Sprout, Bird, Check, CalendarDays, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package, Asset, money } from "@/lib/model";
import { api, PublicHeader } from "./account-ui";
export function Catalog() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Package | null>(null);
  const [asset, setAsset] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("loai");
    if (q === "animal" || q === "plant") setFilter(q);
    api("/api/catalog")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  async function order() {
    if (!selected || !asset) return;
    setBusy(true);
    try {
      await api("/api/app", {
        action: "purchase",
        data: {
          asset_id: asset,
          package_id: selected.id,
          expected_price: selected.price,
          expected_days: selected.days,
          accepted,
        },
      });
      toast.success("Đã tạo đơn chờ thanh toán.");
      location.href = "/tai-san";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(p: Package) {
    setSelected(p);
    setAsset("");
    setAccepted(false);
    setError("");
  }
  return (
    <>
      <PublicHeader />
      <main className="page-wrap">
        <div className="eyebrow">CHỌN MỘT HÀNH TRÌNH</div>
        <div className="page-title">
          <h1>Điều bạn muốn chăm, ở đây.</h1>
          <p>Chọn cây hoặc con giống và gói đồng hành phù hợp.</p>
        </div>
        {data?.demo && (
          <div className="notice">
            Danh mục và mức giá minh họa.{" "}
            {data.illustrative
              ? "Chưa mở bán thật. Vào bản trải nghiệm để thử luồng nhận nuôi."
              : "Bạn đang dùng phiên trải nghiệm; mọi đơn hàng dưới đây là đơn mẫu."}
          </div>
        )}
        {error && !selected && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <Tabs value={filter} onValueChange={setFilter} className="section-tabs">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="animal">Vật nuôi</TabsTrigger>
            <TabsTrigger value="plant">Cây trồng</TabsTrigger>
          </TabsList>
        </Tabs>
        {!data && !error ? (
          <div className="skeleton" />
        ) : (
          <div className="card-grid">
            {data?.packages
              .filter((p: Package) => filter === "all" || p.kind === filter)
              .map((p: Package) => (
                <article className="catalog-card" key={p.id}>
                  <div className={"catalog-art " + p.kind}>
                    <span className="eyebrow" style={{ margin: 0 }}>
                      {p.kind === "animal" ? "VẬT NUÔI /" : "CÂY TRỒNG /"}{" "}
                      {p.species.toUpperCase()}
                    </span>
                    {p.kind === "animal" ? <Bird /> : <Sprout />}
                  </div>
                  <div className="catalog-body">
                    <span className="badge">
                      <CalendarDays size={13} />
                      {p.days} ngày đồng hành
                    </span>
                    <h3>{p.name}</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 14, minHeight: 68 }}
                    >
                      {p.description}
                    </p>
                    <div className="price">{money(p.price)}</div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      một {p.kind === "animal" ? "con / vòng đời" : "cây / vụ"}
                    </span>
                    <ul className="list-clean">
                      {p.benefits
                        .split("\n")
                        .slice(0, 4)
                        .map((b) => (
                          <li key={b}>
                            <Check size={14} />
                            {b}
                          </li>
                        ))}
                    </ul>
                    <button className="button" onClick={() => open(p)}>
                      Xem gói & nhận nuôi
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
        <div
          className="panel"
          style={{ marginTop: 30, display: "flex", gap: 18 }}
        >
          <ShieldCheck />
          <p className="muted" style={{ fontSize: 14 }}>
            Mỗi đơn hàng lưu riêng giá và điều kiện tại thời điểm mua. Không cam
            kết sản lượng hoặc lợi nhuận cố định. Việc mua lại cần được hai bên
            thống nhất trong hợp đồng.
          </p>
        </div>
      </main>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Kiểm tra cá thể, giá và điều kiện trước khi tạo đơn.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="price">
                {money(selected.price)}{" "}
                <span className="muted" style={{ fontSize: 14 }}>
                  / {selected.days} ngày
                </span>
              </div>
              <p style={{ whiteSpace: "pre-line", fontSize: 14 }}>
                {selected.benefits}
              </p>
              {data?.illustrative ? (
                <div className="notice">
                  Chưa có cá thể mở bán thật.
                  <a className="button" href="/demo" style={{ marginTop: 15 }}>
                    Vào bản trải nghiệm
                  </a>
                </div>
              ) : (
                <>
                  <label className="field">
                    <span>Chọn cây / con</span>
                    <Select value={asset} onValueChange={setAsset}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn cá thể đang mở bán" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.assets
                          .filter(
                            (a: Asset) =>
                              a.species === selected.species &&
                              a.kind === selected.kind,
                          )
                          .map((a: Asset) => (
                            <SelectItem value={a.id} key={a.id}>
                              {a.id} · {a.name} · {a.weight}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {!data?.assets.some(
                    (a: Asset) => a.species === selected.species,
                  ) && <p className="muted">Hiện chưa có cá thể phù hợp.</p>}
                  <p className="muted" style={{ fontSize: 13 }}>
                    Đơn được giữ chỗ và chờ trại xác nhận thanh toán. Chưa bao
                    gồm vận chuyển nếu gói không ghi rõ. Sản lượng phụ thuộc
                    sinh trưởng; mua lại theo thỏa thuận, không cam kết lợi
                    nhuận.
                  </p>
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      alignItems: "start",
                    }}
                  >
                    <Checkbox
                      checked={accepted}
                      onCheckedChange={(v) => setAccepted(v === true)}
                    />
                    <span>
                      Tôi đã đọc và đồng ý giá, thời hạn, quyền lợi và điều kiện
                      trên.
                    </span>
                  </label>
                  {error && (
                    <div className="error" role="alert">
                      {error}
                    </div>
                  )}
                  <button
                    disabled={busy || !asset || !accepted}
                    className="button"
                    onClick={order}
                  >
                    {busy ? "Đang tạo đơn…" : "Xác nhận đăng ký nhận nuôi"}
                  </button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
