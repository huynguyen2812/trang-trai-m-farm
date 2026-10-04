"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AssetCover } from "./asset-cover";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sprout,
  Bird,
  LayoutDashboard,
  Users,
  Tag,
  BookOpen,
  ShoppingBag,
  ClipboardList,
  LogOut,
  Plus,
  Search,
  CalendarDays,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Check,
  ScanLine,
  Download,
  FlaskConical,
  Settings2,
  Camera,
  X,
  Syringe,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import qrcode from "qrcode-generator";
import {
  State,
  Asset,
  Package,
  Order,
  money,
  date,
  statusLabel,
} from "@/lib/model";
import { api } from "./account-ui";
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][] | ((values: Record<string, any>) => [string, string][]);
  dependsOn?: string;
  resetOnChange?: string[];
  required?: boolean;
  wide?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
};
type FormSpec = {
  title: string;
  description: string;
  action: string;
  values: Record<string, any>;
  fields: Field[];
};
const healthOptions: [string, string][] = [
  ["healthy", "Khỏe mạnh"],
  ["attention", "Cần theo dõi"],
  ["treatment", "Đang điều trị"],
];
const kindOptions: [string, string][] = [
  ["animal", "Vật nuôi"],
  ["plant", "Cây trồng"],
];
const logLabels: Record<string, string> = {
  growth: "Sinh trưởng",
  food: "Thức ăn",
  medicine: "Thuốc",
  fertilizer: "Phân bón",
  care: "Chăm sóc",
  health: "Sức khỏe",
  flowering: "Ra hoa",
  fruiting: "Nuôi trái",
};
const isoDay = () => new Date().toISOString().slice(0, 10);
const id = (prefix: string) =>
  prefix + "-" + crypto.randomUUID().slice(0, 6).toUpperCase();
