"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft, ImagePlus, Plus, Search, Sprout, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "./account-ui";
import type { Asset, State } from "@/lib/model";

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

const today = () => new Date().toISOString().slice(0, 10);
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function PhotoPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  function add(next: FileList | null) {
    onChange([...files, ...Array.from(next || [])].slice(0, 6));
  }
  return (
    <section className="quick-card quick-photos">
      <h2>Ảnh thực tế</h2>
      <p>Chụp ngay tại chuồng hoặc vườn để khỏi quên.</p>
      <div className="quick-photo-actions">
        <label className="quick-camera primary">
          <Camera size={23} /> Chụp ảnh
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { add(e.target.files); e.currentTarget.value = ""; }} />
        </label>
        <label className="quick-camera">
          <ImagePlus size={21} /> Chọn ảnh
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { add(e.target.files); e.currentTarget.value = ""; }} />
        </label>
      </div>
      {!!files.length && (
        <div className="quick-preview-grid">
          {files.map((file, index) => (
            <figure key={`${file.name}-${file.lastModified}-${index}`}>
              <img src={URL.createObjectURL(file)} alt={`Ảnh ${index + 1}`} />
              <button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => onChange(files.filter((_, i) => i !== index))}><X size={16} /></button>
            </figure>
          ))}
        </div>
      )}
      <small>{files.length}/6 ảnh</small>
    </section>
  );
}

async function saveUpdate(asset: Asset, kind: string, metric: string, note: string, files: File[]) {
  const label = updateKinds.find(([value]) => value === kind)?.[1] || "Tình hình";
  const form = new FormData();
  form.set("asset_id", asset.id);
  form.set("kind", kind);
  form.set("title", `${label} · ${asset.name}`);
  form.set("body", note.trim() || `Đã kiểm tra và cập nhật ${label.toLocaleLowerCase("vi")} hôm nay.`);
  form.set("metric", metric.trim());
  for (const file of files) form.append("images", file);
  const response = await fetch("/api/log-images", { method: "POST", body: form });
  const result: any = await response.json();
  if (!response.ok) throw new Error(result.error || "Không thể lưu cập nhật.");
}

