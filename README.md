# M FARM

Nền tảng quảng bá trang trại và quản lý tài sản cây trồng, vật nuôi mà khách hàng nhận nuôi. Hệ thống gồm giao diện công khai, ứng dụng khách hàng, màn hình vận hành cho chủ trại và khu vực quản trị hệ thống.

## Chức năng chính

- Quản lý cây, con vật, ảnh ban đầu và nhật ký sinh trưởng trên điện thoại.
- Theo dõi tiêm ngừa, sức khỏe, dịch tễ, mã QR, RFID và microchip.
- Quản lý gói nuôi, khách hàng, giá bán và quyền truy cập theo vai trò.
- Gửi cập nhật định kỳ qua Customer Care Gateway và Zalo Sender v2.
- Giữ ZNS ở trạng thái chờ để tích hợp sau.

## Chạy local

Yêu cầu Node.js 22.13 trở lên. Sao chép `.env.example` thành `.env`, điền cấu hình local cần thiết rồi chạy:

```powershell
npm install
npm run dev
```

Ứng dụng mặc định mở tại `http://127.0.0.1:5173`.

## Kiểm tra

```powershell
npm run build
node scripts/regression-farm.mjs
node scripts/test-system-admin.mjs
node scripts/test-care-contract.mjs
node scripts/test-notifications.mjs
```

Xem [CUSTOMER-MESSAGING.md](CUSTOMER-MESSAGING.md) để cấu hình luồng chăm sóc khách hàng. Credentials, phiên Zalo, dữ liệu Docker và `.env` không được commit lên Git.
