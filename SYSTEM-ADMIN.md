# Quản trị hệ thống M FARM

## Vai trò
- `system_admin`: `/he-thong`, xem tài khoản đã vào ứng dụng, gán quyền chủ trại/khách hàng, khóa/mở truy cập, xem 100 bản ghi phân quyền gần nhất. Không thực hiện nghiệp vụ cây/con, đơn hàng.
- `admin`: chủ trang trại, giữ các nghiệp vụ vận hành hiện có; không gọi được API hệ thống.
- `customer`: chỉ dữ liệu thuộc tài khoản của mình, cần xác thực email và điện thoại.

## Kích hoạt thật (chưa thực hiện)
1. Áp dụng migration `drizzle/0004_colossal_apocalypse.sql` trước khi triển khai mã mới. Local đã được sao lưu tại `.wrangler/backups` và áp dụng migration.
2. Cấu hình bí mật phía máy chủ `SYSTEM_ADMIN_EMAILS` với email admin hệ thống, phân cách nhiều email bằng dấu phẩy. Để trống thì không có admin hệ thống thật. Không đặt biến này phía client.
3. Đăng nhập và xác thực email đã cấu hình, app chuyển đến `/he-thong`.
4. Tài khoản muốn được phân quyền cần có bản ghi trong app. Hiện danh sách không phải danh sách toàn bộ người dùng trong dịch vụ xác thực.

Chưa chọn email admin thật, chưa sửa cấu hình production và chưa triển khai.

## Bảo vệ
- Vai trò lấy từ máy chủ theo từng yêu cầu; không nhận quyền admin hệ thống từ form hoặc metadata đăng ký.
- Không có nút tự cấp quyền admin hệ thống. Các email admin hệ thống được quản lý ngoài UI.
- Không sửa chính tài khoản quản trị đang dùng hay tài khoản admin hệ thống khác trong UI.
- Thay đổi quyền và nhật ký thực hiện cùng giao dịch; bắt buộc lý do.
- Khóa chặn các yêu cầu tiếp theo của tài khoản; không xóa đơn/tài sản và không tương đương thu hồi token ở dịch vụ xác thực.
- Demo được tách tenant; đổi vai trò trong demo không cấp quyền trên dữ liệu thật.
- Đã sửa cờ xác thực điện thoại để không mặc định đánh dấu chủ trại đã xác thực điện thoại.

## Kiểm thử
`node scripts/test-system-admin.mjs` khi server local chạy cổng 5173: từ chối khách/chủ trại/người chưa đăng nhập; cho phép system admin; không cấp system role qua API; khóa/mở có hiệu lực; audit được ghi.
`node scripts/regression-farm.mjs`: các chức năng nhật ký và ảnh hiện có vẫn qua kiểm tra.
TypeScript và build đã qua. Đã thử đổi quyền trên giao diện demo.

## Hạn chế cần xử lý trước production
Chưa có MFA, thu hồi refresh token khi đăng xuất, quản lý thiết bị hay giao diện cấp nhiều admin hệ thống. Mô hình dữ liệu thật vẫn là một trang trại trong tenant `production`, chưa phải nền tảng nhiều trang trại độc lập. Không coi việc thêm vai trò này là hoàn tất kiểm toán bảo mật production.