export function QuickFarmUpdate() {
  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState<"update" | "new">("update");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("growth");
  const [metric, setMetric] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [vaccine, setVaccine] = useState({ name: "", dose: "Mũi 1", next: "", batch: "", provider: "" });
  const [identifier, setIdentifier] = useState({ type: "leg_band", code: "", electronic: "", placement: "Vòng chân" });
  const [draft, setDraft] = useState({ id: "", name: "", species: "", kind: "animal", location: "" });

  useEffect(() => {
    api("/api/app").then((data) => {
      if (data.actor.role !== "admin") location.href = "/tai-san";
      setState(data);
      const requested = new URLSearchParams(location.search).get("asset");
      if (requested && data.assets.some((asset: Asset) => asset.id === requested)) setSelected(requested);
    }).catch((error) => toast.error(error.message));
  }, []);

  const assets = useMemo(() => state?.assets.filter((asset) => `${asset.id} ${asset.name} ${asset.location}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))) || [], [state, query]);
  const asset = state?.assets.find((item) => item.id === selected);

  function reset() {
    setSelected(""); setKind("growth"); setMetric(""); setNote(""); setFiles([]); setCreated(false);
    setDraft({ id: "", name: "", species: "", kind: "animal", location: "" });
    setVaccine({ name: "", dose: "Mũi 1", next: "", batch: "", provider: "" });
    setIdentifier({ type: "leg_band", code: "", electronic: "", placement: "Vòng chân" });
  }

  async function submitUpdate() {
    if (!asset) return;
    setBusy(true);
    try {
      if (kind === "vaccination") {
        if (!vaccine.name.trim()) throw new Error("Nhập tên vaccine.");
        await api("/api/app", {
          action: "addVaccination",
          data: {
            asset_id: asset.id,
            vaccine_name: vaccine.name,
            dose_label: vaccine.dose,
            administered_at: today(),
            next_due_at: vaccine.next,
            batch_number: vaccine.batch,
            provider: vaccine.provider,
            note,
          },
        });
        if (files.length)
          await saveUpdate(asset, "medicine", metric, note || `Ảnh ghi nhận tiêm ${vaccine.name}.`, files);
      } else {
        await saveUpdate(asset, kind, metric, note, files);
      }
      setCreated(true);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function submitNew() {
    if (!draft.id.trim() || !draft.name.trim() || !draft.species.trim() || !draft.location.trim()) {
      toast.error("Điền mã, tên, giống và vị trí."); return;
    }
    setBusy(true);
    try {
      const data = {
        ...draft,
        id: draft.id.trim().toUpperCase(),
        status: "available",
        health: "healthy",
        progress: 0,
        weight: metric.trim(),
        started_at: today(),
        expected_at: future(draft.kind === "plant" ? 180 : 120),
      };
      await api("/api/app", { action: "saveAsset", data });
      if (draft.kind === "animal" && identifier.code.trim())
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
      if (files.length) await saveUpdate(data as Asset, "growth", metric, note || "Ghi nhận hình ảnh ban đầu khi tạo hồ sơ.", files);
      setCreated(true);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  if (!state) return <main className="quick-shell"><p>Đang mở sổ trại…</p></main>;
  if (created) return (
    <main className="quick-shell quick-success">
      <div className="quick-success-icon"><Check size={42} /></div>
      <h1>Đã lưu tại trại</h1>
      <p>{files.length ? `${files.length} ảnh và thông tin` : "Thông tin"} đã được gắn đúng hồ sơ.</p>
      <button className="button" onClick={reset}>Cập nhật tiếp</button>
      <a href="/quan-tri">Về màn quản trị</a>
    </main>
  );

  return (
    <main className="quick-shell">
      <header className="quick-header">
        <a href="/quan-tri" aria-label="Về quản trị"><ChevronLeft /></a>
        <div><span>M FARM</span><h1>Cập nhật tại trại</h1></div>
        <Sprout />
      </header>
      <div className="quick-mode">
        <button className={mode === "update" ? "active" : ""} onClick={() => { setMode("update"); reset(); }}>Cập nhật</button>
        <button className={mode === "new" ? "active" : ""} onClick={() => { setMode("new"); reset(); }}><Plus size={17} /> Thêm mới</button>
      </div>

      {mode === "update" ? (
        <>
          {!asset ? (
            <section className="quick-card">
              <label className="quick-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mã, tên hoặc vị trí…" autoFocus /></label>
              <div className="quick-asset-list">
                {assets.map((item) => <button key={item.id} onClick={() => setSelected(item.id)}><strong>{item.id} · {item.name}</strong><span>{item.location} · {item.species}</span></button>)}
              </div>
            </section>
          ) : (
            <>
              <button className="quick-selected" onClick={() => setSelected("")}><span><strong>{asset.id} · {asset.name}</strong><small>{asset.location}</small></span><span>Đổi</span></button>
              <PhotoPicker files={files} onChange={setFiles} />
              <section className="quick-card">
                <h2>Hôm nay cập nhật gì?</h2>
                <div className="quick-kind-grid">{updateKinds.filter(([value]) => asset.kind === "animal" || value !== "vaccination").map(([value, label]) => <button key={value} className={kind === value ? "active" : ""} onClick={() => setKind(value)}>{label}</button>)}</div>
                {kind === "vaccination" && (
                  <div className="quick-vaccine-fields">
                    <label className="field"><span>Tên vaccine</span><input value={vaccine.name} onChange={(e) => setVaccine({ ...vaccine, name: e.target.value })} placeholder="Ví dụ: Newcastle" /></label>
                    <label className="field"><span>Mũi tiêm</span><input value={vaccine.dose} onChange={(e) => setVaccine({ ...vaccine, dose: e.target.value })} placeholder="Mũi 1" /></label>
                    <label className="field"><span>Ngày nhắc tiếp theo</span><input type="date" value={vaccine.next} onChange={(e) => setVaccine({ ...vaccine, next: e.target.value })} /></label>
                    <label className="field"><span>Số lô</span><input value={vaccine.batch} onChange={(e) => setVaccine({ ...vaccine, batch: e.target.value })} /></label>
                    <label className="field"><span>Người / đơn vị thực hiện</span><input value={vaccine.provider} onChange={(e) => setVaccine({ ...vaccine, provider: e.target.value })} /></label>
                  </div>
                )}
                <label className="field"><span>Chỉ số (không bắt buộc)</span><input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Ví dụ: 0,92 kg hoặc cao 1,5 m" /></label>
                <label className="field"><span>Ghi chú ngắn</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tình hình và việc đã làm…" maxLength={5000} /></label>
              </section>
              <button className="button quick-save" disabled={busy} onClick={submitUpdate}>{busy ? "Đang lưu…" : "Lưu cập nhật"}</button>
            </>
          )}
        </>
      ) : (
        <>
          <section className="quick-card quick-new-form">
            <h2>Hồ sơ mới</h2>
            <div className="quick-kind-grid two"><button className={draft.kind === "animal" ? "active" : ""} onClick={() => setDraft({ ...draft, kind: "animal" })}>Vật nuôi</button><button className={draft.kind === "plant" ? "active" : ""} onClick={() => setDraft({ ...draft, kind: "plant" })}>Cây trồng</button></div>
            <label className="field"><span>Mã định danh</span><input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="GA-005" /></label>
            <label className="field"><span>Tên hồ sơ</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Gà ta 005" /></label>
            <label className="field"><span>Giống</span><input value={draft.species} onChange={(e) => setDraft({ ...draft, species: e.target.value })} placeholder="Gà ta, ổi…" /></label>
            <label className="field"><span>Vị trí</span><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Chuồng A, hàng cây B…" /></label>
            <label className="field"><span>Chỉ số ban đầu</span><input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="0,25 kg hoặc cao 80 cm" /></label>
            {draft.kind === "animal" && (
              <div className="quick-identifier-fields">
                <h3>Mã định danh (không bắt buộc)</h3>
                <label className="field"><span>Loại thẻ</span><select value={identifier.type} onChange={(e) => setIdentifier({ ...identifier, type: e.target.value, placement: e.target.value === "leg_band" ? "Vòng chân" : e.target.value.startsWith("ear_tag") ? "Thẻ tai" : e.target.value === "collar_qr" ? "Vòng cổ" : "Dưới da" })}><option value="leg_band">Vòng chân</option><option value="ear_tag_qr">Thẻ tai QR</option><option value="ear_tag_rfid">Thẻ tai RFID</option><option value="collar_qr">Thẻ QR vòng cổ</option><option value="microchip">Microchip</option></select></label>
                <label className="field"><span>Mã in nhìn thấy</span><input value={identifier.code} onChange={(e) => setIdentifier({ ...identifier, code: e.target.value })} placeholder={draft.id || "GA-005"} /></label>
                {(identifier.type === "ear_tag_rfid" || identifier.type === "microchip") && <label className="field"><span>Mã điện tử</span><input value={identifier.electronic} onChange={(e) => setIdentifier({ ...identifier, electronic: e.target.value })} /></label>}
              </div>
            )}
          </section>
          <PhotoPicker files={files} onChange={setFiles} />
          <button className="button quick-save" disabled={busy} onClick={submitNew}>{busy ? "Đang tạo…" : "Tạo hồ sơ"}</button>
        </>
      )}
    </main>
  );
}
