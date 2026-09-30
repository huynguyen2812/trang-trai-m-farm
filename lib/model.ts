export type Package = {
  id: string;
  name: string;
  species: string;
  kind: string;
  price: number;
  days: number;
  description: string;
  benefits: string;
  active: number;
};
export type Asset = {
  id: string;
  name: string;
  species: string;
  kind: string;
  location: string;
  status: string;
  health: string;
  progress: number;
  weight: string;
  started_at: string;
  expected_at: string;
  customer_id: string | null;
  package_id: string | null;
};
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  email_verified: number;
  phone_verified: number;
  created_at: string;
};
export type Order = {
  id: string;
  asset_id: string;
  customer_id: string;
  package_id: string;
  package_name: string;
  price: number;
  days: number;
  terms: string;
  status: string;
  created_at: string;
  expected_at: string;
};
export type Log = {
  id: string;
  asset_id: string;
  title: string;
  body: string;
  kind: string;
  metric: string;
  image_url: string;
  created_at: string;
};
export type LogImage = {
  id: string;
  log_id: string;
  asset_id: string;
  file_name: string;
  byte_size: number;
  created_at: string;
};
export type Vaccination = {
  id: string;
  asset_id: string;
  vaccine_name: string;
  dose_label: string;
  administered_at: string;
  next_due_at: string | null;
  batch_number: string;
  provider: string;
  note: string;
  created_at: string;
};
export type RequestItem = {
  id: string;
  asset_id: string;
  customer_id: string;
  kind: string;
  note: string;
  status: string;
  created_at: string;
};
export type State = {
  actor: {
    id: string;
    name: string;
    role: string;
    demo: boolean;
    email: string;
  };
  assets: Asset[];
  packages: Package[];
  customers: Customer[];
  orders: Order[];
  logs: Log[];
  log_images: LogImage[];
  vaccinations: Vaccination[];
  requests: RequestItem[];
};
export const money = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v);
export const date = (v: string) =>
  v
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(v))
    : "Chưa xác định";
export const statusLabel: Record<string, string> = {
  available: "Đang mở bán",
  reserved: "Đã giữ chỗ",
  active: "Đang chăm sóc",
  ready: "Đến kỳ bàn giao",
  closed: "Đã hoàn tất",
  awaiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  pending: "Chờ xử lý",
  approved: "Đã tiếp nhận",
  completed: "Đã hoàn tất",
  healthy: "Khỏe mạnh",
  attention: "Cần theo dõi",
  treatment: "Đang điều trị",
  pickup: "Nhận sản phẩm",
  buyback: "Đề nghị mua lại",
};
export const samplePackages: Package[] = [
  {
    id: "PK-GA-01",
    name: "Gà ta · Trọn vòng đời",
    species: "Gà ta",
    kind: "animal",
    price: 450000,
    days: 120,
    description:
      "Nhận nuôi một con gà ta. Đồng hành từ con giống đến ngày đủ tuổi xuất chuồng.",
    benefits:
      "Con giống và chăm sóc hằng ngày\nNhật ký mỗi tuần, cập nhật khi dùng thuốc\nHồ sơ cá thể và mã QR\nNhận tại trại khi kết thúc",
    active: 1,
  },
  {
    id: "PK-GA-02",
    name: "Gà ta · Chăm sóc mở rộng",
    species: "Gà ta",
    kind: "animal",
    price: 590000,
    days: 150,
    description:
      "Thêm thời gian chăm sóc, phù hợp với gia đình muốn theo dõi một hành trình dài hơn.",
    benefits:
      "Con giống và 150 ngày chăm sóc\nNhật ký, chỉ số cân nặng theo tuần\nGhi nhận thức ăn và thuốc sử dụng\nHẹn lịch nhận trực tiếp tại trại",
    active: 1,
  },
  {
    id: "PK-OI-01",
    name: "Cây ổi · Một mùa trái",
    species: "Ổi",
    kind: "plant",
    price: 1200000,
    days: 180,
    description:
      "Đồng hành với một cây ổi trong một vụ, từ chăm cây đến thu hoạch.",
    benefits:
      "Chăm sóc một cây trong một vụ\nNhật ký ra hoa và nuôi trái\nTheo dõi phân bón và sâu bệnh\nNhận sản lượng thực tế của cây",
    active: 1,
  },
];
