"use client";

import Link from "next/link";
import { QrScanner, assetCodeFromScan } from "./qr-scanner";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  UserRound,
  Syringe,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ImagePlus,
  Plus,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "./account-ui";
import type { Asset, State } from "@/lib/model";
import { date, statusLabel } from "@/lib/model";
import { AssetCover } from "./asset-cover";

const updateKinds = [
  ["growth", "Sinh trưởng"],
  ["health", "Sức khỏe"],
  ["food", "Thức ăn"],
  ["medicine", "Thuốc"],
  ["vaccination", "Tiêm ngừa"],
  ["care", "Chăm sóc"],
  ["fertilizer", "Phân bón"],
  ["flowering", "Ra hoa"],
  ["fruiting", "Nuôi trái"],
] as const;

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function PhotoPreview({ file, index }: { file: File; index: number }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img ref={image} alt={`Ảnh ${index + 1}`} />;
}

function PhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  function add(next: FileList | null) {
    const merged = [...files, ...Array.from(next || [])];
    if (merged.length > 6) {
      toast.error("Mỗi lần chọn tối đa 6 ảnh.");
      return;
    }
    if (
      merged.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 8 * 1024 * 1024,
      )
    ) {
      toast.error("Chọn ảnh JPG, PNG hoặc WebP, tối đa 8 MB mỗi ảnh.");
      return;
    }
    if (merged.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) {
      toast.error("Tổng ảnh tối đa 30 MB.");
      return;
    }
    onChange(merged);
  }
  return (
    <section className="quick-card quick-photos">
      <h2>Ảnh thực tế</h2>
      <p>Chụp ngay tại chuồng hoặc vườn để khỏi quên.</p>
      <div className="quick-photo-actions">
        <label className="quick-camera primary">
          <Camera size={23} /> Chụp ảnh
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => {
              add(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <label className="quick-camera">
          <ImagePlus size={21} /> Chọn ảnh
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              add(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {!!files.length && (
        <div className="quick-preview-grid">
          {files.map((file, index) => (
            <figure key={`${file.name}-${file.lastModified}-${index}`}>
              <PhotoPreview file={file} index={index} />
              <button
                type="button"
                aria-label={`Bỏ ảnh ${index + 1}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </button>
            </figure>
          ))}
        </div>
      )}
      <small>{files.length}/6 ảnh</small>
    </section>
  );
}

async function saveUpdate(
  asset: Asset,
  kind: string,
  metric: string,
  note: string,
  files: File[],
  health = "",
) {
  const label =
    updateKinds.find(([value]) => value === kind)?.[1] || "Tình hình";
  const form = new FormData();
  form.set("asset_id", asset.id);
  form.set("kind", kind);
  form.set("title", `${label} · ${asset.name}`);
  form.set(
    "body",
    note.trim() ||
      `Đã kiểm tra và cập nhật ${label.toLocaleLowerCase("vi")} hôm nay.`,
  );
  form.set("metric", metric.trim());
  form.set("health", health);
  for (const file of files) form.append("images", file);
  const response = await fetch("/api/log-images", {
    method: "POST",
    body: form,
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Không thể lưu cập nhật.");
}

export function QuickFarmUpdate() {
  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState<"home" | "update" | "new" | "account">(
    "home",
  );
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("growth");
  const [metric, setMetric] = useState("");
  const [currentHealth, setCurrentHealth] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [vaccinationSaved, setVaccinationSaved] = useState(false);
  const [assetSaved, setAssetSaved] = useState(false);
  const [identifierSaved, setIdentifierSaved] = useState(false);
  const [administeredAt, setAdministeredAt] = useState(today());
  const [vaccine, setVaccine] = useState({
    name: "",
    dose: "Mũi 1",
    next: "",
    batch: "",
    provider: "",
  });
  const [identifier, setIdentifier] = useState({
    type: "leg_band",
    code: "",
    electronic: "",
    placement: "Vòng chân",
  });
  const [initialHealth, setInitialHealth] = useState("attention");
  const [expectedAt, setExpectedAt] = useState("");
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    species: "",
    kind: "animal",
    location: "",
  });

  useEffect(() => {
    api("/api/app")
      .then((data) => {
        if (data.actor.role !== "admin") {
          location.href = "/tai-san";
          return;
        }
        setState(data);
        const requested = new URLSearchParams(location.search).get("asset");
        if (
          requested &&
          data.assets.some((asset: Asset) => asset.id === requested)
        ) {
          setSelected(requested);
          setMode("update");
        }
      })
      .catch((error) => setLoadError(error.message));
  }, []);

  const assets = useMemo(
    () =>
      state?.assets.filter((asset) =>
        `${asset.id} ${asset.name} ${asset.location} ${state.asset_identifiers
          .filter((i) => i.asset_id === asset.id && i.status === "active")
          .map((i) => `${i.visible_code} ${i.electronic_code || ""}`)
          .join(" ")}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi")),
      ) || [],
    [state, query],
  );
  const asset = state?.assets.find((item) => item.id === selected);

  function reset() {
    setCurrentHealth("");
    setQuery("");
    setInitialHealth("attention");
    setExpectedAt("");
    setVaccinationSaved(false);
    setAssetSaved(false);
    setIdentifierSaved(false);
    setAdministeredAt(today());
    api("/api/app")
      .then(setState)
      .catch((error) => toast.error(error.message));
    setSelected("");
    setKind("growth");
    setMetric("");
    setNote("");
    setFiles([]);
    setCreated(false);
    setDraft({ id: "", name: "", species: "", kind: "animal", location: "" });
    setVaccine({ name: "", dose: "Mũi 1", next: "", batch: "", provider: "" });
    setIdentifier({
      type: "leg_band",
      code: "",
      electronic: "",
      placement: "Vòng chân",
    });
  }

  async function submitUpdate() {
    if (!asset) return;
    setBusy(true);
    try {
      if (kind === "vaccination") {
        if (!administeredAt || administeredAt > today())
          throw new Error("Chọn ngày thực hiện hợp lệ, không sau hôm nay.");
        if (vaccine.next && vaccine.next <= administeredAt)
          throw new Error("Ngày nhắc phải sau ngày thực hiện.");
        if (!vaccine.name.trim()) throw new Error("Nhập tên vaccine.");
        if (!vaccinationSaved) {
          await api("/api/app", {
            action: "addVaccination",
            data: {
              asset_id: asset.id,
              vaccine_name: vaccine.name,
              dose_label: vaccine.dose,
              administered_at: administeredAt,
              next_due_at: vaccine.next,
              batch_number: vaccine.batch,
              provider: vaccine.provider,
              note,
            },
          });
          setVaccinationSaved(true);
        }
        if (files.length)
          await saveUpdate(
            asset,
            "medicine",
            metric,
            note || `Ảnh ghi nhận tiêm ${vaccine.name}.`,
            files,
          );
      } else {
        await saveUpdate(asset, kind, metric, note, files, currentHealth);
      }
      setCreated(true);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitNew() {
    if (
      !draft.id.trim() ||
      !draft.name.trim() ||
      !draft.species.trim() ||
      !draft.location.trim()
    ) {
      toast.error("Điền mã, tên, giống và vị trí.");
      return;
    }
    if (!expectedAt || expectedAt < today()) {
      toast.error("Chọn ngày dự kiến đến kỳ, từ hôm nay trở đi.");
      return;
    }
    if (identifier.electronic.trim() && !identifier.code.trim()) {
      toast.error("Điền mã nhìn thấy để gắn thẻ/chip vào hồ sơ.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...draft,
        id: draft.id.trim().toUpperCase(),
        status: "available",
        health: initialHealth,
        progress: 0,
        weight: metric.trim(),
        started_at: today(),
        expected_at: expectedAt,
      };
      if (!assetSaved) {
        await api("/api/app", { action: "saveAsset", data, create_only: true });
        setAssetSaved(true);
      }
      if (
        !identifierSaved &&
        draft.kind === "animal" &&
        identifier.code.trim()
      ) {
        await api("/api/app", {
          action: "addAssetIdentifier",
          data: {
            asset_id: data.id,
            identifier_type: identifier.type,
            visible_code: identifier.code.trim(),
            electronic_code: identifier.electronic.trim(),
            placement: identifier.placement.trim() || "Gắn ngoài",
            attached_at: today(),
            note: "Gắn khi tạo hồ sơ trên điện thoại.",
          },
        });
        setIdentifierSaved(true);
      }
      if (files.length)
        await saveUpdate(
          data as Asset,
          "growth",
          metric,
          note || "Ghi nhận hình ảnh ban đầu khi tạo hồ sơ.",
          files,
        );
      setCreated(true);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError)
    return (
      <main className="quick-shell">
        <h1>Chưa mở được sổ trại</h1>
        <p role="alert">{loadError}</p>
        <button className="button" onClick={() => location.reload()}>
          Thử lại
        </button>
        <a className="button outline" href="/dang-nhap">
          Đăng nhập
        </a>
      </main>
    );
  if (!state)
    return (
      <main className="quick-shell">
        <p>Đang mở sổ trại…</p>
      </main>
    );
  if (created)
    return (
      <main className="quick-shell quick-success">
        <div className="quick-success-icon">
          <Check size={42} />
        </div>
        <h1>Đã lưu tại trại</h1>
        <p>
          {files.length ? `${files.length} ảnh và thông tin` : "Thông tin"} đã
          được gắn đúng hồ sơ.
        </p>
        <button
          className="button"
          onClick={() => {
            reset();
            setMode("home");
          }}
        >
          Về Hôm nay
        </button>
        <a href="/quan-tri">Về màn quản trị</a>
      </main>
    );

  const reminders = state.vaccinations.filter(
    (v) =>
      v.next_due_at &&
      v.next_due_at <= future(7) &&
      !state.vaccinations.some(
        (next) =>
          next.id !== v.id &&
          next.asset_id === v.asset_id &&
          next.vaccine_name === v.vaccine_name &&
          next.administered_at >= v.next_due_at!,
      ),
  );
  const bottomNav = (
    <nav className="farm-bottom-nav" aria-label="Sổ trại">
      <button
        aria-current={mode === "home" ? "page" : undefined}
        onClick={() => {
          reset();
          setMode("home");
        }}
      >
        <Home />
        <span>Hôm nay</span>
      </button>
      <button
        aria-current={mode === "update" ? "page" : undefined}
        onClick={() => {
          reset();
          setMode("update");
        }}
      >
        <Sprout />
        <span>Cây & vật nuôi</span>
      </button>
      <button
        aria-current={mode === "account" ? "page" : undefined}
        onClick={() => {
          reset();
          setMode("account");
        }}
      >
        <UserRound />
        <span>Tài khoản</span>
      </button>
    </nav>
  );
  if (mode === "home" || mode === "account")
    return (
      <main className="quick-shell farm-mobile-home">
        <header className="quick-header">
          <Link href="/" className="brand">
            <Sprout /> M FARM
          </Link>
          <span className="badge">Sổ trại</span>
        </header>
        {mode === "account" ? (
          <section className="quick-card">
            <h1>Tài khoản của tôi</h1>
            <h2>{state.actor.name}</h2>
            <p>{state.actor.email}</p>
            <p>
              {state.actor.demo ? "Đang dùng dữ liệu mẫu" : "Chủ trang trại"}
            </p>
            <a className="button" href="/quan-tri">
              Mở quản trị đầy đủ
            </a>
            <button
              className="button outline"
              onClick={async () => {
                try {
                  await api("/api/auth", { action: "logout" });
                  location.href = "/dang-nhap";
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
            >
              Đăng xuất
            </button>
          </section>
        ) : (
          <>
            <div className="mobile-greeting">
              <p>{date(today())}</p>
              <h1>Hôm nay ở trang trại</h1>
              <p>
                Chào {state.actor.name.replace(" (mẫu)", "")}, cùng chăm từng
                ngày lớn lên.
              </p>
            </div>
            {state.actor.demo && (
              <p className="notice">
                Dữ liệu trải nghiệm · Không có giao dịch thật.
              </p>
            )}
            <div className="farm-quick-actions">
              <button
                onClick={() => {
                  reset();
                  setMode("new");
                }}
              >
                <Plus />
                <strong>Thêm cây / con</strong>
                <span>Tạo hồ sơ & chụp ảnh</span>
              </button>
              <button
                onClick={() => {
                  reset();
                  setMode("update");
                }}
              >
                <Camera />
                <strong>Cập nhật hôm nay</strong>
                <span>Ảnh & nhật ký chăm sóc</span>
              </button>
              <button
                onClick={() => {
                  reset();
                  setMode("update");
                  setKind("vaccination");
                }}
              >
                <Syringe />
                <strong>Ghi nhận tiêm ngừa</strong>
                <span>Lưu mũi tiêm đã thực hiện</span>
              </button>
            </div>
            <section className="quick-card">
              <div className="mobile-section-heading">
                <h2>Cần theo dõi</h2>
                <CalendarDays size={20} />
              </div>
              <p>
                {state.assets.filter((a) => a.health !== "healthy").length}{" "}
                cây/con cần theo dõi sức khỏe · {reminders.length} lịch nhắc
                tiêm trong 7 ngày tới hoặc đã quá hạn.
              </p>
              {reminders.slice(0, 4).map((v) => (
                <button
                  className="reminder-row"
                  key={v.id}
                  onClick={() => {
                    reset();
                    setSelected(v.asset_id);
                    setMode("update");
                    setKind("vaccination");
                  }}
                >
                  <span>
                    <strong>
                      {v.asset_id} · {v.vaccine_name}
                    </strong>
                    <small>Nhắc ngày {date(v.next_due_at!)}</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
            </section>
            <div className="mobile-section-heading">
              <h2>Cây & vật nuôi ({state.assets.length})</h2>
              <button onClick={() => setMode("update")}>Xem tất cả</button>
            </div>
            <div className="mobile-asset-grid">
              {state.assets.slice(0, 4).map((item) => (
                <a
                  key={item.id}
                  href={"/quan-tri?asset=" + encodeURIComponent(item.id)}
                  className="catalog-card"
                >
                  <AssetCover asset={item} images={state.log_images} />
                  <div className="catalog-body">
                    <small>{item.id}</small>
                    <h3>{item.name}</h3>
                    <span className="badge">{statusLabel[item.health]}</span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
        {bottomNav}
      </main>
    );
  return (
    <main className="quick-shell">
      <header className="quick-header">
        <button
          disabled={busy}
          onClick={() => {
            reset();
            setMode("home");
          }}
          aria-label="Về Hôm nay"
        >
          <ChevronLeft />
        </button>
        <div>
          <span>M FARM · SỔ TRẠI</span>
          <h1>
            {mode === "new"
              ? "Thêm cây / con mới"
              : kind === "vaccination"
                ? "Ghi nhận tiêm ngừa"
                : "Cập nhật hôm nay"}
          </h1>
        </div>
        <Sprout />
      </header>
      <div className="quick-mode">
        <button
          disabled={busy}
          className={mode === "update" ? "active" : ""}
          onClick={() => {
            setMode("update");
            reset();
          }}
        >
          Cập nhật
        </button>
        <button
          disabled={busy}
          className={mode === "new" ? "active" : ""}
          onClick={() => {
            setMode("new");
            reset();
          }}
        >
          <Plus size={17} /> Thêm mới
        </button>
      </div>
      {assetSaved && (
        <p className="notice">
          Hồ sơ đã tạo. Bấm Tạo hồ sơ để thử lưu tiếp phần còn lại, hoặc mở quản
          trị để kiểm tra.
        </p>
      )}
      {vaccinationSaved && (
        <p className="notice">
          Mũi tiêm đã lưu. Bấm Lưu cập nhật để thử gửi lại ảnh.
        </p>
      )}

      {mode === "update" ? (
        <>
          {!asset ? (
            <section className="quick-card">
              <label className="quick-search">
                <Search size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(assetCodeFromScan(e.target.value))}
                  placeholder="Tìm mã cây/con, thẻ hoặc chip…"
                  aria-label="Tìm cây hoặc vật nuôi"
                />
              </label>
              <QrScanner
                onDetected={(code) => {
                  const match = state.assets.find(
                    (item) =>
                      item.id.toLocaleLowerCase() ===
                        code.toLocaleLowerCase() ||
                      state.asset_identifiers.some(
                        (tag) =>
                          tag.asset_id === item.id &&
                          tag.status === "active" &&
                          [tag.visible_code, tag.electronic_code].some(
                            (value) =>
                              value?.toLocaleLowerCase() ===
                              code.toLocaleLowerCase(),
                          ),
                      ),
                  );
                  if (
                    !match ||
                    (kind === "vaccination" && match.kind !== "animal")
                  ) {
                    toast.error(
                      "Không tìm thấy hồ sơ phù hợp trong tài khoản này.",
                    );
                    return;
                  }
                  setSelected(match.id);
                  setFiles([]);
                  setMetric("");
                  setNote("");
                  setCurrentHealth("");
                  if (match.kind === "plant") setKind("growth");
                }}
              />
              <div className="quick-asset-list">
                {assets
                  .filter(
                    (item) => kind !== "vaccination" || item.kind === "animal",
                  )
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelected(item.id);
                        setFiles([]);
                        setMetric("");
                        setNote("");
                        setCurrentHealth("");
                        if (item.kind === "plant") setKind("growth");
                      }}
                    >
                      <AssetCover
                        asset={item}
                        images={state.log_images}
                        compact
                      />
                      <span>
                        <strong>
                          {item.id} · {item.name}
                        </strong>
                        <small>
                          {item.location} · {item.species}
                        </small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                {!assets.filter(
                  (item) => kind !== "vaccination" || item.kind === "animal",
                ).length && (
                  <p className="empty-inline">
                    Chưa có hồ sơ phù hợp. Chọn Thêm mới để tạo cây/con.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <>
              <button
                className="quick-selected"
                disabled={busy || vaccinationSaved}
                onClick={() => setSelected("")}
              >
                <span>
                  <strong>
                    {asset.id} · {asset.name}
                  </strong>
                  <small>{asset.location}</small>
                </span>
                <span>Đổi</span>
              </button>
              <PhotoPicker files={files} onChange={setFiles} />
              <section className="quick-card">
                <h2>Hôm nay cập nhật gì?</h2>
                {kind !== "vaccination" && (
                  <label className="field">
                    <span>Tình trạng sau khi kiểm tra</span>
                    <select
                      value={currentHealth}
                      onChange={(e) => setCurrentHealth(e.target.value)}
                    >
                      <option value="">Giữ nguyên tình trạng hồ sơ</option>
                      <option value="healthy">Khỏe mạnh</option>
                      <option value="attention">Cần theo dõi</option>
                      <option value="treatment">Đang điều trị</option>
                    </select>
                  </label>
                )}
                <div className="quick-kind-grid">
                  {updateKinds
                    .filter(([value]) =>
                      asset.kind === "animal"
                        ? !["fertilizer", "flowering", "fruiting"].includes(
                            value,
                          )
                        : !["vaccination", "food", "medicine"].includes(value),
                    )
                    .map(([value, label]) => (
                      <button
                        key={value}
                        disabled={busy || vaccinationSaved}
                        className={kind === value ? "active" : ""}
                        onClick={() => setKind(value)}
                      >
                        {label}
                      </button>
                    ))}
                </div>
                {kind === "vaccination" && (
                  <fieldset
                    disabled={busy || vaccinationSaved}
                    className="quick-vaccine-fields"
                  >
                    <label className="field">
                      <span>Ngày thực hiện</span>
                      <input
                        type="date"
                        value={administeredAt}
                        max={today()}
                        onInput={(e) =>
                          setAdministeredAt(e.currentTarget.value)
                        }
                        onChange={(e) => setAdministeredAt(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Tên vaccine</span>
                      <input
                        value={vaccine.name}
                        onChange={(e) =>
                          setVaccine({ ...vaccine, name: e.target.value })
                        }
                        placeholder="Ví dụ: Newcastle"
                      />
                    </label>
                    <label className="field">
                      <span>Mũi tiêm</span>
                      <input
                        value={vaccine.dose}
                        onChange={(e) =>
                          setVaccine({ ...vaccine, dose: e.target.value })
                        }
                        placeholder="Mũi 1"
                      />
                    </label>
                    <label className="field">
                      <span>Ngày nhắc tiếp theo</span>
                      <input
                        type="date"
                        value={vaccine.next}
                        onInput={(e) =>
                          setVaccine({
                            ...vaccine,
                            next: e.currentTarget.value,
                          })
                        }
                        onChange={(e) =>
                          setVaccine({ ...vaccine, next: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Số lô</span>
                      <input
                        value={vaccine.batch}
                        onChange={(e) =>
                          setVaccine({ ...vaccine, batch: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Người / đơn vị thực hiện</span>
                      <input
                        value={vaccine.provider}
                        onChange={(e) =>
                          setVaccine({ ...vaccine, provider: e.target.value })
                        }
                      />
                    </label>
                  </fieldset>
                )}
                <label className="field">
                  <span>
                    {kind === "growth"
                      ? "Cân nặng / chiều cao hiện tại"
                      : "Chỉ số ghi vào nhật ký"}
                  </span>
                  <input
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    placeholder="Ví dụ: 0,92 kg hoặc cao 1,5 m"
                  />
                </label>
                <label className="field">
                  <span>Ghi chú ngắn</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tình hình và việc đã làm…"
                    maxLength={5000}
                  />
                </label>
              </section>
              <button
                className="button quick-save"
                disabled={busy}
                onClick={submitUpdate}
              >
                {busy ? "Đang lưu…" : "Lưu cập nhật"}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <PhotoPicker files={files} onChange={setFiles} />
          <section className="quick-card quick-new-form">
            <fieldset disabled={busy || assetSaved}>
              <h2>Hồ sơ mới</h2>
              <div className="quick-kind-grid two">
                <button
                  className={draft.kind === "animal" ? "active" : ""}
                  onClick={() => setDraft({ ...draft, kind: "animal" })}
                >
                  Vật nuôi
                </button>
                <button
                  className={draft.kind === "plant" ? "active" : ""}
                  onClick={() => setDraft({ ...draft, kind: "plant" })}
                >
                  Cây trồng
                </button>
              </div>
              <label className="field">
                <span>Mã định danh</span>
                <input
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  placeholder="GA-005"
                />
              </label>
              <label className="field">
                <span>Tên hồ sơ</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Gà ta 005"
                />
              </label>
              <label className="field">
                <span>Giống</span>
                <input
                  value={draft.species}
                  onChange={(e) =>
                    setDraft({ ...draft, species: e.target.value })
                  }
                  placeholder="Gà ta, ổi…"
                />
              </label>
              <label className="field">
                <span>Vị trí</span>
                <input
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                  placeholder="Chuồng A, hàng cây B…"
                />
              </label>
              <label className="field">
                <span>Chỉ số ban đầu</span>
                <input
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="0,25 kg hoặc cao 80 cm"
                />
              </label>
              <label className="field">
                <span>Sức khỏe ban đầu</span>
                <select
                  value={initialHealth}
                  onChange={(e) => setInitialHealth(e.target.value)}
                >
                  <option value="attention">Cần theo dõi</option>
                  <option value="healthy">Khỏe mạnh</option>
                  <option value="treatment">Đang điều trị</option>
                </select>
              </label>
              <label className="field">
                <span>Dự kiến đến kỳ</span>
                <input
                  type="date"
                  min={today()}
                  value={expectedAt}
                  onInput={(e) => setExpectedAt(e.currentTarget.value)}
                  onChange={(e) => setExpectedAt(e.target.value)}
                />
                <small>Có thể điều chỉnh sau trong hồ sơ.</small>
              </label>
            </fieldset>
            {draft.kind === "animal" && (
              <fieldset
                disabled={busy || identifierSaved}
                className="quick-identifier-fields"
              >
                <h3>Mã định danh (không bắt buộc)</h3>
                <label className="field">
                  <span>Loại thẻ</span>
                  <select
                    value={identifier.type}
                    onChange={(e) =>
                      setIdentifier({
                        ...identifier,
                        type: e.target.value,
                        placement:
                          e.target.value === "leg_band"
                            ? "Vòng chân"
                            : e.target.value.startsWith("ear_tag")
                              ? "Thẻ tai"
                              : e.target.value === "collar_qr"
                                ? "Vòng cổ"
                                : "Dưới da",
                      })
                    }
                  >
                    <option value="leg_band">Vòng chân</option>
                    <option value="ear_tag_qr">Thẻ tai QR</option>
                    <option value="ear_tag_rfid">Thẻ tai RFID</option>
                    <option value="collar_qr">Thẻ QR vòng cổ</option>
                    <option value="microchip">Microchip</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mã in nhìn thấy</span>
                  <input
                    value={identifier.code}
                    onChange={(e) =>
                      setIdentifier({ ...identifier, code: e.target.value })
                    }
                    placeholder={draft.id || "GA-005"}
                  />
                </label>
                {(identifier.type === "ear_tag_rfid" ||
                  identifier.type === "microchip") && (
                  <label className="field">
                    <span>Mã điện tử</span>
                    <input
                      value={identifier.electronic}
                      onChange={(e) =>
                        setIdentifier({
                          ...identifier,
                          electronic: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </fieldset>
            )}
          </section>
          <button
            className="button quick-save"
            disabled={busy}
            onClick={submitNew}
          >
            {busy ? "Đang tạo…" : "Tạo hồ sơ"}
          </button>
        </>
      )}
    </main>
  );
}
