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

## Giao diện `/he-thong`
- Tổng quan: số tài khoản theo vai trò/khóa, số cây/con, đơn, gói đang mở bán, ảnh chăm sóc — đếm theo tenant hiện tại (demo chỉ thấy số liệu mẫu của phiên).
- Tài khoản: tìm theo tên/email, lọc vai trò/trạng thái, phân trang 10 dòng (phía client), hộp thoại đổi vai trò/khóa có xem trước trạng thái trước → sau và bắt buộc lý do ≥ 5 ký tự. Tài khoản của chính mình, admin hệ thống và tài khoản chưa xác thực email không có nút sửa.
- Nhật ký: 100 bản ghi gần nhất, lưu `before_state`/`after_state` chuẩn hóa `{role,suspended:boolean}` và lý do; tìm kiếm + phân trang.
- Thiết lập: chỉ trả về boolean đã/chưa khai báo (`SUPABASE_URL`+`SUPABASE_ANON_KEY`, `OWNER_EMAIL`, `SYSTEM_ADMIN_EMAILS`); không trả giá trị. Zalo ZNS: chờ tích hợp.
- API không trả số điện thoại, tenant hay email của người thực hiện; yêu cầu không thay đổi gì bị từ chối (400) và không ghi nhật ký.
- `SYSTEM_ADMIN_EMAILS` chỉ có hiệu lực ở tenant `production`; tenant demo không kế thừa.

## Kiểm thử
`node scripts/test-system-admin.mjs` khi server local chạy cổng 5173 (hoặc `MF_TEST_URL` local): từ chối khách/chủ trại/người chưa đăng nhập (đọc và ghi); cho phép system admin; số liệu tổng quan khớp dữ liệu chủ trại cùng tenant; cấu hình chỉ boolean; không cấp system role qua API; kiểm tra lý do, no-op, origin, tự sửa; khóa/mở/nâng quyền có hiệu lực; audit trước/sau được ghi; tenant demo cô lập.
`node scripts/regression-farm.mjs`: các chức năng nhật ký, ảnh, sức khỏe, vaccine, QR/chip và logout cookie hiện có vẫn qua kiểm tra.
Lưu ý: `/api/demo` giới hạn 20 yêu cầu/10 phút/IP; hai script dùng khoảng 11 lần.
Bản tích hợp giao diện/API mới đã được Codex chạy độc lập: typecheck, build, kiểm thử system admin và regression đều PASS. Chi tiết ở `CODEX-VERIFICATION.md`.

## Hạn chế cần xử lý trước production
Chưa có MFA, quản lý thiết bị hay giao diện cấp nhiều admin hệ thống. Logout phiên thật đã gọi best-effort tới Supabase GoTrue `logout?scope=local` và vẫn xóa cookie cục bộ; việc provider thực sự thu hồi refresh token còn cần kiểm tra bằng project Supabase thật. Mô hình dữ liệu thật vẫn là một trang trại trong tenant `production`, chưa phải nền tảng nhiều trang trại độc lập. Không coi việc thêm vai trò này là hoàn tất kiểm toán bảo mật production.