function Badge({ value }: { value: string }) {
  return (
    <span
      className={
        "badge " +
        (["healthy", "active", "paid", "completed"].includes(value)
          ? "status-good"
          : [
                "attention",
                "treatment",
                "awaiting_payment",
                "pending",
                "reserved",
              ].includes(value)
            ? "status-warn"
            : "status-neutral")
      }
    >
      {statusLabel[value] || value}
    </span>
  );
}
function Stats({ items }: { items: [string, string, string][] }) {
  return (
    <div className="stat-grid">
      {items.map(([label, value, sub]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{sub}</small>
        </div>
      ))}
    </div>
  );
}
function Logs({
  logs,
  images,
}: {
  logs: State["logs"];
  images: State["log_images"];
}) {
  return logs.length ? (
    <div className="timeline">
      {logs.map((l) => (
        <article key={l.id}>
          <time>
            {date(l.created_at)} · {l.asset_id} · {logLabels[l.kind] || l.kind}
          </time>
          <h3>{l.title}</h3>
          <p style={{ whiteSpace: "pre-line" }}>{l.body}</p>
          {l.metric && (
            <span className="badge" style={{ marginTop: 8 }}>
              {l.metric}
            </span>
          )}
          {(images.some((image) => image.log_id === l.id) || l.image_url) && (
            <div className="log-photo-grid">
              {images
                .filter((image) => image.log_id === l.id)
                .map((image, index) => (
                  <img
                    key={image.id}
                    src={`/api/log-images/${image.id}`}
                    className="detail-photo"
                    loading="lazy"
                    alt={`${l.title} · ảnh ${index + 1}`}
                  />
                ))}
              {l.image_url && (
                <img
                  src={l.image_url}
                  className="detail-photo"
                  loading="lazy"
                  alt={l.title}
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  ) : (
    <div className="empty-inline">
      Chưa có nhật ký. Cập nhật chăm sóc sẽ xuất hiện tại đây.
    </div>
  );
}
function EntryForm({
  spec,
  onClose,
  onSave,
  busy,
}: {
  spec: FormSpec;
  onClose: () => void;
  onSave: (v: any) => Promise<void>;
  busy: boolean;
}) {
  const [values, setValues] = useState({ ...spec.values });
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{spec.title}</DialogTitle>
          <DialogDescription>{spec.description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(values);
          }}
        >
          <div className="form-grid">
            {spec.fields.map((f) => (
              <label className={"field " + (f.wide ? "wide" : "")} key={f.key}>
                <span>
                  {f.label}
                  {f.required !== false ? " *" : ""}
                </span>
                {f.type === "select" ? (
                  <Select
                    value={String(values[f.key] ?? "")}
                    onValueChange={(v) => setValues((current) => {
                      const next = { ...current, [f.key]: v };
                      if (current[f.key] !== v)
                        for (const key of f.resetOnChange || []) next[key] = "";
                      return next;
                    })}
                    disabled={f.disabled || (!!f.dependsOn && !values[f.dependsOn])}
                    required={f.required !== false}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(typeof f.options === "function" ? f.options(values) : f.options)?.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "switch" ? (
                  <Switch
                    checked={!!Number(values[f.key])}
                    onCheckedChange={(v) =>
                      setValues({ ...values, [f.key]: v ? 1 : 0 })
                    }
                    aria-label={f.label}
                  />
                ) : f.type === "textarea" ? (
                  <textarea
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                    required={f.required !== false}
                    maxLength={f.max || 3000}
                  />
                ) : f.type === "images" ? (
                  <div className="photo-picker">
                    <input
                      id="daily-update-images"
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => {
                        const incoming = Array.from(e.target.files || []);
                        const current = (values[f.key] || []) as File[];
                        setValues({
                          ...values,
                          [f.key]: [...current, ...incoming].slice(0, 6),
                        });
                        e.currentTarget.value = "";
                      }}
                    />
                    <label
                      htmlFor="daily-update-images"
                      className="photo-picker-button"
                    >
                      <Camera size={20} />
                      Chụp hoặc chọn ảnh
                    </label>
                    <small>
                      Tối đa 6 ảnh JPG, PNG hoặc WebP; mỗi ảnh dưới 8 MB.
                    </small>
                    {!!values[f.key]?.length && (
                      <div className="photo-preview-grid">
                        {(values[f.key] as File[]).map((file, index) => (
                          <figure
                            key={`${file.name}-${file.lastModified}-${index}`}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Ảnh đã chọn ${index + 1}`}
                            />
                            <button
                              type="button"
                              aria-label={`Bỏ ảnh ${index + 1}`}
                              onClick={() =>
                                setValues({
                                  ...values,
                                  [f.key]: (values[f.key] as File[]).filter(
                                    (_, i) => i !== index,
                                  ),
                                })
                              }
                            >
                              <X size={15} />
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={f.type || "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]:
                          f.type === "number"
                            ? e.target.valueAsNumber
                            : e.target.value,
                      })
                    }
                    required={f.required !== false}
                    disabled={f.disabled}
                    min={f.min}
                    max={f.max}
                    maxLength={200}
                  />
                )}
              </label>
            ))}
          </div>
          <div
            className="actions"
            style={{ justifyContent: "flex-end", marginTop: 22 }}
          >
            <button
              type="button"
              className="button outline"
              disabled={busy}
              onClick={onClose}
            >
              Để sau
            </button>
            <button className="button" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu thông tin"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Workspace({ mode }: { mode: "admin" | "customer" }) {
  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const reload = useCallback(async () => {
    const d = await api("/api/app");
    setData(d);
    setError("");
    return d as State;
  }, []);
  useEffect(() => {
    reload()
      .then((d) => {
        const q = new URLSearchParams(location.search).get("asset");
        if (q && d.assets.some((a) => a.id === q)) setSelectedId(q);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const control = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "view_farm_asset",
          title: "Mở hồ sơ cây hoặc vật nuôi",
          description:
            "Mở hồ sơ một tài sản trong danh sách được phép xem hiện tại. Không thay đổi dữ liệu.",
          inputSchema: {
            type: "object",
            properties: { asset_id: { type: "string" } },
            required: ["asset_id"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: async (input: any) => {
            if (
              typeof input?.asset_id !== "string" ||
              !data?.assets.some((a) => a.id === input.asset_id)
            )
              throw new Error(
                "Không tìm thấy tài sản trong phạm vi được phép xem.",
              );
            setSelectedId(input.asset_id);
            await new Promise((r) => requestAnimationFrame(() => r(null)));
            return { opened_asset_id: input.asset_id };
          },
        },
        { signal: control.signal },
      ),
    ).catch(() => {});
    return () => control.abort();
  }, [data]);
  const isAdmin = mode === "admin";
  const a = data?.assets.find((a) => a.id === selectedId);
  const customerName = (id: string | null) =>
    data?.customers.find((c) => c.id === id)?.name || "Chưa phân bổ";
  const filtered =
    data?.assets.filter(
      (a) =>
        (
          a.id +
          " " +
          a.name +
          " " +
          a.species +
          " " +
          customerName(a.customer_id)
        )
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi")) &&
        (status === "all" || a.status === status),
    ) || [];
  async function mutate(action: string, values: any, extra = {}) {
    setBusy(true);
    try {
      if (action === "addLog") {
        const formData = new FormData();
        for (const key of [
          "asset_id",
          "title",
          "body",
          "kind",
          "metric",
          "health",
        ])
          formData.set(
            key,
            String(values[key] === "unchanged" ? "" : values[key] || ""),
          );
        for (const image of (values.images || []) as File[])
          formData.append("images", image);
        const response = await fetch("/api/log-images", {
          method: "POST",
          body: formData,
        });
        const result: any = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Không thể lưu cập nhật.");
      } else if (action === "saveAsset") {
        const { images = [], ...assetValues } = values as {
          images?: File[];
        } & Record<string, any>;
        await api("/api/app", { action, data: assetValues, ...extra });
        if (images.length) {
          const formData = new FormData();
          formData.set("asset_id", String(assetValues.id));
          formData.set("kind", "growth");
          formData.set("title", "Ảnh hồ sơ ban đầu");
          formData.set(
            "body",
            "Ghi nhận hình ảnh ban đầu khi tạo hồ sơ cây trồng hoặc vật nuôi.",
          );
          formData.set("metric", String(assetValues.weight || ""));
          for (const image of images) formData.append("images", image);
          const response = await fetch("/api/log-images", {
            method: "POST",
            body: formData,
          });
          const result: any = await response.json();
          if (!response.ok)
            throw new Error(
              result.error ||
                "Đã tạo hồ sơ nhưng chưa thể lưu ảnh. Bạn có thể thêm ảnh trong nhật ký.",
            );
        }
      } else {
        await api("/api/app", { action, data: values, ...extra });
      }
      await reload();
      toast.success("Đã lưu thay đổi.");
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/auth", { action: "logout" });
      location.href = "/";
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function assetForm(asset?: Asset) {
    setForm({
      title: asset ? "Cập nhật cây / vật nuôi" : "Thêm cây / vật nuôi",
      description:
        "Mã định danh và giống được giữ nguyên sau khi tạo. Phân bổ cho khách thông qua đơn hàng.",
      action: "saveAsset",
      values: asset
        ? {
            ...asset,
            started_at: asset.started_at.slice(0, 10),
            expected_at: asset.expected_at.slice(0, 10),
          }
        : {
            id: id("MF"),
            name: "",
            species: "Gà ta",
            kind: "animal",
            location: "",
            status: "available",
            health: "healthy",
            progress: 0,
            weight: "",
            images: [],
            started_at: isoDay(),
            expected_at: new Date(Date.now() + 120 * 86400000)
              .toISOString()
              .slice(0, 10),
          },
      fields: [
        { key: "id", label: "Mã định danh", disabled: !!asset },
        { key: "name", label: "Tên cây / con" },
        { key: "species", label: "Giống", disabled: !!asset },
        {
          key: "kind",
          label: "Nhóm",
          type: "select",
          options: kindOptions,
          disabled: !!asset,
        },
        { key: "location", label: "Vị trí nuôi / trồng" },
        {
          key: "health",
          label: "Sức khỏe",
          type: "select",
          options: healthOptions,
        },
        {
          key: "status",
          label: "Trạng thái",
          type: "select",
          options: asset?.customer_id
            ? [
                ["reserved", "Đã giữ chỗ"],
                ["active", "Đang chăm sóc"],
                ["ready", "Đến kỳ bàn giao"],
                ["closed", "Đã hoàn tất"],
              ]
            : [["available", "Đang mở bán"]],
        },
        {
          key: "progress",
          label: "Tiến độ (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        {
          key: "weight",
          label: "Chỉ số hiện tại (kg, chiều cao…)",
          required: false,
          wide: true,
        },
        { key: "started_at", label: "Ngày bắt đầu", type: "date" },
        { key: "expected_at", label: "Ngày dự kiến kết thúc", type: "date" },
        {
          key: "images",
          label: asset ? "Thêm ảnh mới vào hồ sơ" : "Ảnh ban đầu",
          type: "images",
          required: false,
          wide: true,
        },
      ],
    });
  }
  function packageForm(p?: Package) {
    setForm({
      title: p ? "Điều chỉnh gói chăm sóc" : "Thêm gói chăm sóc",
      description:
        "Giá và điều kiện mới chỉ áp dụng cho đơn tạo sau khi lưu. Đơn đã mua giữ nguyên thông tin.",
      action: "savePackage",
      values: p || {
        id: id("PK"),
        name: "",
        species: "Gà ta",
        kind: "animal",
        price: 450000,
        days: 120,
        description: "",
        benefits: "",
        active: 1,
      },
      fields: [
        { key: "id", label: "Mã gói", disabled: !!p },
        { key: "name", label: "Tên gói" },
        { key: "species", label: "Giống áp dụng" },
        { key: "kind", label: "Nhóm", type: "select", options: kindOptions },
        {
          key: "price",
          label: "Giá trọn gói (VND)",
          type: "number",
          min: 1000,
          max: 1000000000,
        },
        {
          key: "days",
          label: "Thời hạn (ngày)",
          type: "number",
          min: 1,
          max: 3650,
        },
        {
          key: "description",
          label: "Mô tả ngắn",
          type: "textarea",
          wide: true,
          max: 2000,
        },
        {
          key: "benefits",
          label: "Quyền lợi & chi phí bao gồm (mỗi dòng một mục)",
          type: "textarea",
          wide: true,
        },
        { key: "active", label: "Mở bán gói", type: "switch", required: false },
      ],
    });
  }
  function logForm(assetId?: string) {
    setForm({
      title: "Cập nhật hôm nay",
      description:
        "Ghi thông tin thực tế. Nội dung sẽ hiển thị trong hồ sơ của khách đang sở hữu cây/con.",
      action: "addLog",
      values: {
        asset_id: assetId || "",
        title: "",
        body: "",
        kind: "growth",
        metric: "",
        images: [],
      },
      fields: [
        {
          key: "asset_id",
          label: "Cây / vật nuôi",
          type: "select",
          options: data?.assets.map((a) => [a.id, a.id + " · " + a.name]),
        },
        {
          key: "kind",
          label: "Loại cập nhật",
          type: "select",
          options: Object.entries(logLabels),
        },
        { key: "title", label: "Tiêu đề", wide: true },
        {
          key: "body",
          label: "Ghi chú tình hình và việc đã làm",
          type: "textarea",
          wide: true,
          max: 5000,
        },
        {
          key: "metric",
          label: "Chỉ số (Sinh trưởng sẽ cập nhật hồ sơ)",
          required: false,
        },
        {
          key: "health",
          label: "Tình trạng sau khi kiểm tra",
          type: "select",
          required: false,
          options: [["unchanged", "Giữ nguyên"], ...healthOptions],
        },
        {
          key: "images",
          label: "Ảnh cây / vật nuôi",
          required: false,
          type: "images",
          wide: true,
        },
      ],
    });
  }
  function vaccinationForm(assetId?: string) {
    setForm({
      title: "Ghi nhận mũi tiêm",
      description:
        "Lưu đúng tên vaccine, mũi tiêm và ngày nhắc để chủ trại và khách hàng cùng theo dõi.",
      action: "addVaccination",
      values: {
        asset_id: assetId || "",
        vaccine_name: "",
        dose_label: "Mũi 1",
        administered_at: isoDay(),
        next_due_at: "",
        batch_number: "",
        provider: "",
        note: "",
      },
      fields: [
        {
          key: "asset_id",
          label: "Vật nuôi",
          type: "select",
          options: data?.assets
            .filter((asset) => asset.kind === "animal")
            .map((asset) => [asset.id, `${asset.id} · ${asset.name}`]),
          disabled: !!assetId,
        },
        { key: "vaccine_name", label: "Tên vaccine", wide: true },
        { key: "dose_label", label: "Mũi tiêm" },
        { key: "administered_at", label: "Ngày tiêm", type: "date" },
        {
          key: "next_due_at",
          label: "Ngày nhắc tiếp theo",
          type: "date",
          required: false,
        },
        { key: "batch_number", label: "Số lô vaccine", required: false },
        {
          key: "provider",
          label: "Người / đơn vị thực hiện",
          required: false,
          wide: true,
        },
        {
          key: "note",
          label: "Ghi chú sau tiêm",
          type: "textarea",
          required: false,
          wide: true,
          max: 2000,
        },
      ],
    });
  }
  function identifierForm(assetId?: string) {
    setForm({
      title: "Gắn mã định danh",
      description:
        "Mã QR chỉ dẫn đến hồ sơ đã bảo vệ. Với RFID hoặc microchip, nhập thêm mã điện tử do thiết bị cung cấp.",
      action: "addAssetIdentifier",
      values: {
        asset_id: assetId || "",
        identifier_type: "leg_band",
        visible_code: assetId || "",
        electronic_code: "",
        placement: "Vòng chân",
        attached_at: isoDay(),
        note: "",
      },
      fields: [
        {
          key: "asset_id",
          label: "Vật nuôi",
          type: "select",
          options: data?.assets
            .filter((asset) => asset.kind === "animal")
            .map((asset) => [asset.id, `${asset.id} · ${asset.name}`]),
          disabled: !!assetId,
        },
        {
          key: "identifier_type",
          label: "Loại định danh",
          type: "select",
          options: [
            ["leg_band", "Vòng chân / mã nhìn thấy"],
            ["ear_tag_qr", "Thẻ tai QR"],
            ["ear_tag_rfid", "Thẻ tai RFID"],
            ["collar_qr", "Thẻ QR vòng cổ"],
            ["microchip", "Microchip"],
          ],
        },
        { key: "visible_code", label: "Mã in nhìn thấy" },
        { key: "electronic_code", label: "Mã RFID / chip", required: false },
        { key: "placement", label: "Vị trí gắn" },
        { key: "attached_at", label: "Ngày gắn", type: "date" },
        {
          key: "note",
          label: "Ghi chú",
          type: "textarea",
          required: false,
          wide: true,
          max: 1000,
        },
      ],
    });
  }
  function allocate() {
    setForm({
      title: "Phân bổ tài sản cho khách",
      description:
        "Tạo đơn chờ thanh toán. Giá, thời hạn và quyền lợi được chốt từ gói đang chọn.",
      action: "purchase",
      values: { asset_id: "", package_id: "", customer_id: "", accepted: true },
      fields: [
        {
          key: "asset_id",
          label: "Cây / con đang mở bán",
          type: "select",
          resetOnChange: ["package_id"],
          options: data?.assets
            .filter((a) => a.status === "available")
            .map((a) => [a.id, a.id + " · " + a.species]),
        },
        {
          key: "package_id",
          label: "Gói chăm sóc cùng giống",
          type: "select",
          dependsOn: "asset_id",
          options: (values) => {
            const selected = data?.assets.find((asset) => asset.id === values.asset_id);
            return (data?.packages || [])
              .filter((p) => p.active && p.kind === selected?.kind && p.species === selected?.species)
              .map((p) => [p.id, p.name + " · " + money(p.price)]);
          },
        },
        {
          key: "customer_id",
          label: "Khách hàng đã xác thực",
          type: "select",
          wide: true,
          options: data?.customers
            .filter((c) => c.email_verified && c.phone_verified)
            .map((c) => [c.id, c.name]),
        },
      ],
    });
  }
  function request(kind: string) {
    if (!a) return;
    setForm({
      title:
        kind === "pickup" ? "Hẹn nhận sản phẩm" : "Đề nghị trang trại mua lại",
      description:
        "Trang trại sẽ tiếp nhận và trao đổi thời gian, giá cùng điều kiện thực tế. Gửi yêu cầu chưa phải xác nhận giao dịch.",
      action: "request",
      values: { asset_id: a.id, kind, note: "" },
      fields: [
        {
          key: "note",
          label: "Lời nhắn cho trang trại",
          type: "textarea",
          required: false,
          wide: true,
          max: 2000,
        },
      ],
    });
  }
  const qr = useMemo(() => {
    if (!selectedId || typeof window === "undefined") return "";
    const q = qrcode(0, "M");
    q.addData(
      location.origin + "/tai-san?asset=" + encodeURIComponent(selectedId),
    );
    q.make();
    return q.createDataURL(4, 4);
  }, [selectedId]);
  if (loading)
    return (
      <div className="loading">
        <Sprout style={{ margin: "0 auto 16px" }} />
        Đang mở trang trại của bạn…
      </div>
    );
  if (!data || error)
    return (
      <div className="page-wrap">
        <a href="/" className="brand">
          <Sprout />M FARM
        </a>
        <div className="empty-state">
          <ShieldCheck size={40} />
          <h2>Vào trang trại của bạn</h2>
          <p>{error || "Vui lòng đăng nhập để tiếp tục."}</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <a href={"/dang-nhap" + (typeof window !== "undefined" && new URLSearchParams(location.search).get("asset") ? "?asset=" + encodeURIComponent(new URLSearchParams(location.search).get("asset")!) : "")} className="button">
              Đăng nhập & xác thực
            </a>
            <a href="/demo" className="button outline">
              Trải nghiệm bản mẫu
            </a>
            <button
              className="button outline"
              onClick={() => {
                setLoading(true);
                reload()
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  if (isAdmin && data.actor.role !== "admin")
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <ShieldCheck size={40} />
          <h2>Khu vực của chủ trang trại</h2>
          <p>Tài khoản hiện tại không có quyền quản trị.</p>
          <a href="/tai-san" className="button">
            Về tài sản của tôi
          </a>
          {data.actor.demo && (
            <a
              href="/demo"
              className="button outline"
              style={{ marginLeft: 15 }}
            >
              Đổi vai trò mẫu
            </a>
          )}
        </div>
      </div>
    );
  const menus: [string, string, LucideIcon][] = isAdmin
    ? [
        ["overview", "Tổng quan", LayoutDashboard],
        ["assets", "Cây & vật nuôi", Sprout],
        ["customers", "Khách hàng", Users],
        ["packages", "Giá & gói chăm sóc", Tag],
        ["orders", "Đơn hàng", ShoppingBag],
        ["logs", "Nhật ký chăm sóc", BookOpen],
        ["requests", "Yêu cầu của khách", ClipboardList],
      ]
    : [
        ["overview", "Trang trại của tôi", LayoutDashboard],
        ["assets", "Tài sản của tôi", Sprout],
        ["orders", "Đơn hàng & điều kiện", ShoppingBag],
        ["logs", "Nhật ký sinh trưởng", BookOpen],
        ["requests", "Yêu cầu đã gửi", ClipboardList],
      ];
  const titles: Record<string, string> = isAdmin
    ? {
        overview: "Hôm nay ở trang trại",
        assets: "Cây & vật nuôi",
        customers: "Khách hàng của M FARM",
        packages: "Giá & gói chăm sóc",
        orders: "Đơn hàng & phân bổ",
        logs: "Nhật ký chăm sóc",
        requests: "Yêu cầu của khách",
      }
    : {
        overview: "Trang trại nhỏ của bạn",
        assets: "Những điều bạn đang chăm",
        orders: "Đơn hàng & điều kiện",
        logs: "Từng ngày lớn lên",
        requests: "Yêu cầu của bạn",
      };
  const assetCards = (
    <div className="card-grid">
      {filtered.map((asset) => (
        <article className="catalog-card" key={asset.id}>
          <AssetCover asset={asset} images={data.log_images} />
          <div className="catalog-body">
            <div className="asset-card-meta">
              <span>{asset.id}</span>
              <Badge value={asset.health} />
            </div>
            <h3>{asset.name}</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              {asset.location} · {asset.weight}
            </p>
            <div className="meter">
              <div>
                <span>Hành trình sinh trưởng</span>
                <span>{asset.progress}%</span>
              </div>
              <Progress
                value={asset.progress}
                aria-label={"Tiến độ " + asset.name}
              />
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              Cập nhật gần nhất:{" "}
              {data.logs.find((log) => log.asset_id === asset.id)
                ? date(
                    data.logs.find((log) => log.asset_id === asset.id)!
                      .created_at,
                  )
                : "Chưa có nhật ký"}
              <br />
              Dự kiến đến kỳ: {date(asset.expected_at)}
            </p>
            <button
              className="button outline"
              onClick={() => setSelectedId(asset.id)}
            >
              Xem hồ sơ & nhật ký
            </button>
          </div>
        </article>
      ))}
    </div>
  );
  const assetTable = (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Cây / vật nuôi",
              "Sinh trưởng",
              "Trạng thái",
              "Khách nhận nuôi",
              "Dự kiến đến kỳ",
              "",
            ].map((t, i) => (
              <TableHead key={i}>{t}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell>
                <button
                  onClick={() => setSelectedId(asset.id)}
                  className="table-link"
                >
                  {asset.name}
                </button>
                <div className="muted" style={{ fontSize: 12 }}>
                  {asset.id} · {asset.location}
                </div>
              </TableCell>
              <TableCell>
                <strong>{asset.weight || "Chưa cập nhật"}</strong>
                <div style={{ marginTop: 6 }}>
                  <Badge value={asset.health} />
                </div>
              </TableCell>
              <TableCell>
                <Badge value={asset.status} />
              </TableCell>
              <TableCell>{customerName(asset.customer_id)}</TableCell>
              <TableCell>{date(asset.expected_at)}</TableCell>
              <TableCell>
                <button
                  className="button small outline"
                  onClick={() => assetForm(asset)}
                >
                  Cập nhật
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!filtered.length && (
        <div className="empty-inline">Chưa có cây/con phù hợp.</div>
      )}
    </div>
  );
  return (
    <SidebarProvider
      className={
        isAdmin
          ? "farm-workspace owner-workspace"
          : "farm-workspace customer-workspace"
      }
    >
      {isAdmin && (
        <Sidebar>
          <SidebarHeader>
            <a href="/" className="brand sidebar-brand">
              <Sprout />M FARM
            </a>
            <span
              style={{ fontSize: 12, color: "#bdd0be", padding: "0 20px 20px" }}
            >
              {isAdmin ? "ĐIỀU HÀNH TRANG TRẠI" : "KHÔNG GIAN CỦA BẠN"}
            </span>
          </SidebarHeader>
          <SidebarContent style={{ padding: "0 12px" }}>
            {isAdmin && (
              <a
                href="/cap-nhat"
                className="button lime"
                style={{ margin: "0 8px 14px" }}
              >
                <Camera size={18} /> Cập nhật nhanh trên điện thoại
              </a>
            )}
            <SidebarMenu>
              {menus.map(([key, label, Icon]) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={section === key}
                    onClick={() => {
                      setSection(key);
                      setQuery("");
                      setStatus("all");
                    }}
                    style={{ padding: "23px 13px", fontSize: 14 }}
                  >
                    <Icon />
                    <span>{label}</span>
                    {key === "requests" &&
                      data.requests.filter((r) => r.status === "pending")
                        .length > 0 && (
                        <span className="session-label">
                          {
                            data.requests.filter((r) => r.status === "pending")
                              .length
                          }
                        </span>
                      )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div style={{ padding: 15, marginTop: 25 }}>
              <a
                href="/nhan-nuoi"
                className="button lime small"
                style={{ width: "100%" }}
              >
                {isAdmin ? "Xem trang mở bán" : "Nhận nuôi thêm"}
              </a>
            </div>
          </SidebarContent>
          <SidebarFooter className="sidebar-bottom">
            <span>{data.actor.name}</span>
            <span>
              {data.actor.demo
                ? "Phiên trải nghiệm riêng"
                : "Tài khoản chủ trang trại"}
            </span>
            <button
              onClick={logout}
              className="actions"
              style={{ paddingTop: 15 }}
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </SidebarFooter>
        </Sidebar>
      )}
      <SidebarInset>
        <header className="app-topbar">
          {isAdmin ? (
            <SidebarTrigger />
          ) : (
            <Link className="brand" href="/">
              {" "}
              <Sprout /> M FARM
            </Link>
          )}
          <span>
            {isAdmin
              ? "M FARM / Quản trị trang trại"
              : "M FARM / Không gian khách hàng"}
          </span>
          {data.actor.demo ? (
            <>
              <span className="session-label" style={{ flex: "none" }}>
                DỮ LIỆU MẪU
              </span>
              <a href="/demo" style={{ fontSize: 13 }}>
                Đổi vai trò
              </a>
            </>
          ) : (
            <span className="badge">
              <ShieldCheck size={14} />
              Đã xác thực
            </span>
          )}
        </header>
        {!isAdmin && (
          <nav
            className="customer-navigation"
            aria-label="Không gian khách hàng"
          >
            {menus.map(([key, label, Icon]) => (
              <button
                key={key}
                aria-current={section === key ? "page" : undefined}
                onClick={() => {
                  setSection(key);
                  setQuery("");
                  setStatus("all");
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
            <button onClick={logout}>
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </nav>
        )}
        <main className="workspace">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {isAdmin
                  ? "CHĂM TỪNG CÁ THỂ · HIỂU TỪNG MÙA VỤ"
                  : "MỖI NGÀY, THÊM MỘT CHÚT LỚN LÊN"}
              </div>
              <h1>{titles[section]}</h1>
              <p>
                {isAdmin
                  ? "Theo dõi sinh trưởng, khách hàng và các gói đồng hành."
                  : `Chào ${data.actor.name.replace(" (mẫu)", "")}, cùng ghé thăm những điều bạn đang chăm.`}
              </p>
            </div>
            {isAdmin && (
              <button
                className="button small"
                onClick={() =>
                  section === "packages"
                    ? packageForm()
                    : section === "orders"
                      ? allocate()
                      : section === "logs"
                        ? logForm()
                        : assetForm()
                }
              >
                <Plus size={16} />
                {section === "packages"
                  ? "Thêm gói chăm sóc"
                  : section === "orders"
                    ? "Phân bổ tài sản"
                    : section === "logs"
                      ? "Thêm nhật ký"
                      : "Thêm cây / con"}
              </button>
            )}
          </div>
          {data.actor.demo && (
            <div className="notice">
              Phiên trải nghiệm riêng · Mọi dữ liệu, giá và trạng thái xác thực
              dưới đây đều là mẫu. Thay đổi được lưu để bạn thử quy trình; không
              phát sinh giao dịch thật.
            </div>
          )}
          {section === "overview" && (
            <>
              <Stats
                items={
                  isAdmin
                    ? [
                        [
                          "Cây & vật nuôi",
                          String(data.assets.length),
                          `${data.assets.filter((a) => a.status === "available").length} đang mở bán`,
                        ],
                        [
                          "Đang có khách",
                          String(
                            data.assets.filter(
                              (a) => a.customer_id && a.status !== "closed",
                            ).length,
                          ),
                          "Cây / con đã phân bổ",
                        ],
                        [
                          "Cần theo dõi",
                          String(
                            data.assets.filter((a) => a.health !== "healthy")
                              .length,
                          ),
                          "Kiểm tra sức khỏe",
                        ],
                        [
                          "Đã xác nhận thu",
                          money(
                            data.orders
                              .filter((o) => o.status === "paid")
                              .reduce((s, o) => s + o.price, 0),
                          ),
                          `${data.orders.filter((o) => o.status === "awaiting_payment").length} đơn chờ thanh toán`,
                        ],
                      ]
                    : [
                        [
                          "Tài sản của bạn",
                          String(data.assets.length),
                          "Cây / con đã nhận nuôi",
                        ],
                        [
                          "Đang chăm sóc",
                          String(
                            data.assets.filter((a) => a.status === "active")
                              .length,
                          ),
                          "Đồng hành mỗi ngày",
                        ],
                        [
                          "Đã thanh toán",
                          money(
                            data.orders
                              .filter((o) => o.status === "paid")
                              .reduce((s, o) => s + o.price, 0),
                          ),
                          "Theo giá đã chốt",
                        ],
                        [
                          "Yêu cầu đang xử lý",
                          String(
                            data.requests.filter(
                              (r) => r.status !== "completed",
                            ).length,
                          ),
                          "Chờ phản hồi từ trang trại",
                        ],
                      ]
                }
              />
              {isAdmin ? (
                <div className="split">
                  <section className="panel">
                    <div className="section-heading">
                      <h3>Cần chú ý hôm nay</h3>
                      <HeartPulse size={20} />
                    </div>
                    {data.assets
                      .filter((a) => a.health !== "healthy")
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedId(a.id)}
                          style={{
                            display: "block",
                            textAlign: "left",
                            width: "100%",
                            padding: "18px 0",
                            borderBottom: "1px solid #e5ebe3",
                          }}
                        >
                          <strong>{a.name}</strong>
                          <p className="muted" style={{ fontSize: 14 }}>
                            {a.id} · {a.location} · {a.weight}
                          </p>
                          <Badge value={a.health} />
                        </button>
                      ))}
                    {!data.assets.some((a) => a.health !== "healthy") && (
                      <p className="muted">
                        Không có cây/con được đánh dấu cần theo dõi.
                      </p>
                    )}
                    <h3 style={{ marginTop: 30 }}>Phân bổ theo nhóm</h3>
                    {kindOptions.map(([k, l]) => (
                      <div key={k} className="meter">
                        <div>
                          <span>{l}</span>
                          <span>
                            {data.assets.filter((a) => a.kind === k).length} cá
                            thể
                          </span>
                        </div>
                        <Progress
                          value={
                            data.assets.length
                              ? (data.assets.filter((a) => a.kind === k)
                                  .length /
                                  data.assets.length) *
                                100
                              : 0
                          }
                          aria-label={l}
                        />
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <h3>Nhật ký gần đây</h3>
                    <Logs
                      logs={data.logs.slice(0, 3)}
                      images={data.log_images}
                    />
                    <button
                      className="text-link"
                      onClick={() => setSection("logs")}
                    >
                      Xem tất cả nhật ký
                    </button>
                  </section>
                </div>
              ) : (
                <>
                  <div className="section-heading">
                    <h3>Cây & con của bạn</h3>
                    <a href="/nhan-nuoi" className="text-link">
                      Nhận nuôi thêm
                    </a>
                  </div>
                  {assetCards}
                  {!data.assets.length && (
                    <div className="panel empty-state">
                      <Sprout size={38} />
                      <h3>Hành trình đầu tiên đang chờ bạn</h3>
                      <p>Chọn cây hoặc vật nuôi từ danh mục mở bán.</p>
                      <a href="/nhan-nuoi" className="button">
                        Khám phá các gói
                      </a>
                    </div>
                  )}
                  <section className="panel" style={{ marginTop: 25 }}>
                    <h3>Những cập nhật mới nhất</h3>
                    <Logs
                      logs={data.logs.slice(0, 4)}
                      images={data.log_images}
                    />
                  </section>
                </>
              )}
            </>
          )}
          {section === "assets" && (
            <>
              <div className="toolbar">
                <input
                  aria-label="Tìm cây hoặc vật nuôi"
                  placeholder="Tìm theo mã, tên, giống hoặc khách hàng…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger style={{ minWidth: 200, height: 46 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {["available", "reserved", "active", "ready", "closed"].map(
                      (s) => (
                        <SelectItem value={s} key={s}>
                          {statusLabel[s]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin ? assetTable : assetCards}
              {!isAdmin && !filtered.length && (
                <div className="empty-inline">Không có tài sản phù hợp.</div>
              )}
            </>
          )}
          {section === "packages" && isAdmin && (
            <>
              <div className="notice">
                Giá mới chỉ áp dụng cho đơn hàng mới. Các đơn đã mua luôn giữ
                giá, thời hạn và quyền lợi đã chốt.
              </div>
              <div className="card-grid">
                {data.packages.map((p) => (
                  <article className="panel" key={p.id}>
                    <div className="actions">
                      <Tag size={20} />
                      <span className="badge">
                        {p.active ? "Đang mở bán" : "Tạm ẩn"}
                      </span>
                    </div>
                    <h3 style={{ marginTop: 20 }}>{p.name}</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 14, marginTop: 12 }}
                    >
                      {p.species} · {p.days} ngày
                    </p>
                    <div className="price">{money(p.price)}</div>
                    <p className="muted" style={{ fontSize: 14 }}>
                      {p.description}
                    </p>
                    <ul className="list-clean">
                      {p.benefits.split("\n").map((b) => (
                        <li key={b}>
                          <Check size={14} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <button
                      className="button outline"
                      onClick={() => packageForm(p)}
                      style={{ marginTop: 20, width: "100%" }}
                    >
                      Điều chỉnh gói
                    </button>
                  </article>
                ))}
              </div>
              {!data.packages.length && (
                <div className="empty-inline">
                  Chưa có gói. Thêm gói đầu tiên để mở bán.
                </div>
              )}
            </>
          )}
          {section === "customers" && isAdmin && (
            <>
              <div className="toolbar">
                <input
                  aria-label="Tìm khách hàng"
                  placeholder="Tìm tên, email hoặc số điện thoại…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="panel" style={{ padding: 0 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[
                        "Khách hàng",
                        "Liên hệ",
                        "Xác thực",
                        "Tài sản",
                        "Đã thanh toán",
                        "",
                      ].map((t, i) => (
                        <TableHead key={i}>{t}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customers
                      .filter((c) =>
                        (c.name + c.email + c.phone)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <strong>{c.name}</strong>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {c.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            {c.email}
                            <br />
                            <span className="muted">{c.phone}</span>
                          </TableCell>
                          <TableCell>
                            <span className="badge">
                              {c.email_verified && c.phone_verified
                                ? "Email + Điện thoại"
                                : "Chưa đủ xác thực"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {
                              data.assets.filter((a) => a.customer_id === c.id)
                                .length
                            }{" "}
                            cây / con
                          </TableCell>
                          <TableCell>
                            {money(
                              data.orders
                                .filter(
                                  (o) =>
                                    o.customer_id === c.id &&
                                    o.status === "paid",
                                )
                                .reduce((s, o) => s + o.price, 0),
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              className="button small outline"
                              onClick={() =>
                                setForm({
                                  title: "Hồ sơ khách hàng",
                                  description:
                                    "Email và số điện thoại được quản lý qua dịch vụ xác thực. Không thể tự đánh dấu xác thực.",
                                  action: "saveCustomer",
                                  values: { id: c.id, name: c.name },
                                  fields: [
                                    {
                                      key: "name",
                                      label: "Tên hiển thị",
                                      wide: true,
                                    },
                                  ],
                                })
                              }
                            >
                              Chỉnh tên
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {section === "orders" && (
            <div className="panel" style={{ padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      "Mã đơn / Cá thể",
                      ...(isAdmin ? ["Khách hàng"] : []),
                      "Gói đã chốt",
                      "Giá mua",
                      "Thời gian",
                      "Trạng thái",
                      "",
                    ].map((t, i) => (
                      <TableHead key={i}>{t}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <button
                          className="table-link"
                          onClick={() => setOrderDetail(o)}
                        >
                          {o.id}
                        </button>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {o.asset_id}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>{customerName(o.customer_id)}</TableCell>
                      )}
                      <TableCell>
                        {o.package_name}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {o.days} ngày
                        </div>
                      </TableCell>
                      <TableCell>
                        <strong>{money(o.price)}</strong>
                      </TableCell>
                      <TableCell>
                        {date(o.created_at)}
                        <div className="muted" style={{ fontSize: 12 }}>
                          Đến {date(o.expected_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge value={o.status} />
                      </TableCell>
                      <TableCell>
                        {isAdmin && o.status === "awaiting_payment" ? (
                          <button
                            className="button small"
                            onClick={() => setOrderDetail(o)}
                          >
                            Xử lý thanh toán
                          </button>
                        ) : (
                          <button
                            className="button small outline"
                            onClick={() => setOrderDetail(o)}
                          >
                            Chi tiết
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!data.orders.length && (
                <div className="empty-inline">Chưa có đơn hàng.</div>
              )}
            </div>
          )}
          {section === "logs" && (
            <section className="panel">
              <div className="toolbar">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger style={{ minWidth: 250 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả cây / vật nuôi</SelectItem>
                    {data.assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.id} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Logs
                logs={data.logs.filter(
                  (l) => status === "all" || l.asset_id === status,
                )}
                images={data.log_images.filter(
                  (image) => status === "all" || image.asset_id === status,
                )}
              />
            </section>
          )}
          {section === "requests" && (
            <div className="panel" style={{ padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      "Yêu cầu",
                      "Cây / con",
                      ...(isAdmin ? ["Khách hàng"] : []),
                      "Lời nhắn",
                      "Ngày gửi",
                      "Trạng thái",
                      "",
                    ].map((t, i) => (
                      <TableHead key={i}>{t}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <strong>{statusLabel[r.kind]}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {r.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          className="table-link"
                          onClick={() => setSelectedId(r.asset_id)}
                        >
                          {r.asset_id}
                        </button>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>{customerName(r.customer_id)}</TableCell>
                      )}
                      <TableCell
                        style={{ maxWidth: 220, whiteSpace: "normal" }}
                      >
                        {r.note || "—"}
                      </TableCell>
                      <TableCell>{date(r.created_at)}</TableCell>
                      <TableCell>
                        <Badge value={r.status} />
                      </TableCell>
                      <TableCell>
                        {isAdmin && r.status !== "completed" && (
                          <button
                            disabled={busy}
                            className="button small outline"
                            onClick={() =>
                              mutate("updateRequest", {
                                id: r.id,
                                status:
                                  r.status === "pending"
                                    ? "approved"
                                    : "completed",
                              })
                            }
                          >
                            {r.status === "pending"
                              ? "Tiếp nhận"
                              : "Đã bàn giao"}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!data.requests.length && (
                <div className="empty-inline">
                  Chưa có yêu cầu. Khách có thể gửi từ hồ sơ từng cây/con.
                </div>
              )}
            </div>
          )}
        </main>
      </SidebarInset>
      <Sheet
        open={!!a}
        onOpenChange={(v) => {
          if (!v) setSelectedId(null);
        }}
      >
        <SheetContent className="farm-asset-sheet w-full overflow-y-auto p-6 sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>{a?.name}</SheetTitle>
            <SheetDescription>{a?.id} · Hồ sơ theo dõi cá thể</SheetDescription>
          </SheetHeader>
          {a && (
            <>
              <AssetCover asset={a} images={data.log_images} />
              <div className="actions" style={{ marginTop: 20 }}>
                <Badge value={a.status} />
                <Badge value={a.health} />
              </div>
              <dl className="detail-grid">
                {[
                  ["Giống", a.species],
                  ["Vị trí", a.location],
                  ["Chỉ số hiện tại", a.weight || "Chưa có"],
                  ["Tiến độ", a.progress + "%"],
                  ["Bắt đầu", date(a.started_at)],
                  ["Dự kiến đến kỳ", date(a.expected_at)],
                  ["Khách nhận nuôi", customerName(a.customer_id)],
                  [
                    "Gói chăm sóc",
                    data.packages.find((p) => p.id === a.package_id)?.name ||
                      "Chưa chọn",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <Progress value={a.progress} aria-label="Tiến độ sinh trưởng" />
              <Tabs defaultValue="history" className="section-tabs">
                <TabsList>
                  <TabsTrigger value="history">Nhật ký</TabsTrigger>
                  {a.kind === "animal" && (
                    <TabsTrigger value="vaccination">Tiêm ngừa</TabsTrigger>
                  )}
                  {a.kind === "animal" && (
                    <TabsTrigger value="identity">Định danh</TabsTrigger>
                  )}
                  <TabsTrigger value="agreement">Đơn & điều kiện</TabsTrigger>
                  <TabsTrigger value="qr">Mã QR</TabsTrigger>
                </TabsList>
                <TabsContent value="history">
                  <Logs
                    logs={data.logs.filter((l) => l.asset_id === a.id)}
                    images={data.log_images.filter(
                      (image) => image.asset_id === a.id,
                    )}
                  />
                  {isAdmin && (
                    <button className="button" onClick={() => logForm(a.id)}>
                      <Plus size={16} />
                      Cập nhật hôm nay
                    </button>
                  )}
                </TabsContent>
                {a.kind === "animal" && (
                  <TabsContent value="vaccination">
                    <div className="vaccination-list">
                      {data.vaccinations
                        .filter((item) => item.asset_id === a.id)
                        .map((item) => {
                          const due =
                            item.next_due_at &&
                            Date.parse(item.next_due_at) <=
                              Date.now() + 14 * 86400000;
                          return (
                            <article key={item.id} className="vaccination-card">
                              <div className="vaccination-icon">
                                <Syringe size={20} />
                              </div>
                              <div>
                                <div className="actions">
                                  <strong>{item.vaccine_name}</strong>
                                  {due && (
                                    <span className="badge status-warn">
                                      Sắp đến hạn
                                    </span>
                                  )}
                                </div>
                                <p>
                                  {item.dose_label} · Tiêm ngày{" "}
                                  {date(item.administered_at)}
                                </p>
                                {item.next_due_at && (
                                  <p>
                                    <strong>Nhắc tiếp:</strong>{" "}
                                    {date(item.next_due_at)}
                                  </p>
                                )}
                                {item.batch_number && (
                                  <p>Số lô: {item.batch_number}</p>
                                )}
                                {item.provider && (
                                  <p>Thực hiện: {item.provider}</p>
                                )}
                                {item.note && (
                                  <p className="muted">{item.note}</p>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      {!data.vaccinations.some(
                        (item) => item.asset_id === a.id,
                      ) && (
                        <div className="empty-inline">
                          Chưa có dữ liệu tiêm ngừa.
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        className="button"
                        onClick={() => vaccinationForm(a.id)}
                      >
                        <Syringe size={16} /> Ghi nhận mũi tiêm
                      </button>
                    )}
                  </TabsContent>
                )}
                {a.kind === "animal" && (
                  <TabsContent value="identity">
                    <div className="identifier-list">
                      {data.asset_identifiers
                        .filter((item) => item.asset_id === a.id)
                        .map((item) => (
                          <article key={item.id} className="identifier-card">
                            <div className="identifier-code">
                              {item.visible_code}
                            </div>
                            <div>
                              <strong>
                                {(
                                  {
                                    leg_band: "Vòng chân",
                                    ear_tag_qr: "Thẻ tai QR",
                                    ear_tag_rfid: "Thẻ tai RFID",
                                    collar_qr: "Thẻ QR vòng cổ",
                                    microchip: "Microchip",
                                  } as Record<string, string>
                                )[item.identifier_type] || item.identifier_type}
                              </strong>
                              <p>
                                {item.placement} · Gắn ngày{" "}
                                {date(item.attached_at)}
                              </p>
                              {item.electronic_code && (
                                <p>Mã điện tử: {item.electronic_code}</p>
                              )}
                              <span
                                className={`badge ${item.status === "active" ? "status-good" : "status-neutral"}`}
                              >
                                {(
                                  {
                                    active: "Đang sử dụng",
                                    lost: "Đã mất",
                                    damaged: "Đã hỏng",
                                    replaced: "Đã thay",
                                    removed: "Đã tháo",
                                  } as Record<string, string>
                                )[item.status] || item.status}
                              </span>
                              {item.note && (
                                <p className="muted">{item.note}</p>
                              )}
                              {isAdmin && item.status === "active" && (
                                <div className="identifier-actions">
                                  <button
                                    onClick={() =>
                                      mutate("retireAssetIdentifier", {
                                        id: item.id,
                                        status: "lost",
                                      })
                                    }
                                  >
                                    Báo mất
                                  </button>
                                  <button
                                    onClick={() =>
                                      mutate("retireAssetIdentifier", {
                                        id: item.id,
                                        status: "replaced",
                                      })
                                    }
                                  >
                                    Đã thay
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      {!data.asset_identifiers.some(
                        (item) => item.asset_id === a.id,
                      ) && (
                        <div className="empty-inline">
                          Chưa gắn mã định danh.
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        className="button"
                        onClick={() => identifierForm(a.id)}
                      >
                        <ScanLine size={16} /> Gắn mã định danh
                      </button>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="agreement">
                  {data.orders
                    .filter((o) => o.asset_id === a.id)
                    .map((o) => (
                      <div
                        key={o.id}
                        className="panel"
                        style={{ marginTop: 20 }}
                      >
                        <Badge value={o.status} />
                        <h3 style={{ marginTop: 15 }}>{o.package_name}</h3>
                        <div className="price">{money(o.price)}</div>
                        <p className="muted" style={{ fontSize: 13 }}>
                          Giá tại thời điểm mua · {o.days} ngày
                        </p>
                        <p
                          style={{
                            whiteSpace: "pre-line",
                            fontSize: 14,
                            marginTop: 20,
                          }}
                        >
                          {o.terms}
                        </p>
                      </div>
                    ))}
                  {!a.customer_id && (
                    <div className="empty-inline">Chưa có đơn nhận nuôi.</div>
                  )}
                </TabsContent>
                <TabsContent value="qr">
                  <div
                    className="panel"
                    style={{ marginTop: 20, textAlign: "center" }}
                  >
                    <img
                      className="qr"
                      src={qr}
                      alt={"Mã QR hồ sơ " + a.id}
                      width={180}
                      height={180}
                    />
                    <h3>{a.id}</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 13, margin: "15px 0" }}
                    >
                      Quét để mở hồ sơ. Người xem phải đăng nhập và có quyền
                      truy cập tài sản.
                    </p>
                    <a
                      className="button small outline"
                      href={qr}
                      download={a.id + ".gif"}
                    >
                      <Download size={14} />
                      Tải mã QR
                    </a>
                  </div>
                </TabsContent>
              </Tabs>
              {isAdmin ? (
                <button className="button outline" onClick={() => assetForm(a)}>
                  Cập nhật hồ sơ
                </button>
              ) : (
                ["active", "ready"].includes(a.status) && (
                  <div className="actions">
                    <button
                      className="button"
                      onClick={() => request("pickup")}
                    >
                      Hẹn nhận sản phẩm
                    </button>
                    <button
                      className="button outline"
                      onClick={() => request("buyback")}
                    >
                      Đề nghị mua lại
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      {form && (
        <EntryForm
          key={form.action + form.values.id}
          spec={form}
          onClose={() => setForm(null)}
          onSave={(v) => mutate(form.action, v)}
          busy={busy}
        />
      )}
      <Dialog
        open={!!orderDetail}
        onOpenChange={(v) => {
          if (!v) setOrderDetail(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Đơn {orderDetail?.id}</DialogTitle>
            <DialogDescription>
              Điều kiện được lưu tại thời điểm tạo đơn hàng.
            </DialogDescription>
          </DialogHeader>
          {orderDetail && (
            <>
              <Badge value={orderDetail.status} />
              <h3>{orderDetail.package_name}</h3>
              <div className="price">{money(orderDetail.price)}</div>
              <p>
                {orderDetail.asset_id} · {date(orderDetail.created_at)} –{" "}
                {date(orderDetail.expected_at)}
              </p>
              <p style={{ whiteSpace: "pre-line", fontSize: 14 }}>
                {orderDetail.terms}
              </p>
              {isAdmin && orderDetail.status === "awaiting_payment" && (
                <>
                  <div className="notice">
                    Chỉ xác nhận sau khi đã kiểm tra khoản tiền thực nhận. Thao
                    tác này đánh dấu đơn đã thanh toán và bắt đầu chăm sóc.
                  </div>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api("/api/app", {
                          action: "confirmPayment",
                          id: orderDetail.id,
                        });
                        await reload();
                        setOrderDetail(null);
                        toast.success("Đã ghi nhận thanh toán.");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Đã nhận đủ {money(orderDetail.price)}
                  </button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
